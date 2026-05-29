import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DbSession
from app.db.models.session import Session
from app.schemas.session import (
    GraphStateUpdate,
    SessionCreate,
    SessionDetail,
    SessionListResponse,
    SessionSummary,
    SessionUpdate,
)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def _seed_graph_state() -> dict:
    return {
        "nodes": [
            {
                "id": "root",
                "type": "concept",
                "label": "Analyzing...",
                "content": "",
                "position": {"x": 400, "y": 50},
            }
        ],
        "edges": [],
    }


async def _get_owned_session(session_id: uuid.UUID, user, db: DbSession) -> Session:
    """Load a session, returning 403 if it exists but belongs to another user.

    Returning 403 (not 404) avoids leaking the existence of other users' rows.
    """
    session = await db.get(Session, session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your session")
    return session


@router.get("", response_model=SessionListResponse)
async def list_sessions(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> SessionListResponse:
    total = await db.scalar(
        select(func.count()).select_from(Session).where(Session.user_id == user.id)
    )
    rows = await db.scalars(
        select(Session)
        .where(Session.user_id == user.id)
        .order_by(Session.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = [SessionSummary.model_validate(s) for s in rows.all()]
    return SessionListResponse(items=items, total=total or 0, page=page, page_size=page_size)


@router.post("", response_model=SessionDetail, status_code=status.HTTP_201_CREATED)
async def create_session(payload: SessionCreate, user: CurrentUser, db: DbSession) -> SessionDetail:
    name = payload.name or payload.idea[:60]
    session = Session(
        user_id=user.id,
        name=name,
        idea=payload.idea,
        selected_model=payload.selected_model,
        graph_state=_seed_graph_state(),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session, attribute_names=["messages"])
    return SessionDetail.model_validate(session)


@router.get("/{session_id}", response_model=SessionDetail)
async def get_session(session_id: uuid.UUID, user: CurrentUser, db: DbSession) -> SessionDetail:
    session = await _get_owned_session(session_id, user, db)
    await db.refresh(session, attribute_names=["messages"])
    return SessionDetail.model_validate(session)


@router.patch("/{session_id}", response_model=SessionDetail)
async def update_session(
    session_id: uuid.UUID, payload: SessionUpdate, user: CurrentUser, db: DbSession
) -> SessionDetail:
    session = await _get_owned_session(session_id, user, db)
    if payload.name is not None:
        session.name = payload.name
    if payload.selected_model is not None:
        session.selected_model = payload.selected_model
    await db.commit()
    await db.refresh(session, attribute_names=["messages"])
    return SessionDetail.model_validate(session)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    session = await _get_owned_session(session_id, user, db)
    await db.delete(session)
    await db.commit()


@router.put("/{session_id}/graph", status_code=status.HTTP_204_NO_CONTENT)
async def update_graph(
    session_id: uuid.UUID, payload: GraphStateUpdate, user: CurrentUser, db: DbSession
) -> None:
    session = await _get_owned_session(session_id, user, db)
    session.graph_state = payload.graph_state
    await db.commit()
