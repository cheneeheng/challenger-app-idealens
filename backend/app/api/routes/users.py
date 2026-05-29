from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.db.models.user import User
from app.schemas.user import (
    ApiKeyUpdate,
    DeleteAccountRequest,
    PasswordChange,
    UserResponse,
    UserUpdate,
)
from app.services import auth_service
from app.services.encryption_service import encrypt_api_key

router = APIRouter(prefix="/api/users", tags=["users"])


def _to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        has_api_key=user.encrypted_api_key is not None,
        created_at=user.created_at,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: CurrentUser) -> UserResponse:
    return _to_response(user)


@router.patch("/me", response_model=UserResponse)
async def update_me(payload: UserUpdate, user: CurrentUser, db: DbSession) -> UserResponse:
    if payload.email is not None and payload.email != user.email:
        clash = await db.scalar(select(User).where(User.email == payload.email))
        if clash is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
            )
        user.email = payload.email
    if payload.display_name is not None:
        user.display_name = payload.display_name
    await db.commit()
    await db.refresh(user)
    return _to_response(user)


@router.patch("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(payload: PasswordChange, user: CurrentUser, db: DbSession) -> None:
    if not auth_service.verify_password(payload.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect"
        )
    user.password_hash = auth_service.hash_password(payload.new_password)
    await db.commit()


@router.put("/me/api-key", status_code=status.HTTP_204_NO_CONTENT)
async def set_api_key(payload: ApiKeyUpdate, user: CurrentUser, db: DbSession) -> None:
    if not payload.api_key.startswith("sk-ant-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Anthropic keys start with 'sk-ant-'"
        )
    user.encrypted_api_key = encrypt_api_key(payload.api_key)
    await db.commit()


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(payload: DeleteAccountRequest, user: CurrentUser, db: DbSession) -> None:
    if not auth_service.verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Password is incorrect"
        )
    await db.delete(user)
    await db.commit()
