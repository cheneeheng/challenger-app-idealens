import uuid

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.session import (
    GraphStateUpdate,
    SessionCreate,
    SessionDetail,
    SessionListResponse,
    SessionUpdate,
)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

_NOT_IMPL = HTTPException(
    status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented in skeleton"
)


@router.get("", response_model=SessionListResponse)
async def list_sessions(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> SessionListResponse:
    raise _NOT_IMPL


@router.post("", response_model=SessionDetail, status_code=status.HTTP_201_CREATED)
async def create_session(payload: SessionCreate, user: CurrentUser, db: DbSession) -> SessionDetail:
    raise _NOT_IMPL


@router.get("/{session_id}", response_model=SessionDetail)
async def get_session(session_id: uuid.UUID, user: CurrentUser, db: DbSession) -> SessionDetail:
    raise _NOT_IMPL


@router.patch("/{session_id}", response_model=SessionDetail)
async def update_session(
    session_id: uuid.UUID, payload: SessionUpdate, user: CurrentUser, db: DbSession
) -> SessionDetail:
    raise _NOT_IMPL


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    raise _NOT_IMPL


@router.put("/{session_id}/graph", status_code=status.HTTP_204_NO_CONTENT)
async def update_graph(
    session_id: uuid.UUID, payload: GraphStateUpdate, user: CurrentUser, db: DbSession
) -> None:
    raise _NOT_IMPL
