"""Graph action types. Mirrored on the frontend in `src/lib/graphActions.ts` (Zod)."""

from typing import Literal

from pydantic import BaseModel


class AddPayload(BaseModel):
    id: str
    type: str
    label: str
    content: str
    score: float | None = None
    parent_id: str | None = None


class UpdatePayload(BaseModel):
    id: str
    label: str | None = None
    content: str | None = None
    score: float | None = None


class DeletePayload(BaseModel):
    id: str


class ConnectPayload(BaseModel):
    source: str
    target: str
    label: str | None = None
    type: str | None = None


class GraphAction(BaseModel):
    action: Literal["add", "update", "delete", "connect"]
    payload: AddPayload | UpdatePayload | DeletePayload | ConnectPayload
