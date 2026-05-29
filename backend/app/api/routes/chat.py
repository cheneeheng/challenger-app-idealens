import json
import uuid

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from app.api.deps import CurrentUser, DbSession
from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.core.llm_models import SUMMARY_MODEL
from app.db.models.message import Message
from app.db.models.session import Session
from app.schemas.chat import ChatRequest
from app.services import llm_service
from app.services.encryption_service import decrypt_api_key

router = APIRouter(prefix="/api/chat", tags=["chat"])

SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",  # disable nginx proxy buffering
    "Connection": "keep-alive",
}


def _sse(event: str, data: dict, event_id: str | None = None) -> str:
    prefix = f"id: {event_id}\n" if event_id else ""
    return f"{prefix}event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post("")
@limiter.limit("30/minute")
async def chat(payload: ChatRequest, user: CurrentUser, db: DbSession, request: Request):
    """SSE stream of LLM tokens plus graph_action events.

    Emits `token`, `graph_action`, `ping`, `error`, and `done` events.
    """
    session = await db.get(Session, payload.session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your session")
    await db.refresh(session, attribute_names=["messages"])

    last_event_id = request.headers.get("Last-Event-ID")
    has_api_key = user.encrypted_api_key is not None
    api_key = decrypt_api_key(user.encrypted_api_key) if has_api_key else None

    settings = get_settings()

    async def event_stream():
        # Reconnection replay: if the client presents a Last-Event-ID matching a
        # persisted assistant message, replay its content and finish.
        if last_event_id:
            try:
                replay = await db.get(Message, uuid.UUID(last_event_id))
            except ValueError:
                replay = None
            if replay is not None and replay.role == "assistant":
                yield _sse("token", {"text": replay.content}, last_event_id)
                yield _sse("done", {}, last_event_id)
                return

        if not has_api_key:
            yield _sse("error", {"message": "Invalid API key. Check your key in Settings."})
            yield _sse("done", {})
            return

        client = llm_service.make_client(api_key)
        message_id = str(uuid.uuid4())

        # Summarize older messages once the window overflows.
        if len(session.messages) > settings.CONTEXT_WINDOW_MAX_MESSAGES:
            try:
                summary = await llm_service.summarize_messages(
                    session.messages, client, model=SUMMARY_MODEL
                )
                session.context_summary = summary
                await db.commit()
            except Exception:  # summarization failure must not abort the chat
                await db.rollback()

        messages = llm_service.build_messages(session, payload.message)

        full_text = ""
        errored = False
        async for kind, value in llm_service.stream_with_heartbeat(
            client, messages, payload.model
        ):
            if kind == "token":
                full_text += value
                yield _sse("token", {"text": value}, message_id)
            elif kind == "ping":
                yield _sse("ping", {})
            elif kind == "error":
                errored = True
                yield _sse("error", {"message": value})

        if errored:
            yield _sse("done", {}, message_id)
            return

        actions, _prose = llm_service.parse_llm_response(full_text)
        for action in actions:
            yield _sse("graph_action", action.model_dump(mode="json"), message_id)

        yield _sse("done", {}, message_id)

        # Persist after the response is delivered. The assistant message PK is
        # pinned to the SSE event id so reconnection replay can find it.
        await llm_service.persist_messages(
            session.id, payload.message, full_text, db, assistant_id=uuid.UUID(message_id)
        )

    return StreamingResponse(
        event_stream(), media_type="text/event-stream", headers=SSE_HEADERS
    )
