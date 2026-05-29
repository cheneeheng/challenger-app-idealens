import uuid

from pydantic import BaseModel, Field, field_validator

from app.core.llm_models import ALLOWED_MODEL_IDS


class ChatRequest(BaseModel):
    session_id: uuid.UUID
    message: str = Field(min_length=1, max_length=4000)
    model: str  # validated against the allowlist
    graph_state: dict  # current graph snapshot from the frontend

    @field_validator("model")
    @classmethod
    def model_must_be_allowed(cls, v: str) -> str:
        if v not in ALLOWED_MODEL_IDS:
            raise ValueError("model not in allowlist")
        return v

    @field_validator("graph_state")
    @classmethod
    def graph_size_guard(cls, v: dict) -> dict:
        if len(v.get("nodes", [])) > 200:
            raise ValueError("graph exceeds 200 nodes")
        if len(v.get("edges", [])) > 400:
            raise ValueError("graph exceeds 400 edges")
        return v
