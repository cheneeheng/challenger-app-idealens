import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.core.llm_models import DEFAULT_MODEL


class SessionCreate(BaseModel):
    idea: str
    name: str | None = None
    selected_model: str = DEFAULT_MODEL


class SessionUpdate(BaseModel):
    name: str | None = None
    selected_model: str | None = None


class MessageCreate(BaseModel):
    # Pure audit-trail write for user-initiated graph mutations — no LLM call.
    role: Literal["system"]
    content: str = Field(min_length=1)


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: str
    content: str
    message_index: int
    created_at: datetime


class SessionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    idea: str
    selected_model: str
    updated_at: datetime


class SessionDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    idea: str
    selected_model: str
    graph_state: dict
    context_summary: str | None
    created_at: datetime
    updated_at: datetime
    messages: list[MessageResponse]


class SessionListResponse(BaseModel):
    items: list[SessionSummary]
    total: int
    page: int
    page_size: int


class GraphStateUpdate(BaseModel):
    graph_state: dict
