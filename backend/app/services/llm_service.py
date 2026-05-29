"""Anthropic LLM integration.

Responsibilities:
- build_messages: assemble context summary + history + new message into the
  Anthropic messages array (user/assistant roles only)
- stream_with_heartbeat: stream model tokens composed with periodic keep-alive
  pings over a shared queue
- parse_llm_response: extract and validate the <GRAPH_ACTIONS> block
- summarize_messages: condense old messages when the window overflows (haiku)
- persist_messages: store the user + assistant messages in one transaction
"""

import asyncio
import json
import re
from collections.abc import AsyncGenerator

import structlog
from anthropic import AsyncAnthropic, AuthenticationError, RateLimitError
from pydantic import TypeAdapter, ValidationError
from sqlalchemy import func, select

from app.core.config import get_settings
from app.core.llm_models import SUMMARY_MODEL
from app.db.models.message import Message
from app.prompts.analysis_system import SYSTEM_PROMPT
from app.schemas.graph import GraphAction

logger = structlog.get_logger()

_graph_action_adapter: TypeAdapter = TypeAdapter(GraphAction)
_GRAPH_ACTIONS_RE = re.compile(r"<GRAPH_ACTIONS>\s*(.*?)\s*</GRAPH_ACTIONS>", re.DOTALL)


def make_client(api_key: str) -> AsyncAnthropic:
    return AsyncAnthropic(api_key=api_key)


def user_message_for_error(exc: Exception) -> str:
    """Map an Anthropic SDK error to a user-facing message."""
    status_code = getattr(exc, "status_code", None)
    if isinstance(exc, AuthenticationError) or status_code == 401:
        return "Invalid API key. Check your key in Settings."
    if isinstance(exc, RateLimitError) or status_code == 429:
        return "Rate limit reached. Wait a moment and try again."
    if status_code == 529:
        return "Anthropic is overloaded right now. Try again in a few seconds."
    return "An error occurred. Please try again."


def build_messages(session, new_user_message: str) -> list[dict]:
    """Build the Anthropic messages array.

    Injects the context summary first (if any), then the last N stored messages
    converted to user/assistant roles, then the new user message.
    """
    settings = get_settings()
    messages: list[dict] = []

    if session.context_summary:
        messages.append({"role": "user", "content": f"[Context]: {session.context_summary}"})

    recent = list(session.messages)[-settings.CONTEXT_WINDOW_MAX_MESSAGES:]
    for m in recent:
        if m.role == "system":
            # Anthropic's messages array only accepts user/assistant roles.
            messages.append({"role": "user", "content": f"[System]: {m.content}"})
        else:
            messages.append({"role": m.role, "content": m.content})

    messages.append({"role": "user", "content": new_user_message})
    return messages


async def stream_with_heartbeat(
    client: AsyncAnthropic,
    messages: list[dict],
    model: str,
    system_prompt: str = SYSTEM_PROMPT,
) -> AsyncGenerator[tuple[str, str], None]:
    """Yield ``(kind, value)`` tuples where kind is "token", "ping", or "error".

    A shared queue composes the LLM token stream with periodic keep-alive pings
    so neither producer starves the consumer.
    """
    queue: asyncio.Queue[tuple[str, str] | None] = asyncio.Queue()

    async def producer() -> None:
        try:
            async with client.messages.stream(
                model=model,
                max_tokens=4096,
                system=system_prompt,
                messages=messages,
            ) as stream:
                async for text in stream.text_stream:
                    await queue.put(("token", text))
        except Exception as exc:  # surfaced to the caller as an error event
            await queue.put(("error", user_message_for_error(exc)))
        await queue.put(None)

    async def pinger() -> None:
        while True:
            await asyncio.sleep(15)
            await queue.put(("ping", ""))

    producer_task = asyncio.create_task(producer())
    pinger_task = asyncio.create_task(pinger())
    try:
        while True:
            item = await queue.get()
            if item is None:
                break
            yield item
    finally:
        pinger_task.cancel()
        if not producer_task.done():
            producer_task.cancel()


def parse_llm_response(full_text: str) -> tuple[list, str]:
    """Extract the <GRAPH_ACTIONS> block, validate each action, and return
    ``(validated_actions, remaining_prose)``. Invalid actions are logged and
    skipped rather than crashing the stream."""
    match = _GRAPH_ACTIONS_RE.search(full_text)
    if match is None:
        return [], full_text.strip()

    remaining = (full_text[: match.start()] + full_text[match.end():]).strip()

    try:
        raw_items = json.loads(match.group(1))
    except json.JSONDecodeError:
        logger.warning("graph_actions_json_invalid")
        return [], remaining

    actions: list = []
    if isinstance(raw_items, list):
        for raw in raw_items:
            try:
                actions.append(_graph_action_adapter.validate_python(raw))
            except ValidationError:
                logger.warning("graph_action_invalid", raw=raw)
    return actions, remaining


async def summarize_messages(
    messages: list[Message],
    client: AsyncAnthropic,
    model: str = SUMMARY_MODEL,
) -> str:
    """Compress older messages into a concise summary. Always uses Haiku."""
    transcript = "\n".join(f"{m.role}: {m.content}" for m in messages)
    resp = await client.messages.create(
        model=model,
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": (
                    "Compress the following conversation into a concise summary "
                    "that preserves key decisions, findings, and graph changes:\n\n"
                    f"{transcript}"
                ),
            }
        ],
    )
    return "".join(
        block.text for block in resp.content if getattr(block, "type", None) == "text"
    )


async def persist_messages(
    session_id, user_msg: str, assistant_msg: str, db, assistant_id=None
) -> None:
    """Insert the user and assistant messages with sequential indices in one
    transaction. ``assistant_id`` lets the caller pin the assistant message's
    PK to the SSE event id for reconnection replay.

    Known limitation: ``MAX(message_index) + 1`` without a row lock can collide
    under concurrent requests. Acceptable for V1 single-user sessions.
    """
    max_index = await db.scalar(
        select(func.coalesce(func.max(Message.message_index), -1)).where(
            Message.session_id == session_id
        )
    )
    base = max_index if max_index is not None else -1
    db.add(Message(session_id=session_id, role="user", content=user_msg, message_index=base + 1))
    assistant = Message(
        session_id=session_id,
        role="assistant",
        content=assistant_msg,
        message_index=base + 2,
    )
    if assistant_id is not None:
        assistant.id = assistant_id
    db.add(assistant)
    await db.commit()
