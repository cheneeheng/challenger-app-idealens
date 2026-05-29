from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.user import ApiKeyUpdate, PasswordChange, UserResponse, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])

_NOT_IMPL = HTTPException(
    status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented in skeleton"
)


@router.get("/me", response_model=UserResponse)
async def get_me(user: CurrentUser) -> UserResponse:
    raise _NOT_IMPL


@router.patch("/me", response_model=UserResponse)
async def update_me(payload: UserUpdate, user: CurrentUser, db: DbSession) -> UserResponse:
    raise _NOT_IMPL


@router.patch("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(payload: PasswordChange, user: CurrentUser, db: DbSession) -> None:
    raise _NOT_IMPL


@router.put("/me/api-key", status_code=status.HTTP_204_NO_CONTENT)
async def set_api_key(payload: ApiKeyUpdate, user: CurrentUser, db: DbSession) -> None:
    raise _NOT_IMPL


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(user: CurrentUser, db: DbSession) -> None:
    raise _NOT_IMPL
