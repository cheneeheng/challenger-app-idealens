from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.chat import ChatRequest

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("")
async def chat(payload: ChatRequest, user: CurrentUser, db: DbSession):
    """SSE stream of the LLM response plus graph_action events.

    Scaffold stub — streaming lands in ITER_02.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented in skeleton"
    )
