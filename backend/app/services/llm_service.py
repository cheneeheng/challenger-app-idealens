"""Anthropic LLM integration. Scaffold stubs — wiring lands in ITER_02.

Responsibilities:
- build_messages: assemble system prompt + context + history into Anthropic message list
- stream_response: stream the model reply, separating <GRAPH_ACTIONS> from prose
- parse_graph_actions: extract and validate the JSON action block
- summarize_context: condense old messages when the window overflows
"""

from collections.abc import AsyncGenerator

from app.schemas.graph import GraphAction


def build_messages(
    idea: str,
    history: list[dict],
    context_summary: str | None,
) -> list[dict]:
    raise NotImplementedError


async def stream_response(
    api_key: str,
    model: str,
    messages: list[dict],
) -> AsyncGenerator[str, None]:
    raise NotImplementedError
    yield  # pragma: no cover - marks this as an async generator


def parse_graph_actions(raw: str) -> list[GraphAction]:
    raise NotImplementedError


async def summarize_context(
    api_key: str,
    model: str,
    messages: list[dict],
) -> str:
    raise NotImplementedError
