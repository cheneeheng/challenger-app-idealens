import uuid

from pydantic import BaseModel


class ChatRequest(BaseModel):
    session_id: uuid.UUID
    message: str
