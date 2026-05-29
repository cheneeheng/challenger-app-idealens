"""Graph action types. Mirrored on the frontend in `src/lib/graphActions.ts` (Zod).

These are the canonical action shapes the LLM may emit. Parse individual action
dicts with ``TypeAdapter(GraphAction).validate_python(raw)`` — Pydantic reads the
``action`` field first and routes to the matching model, so a malformed payload
under the wrong action type raises ``ValidationError`` cleanly.
"""

from __future__ import annotations

from enum import Enum
from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field


class DimensionType(str, Enum):
    concept = "concept"
    requirement = "requirement"
    gap = "gap"
    benefit = "benefit"
    drawback = "drawback"
    feasibility = "feasibility"
    flaw = "flaw"
    alternative = "alternative"
    question = "question"


class NodePayload(BaseModel):
    id: str
    type: DimensionType
    label: str = Field(max_length=60)
    content: str
    score: float | None = Field(None, ge=0.0, le=10.0)  # feasibility only
    parent_id: str | None = None


class UpdatePayload(BaseModel):
    id: str
    label: str | None = None
    content: str | None = None
    # score is intentionally excluded — manual score edits persist via the
    # graph_state JSONB snapshot (saveGraph), not through action payloads.


class DeletePayload(BaseModel):
    id: str


class ConnectPayload(BaseModel):
    source: str
    target: str
    label: str
    type: str


class AddAction(BaseModel):
    action: Literal["add"]
    payload: NodePayload


class UpdateAction(BaseModel):
    action: Literal["update"]
    payload: UpdatePayload


class DeleteAction(BaseModel):
    action: Literal["delete"]
    payload: DeletePayload


class ConnectAction(BaseModel):
    action: Literal["connect"]
    payload: ConnectPayload


# Annotated discriminated union — Pydantic selects the model by the `action` field
# before validating the payload.
GraphAction = Annotated[
    Union[AddAction, UpdateAction, DeleteAction, ConnectAction],
    Field(discriminator="action"),
]
