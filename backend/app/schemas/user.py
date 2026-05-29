import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    display_name: str | None = None
    has_api_key: bool
    created_at: datetime


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    display_name: str | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class ApiKeyUpdate(BaseModel):
    api_key: str


class DeleteAccountRequest(BaseModel):
    password: str
