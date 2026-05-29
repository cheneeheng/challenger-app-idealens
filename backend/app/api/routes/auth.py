from fastapi import APIRouter, HTTPException, Response, status

from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])

_NOT_IMPL = HTTPException(
    status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented in skeleton"
)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, response: Response) -> TokenResponse:
    raise _NOT_IMPL


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, response: Response) -> TokenResponse:
    raise _NOT_IMPL


@router.post("/refresh", response_model=TokenResponse)
async def refresh(response: Response) -> TokenResponse:
    raise _NOT_IMPL


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    raise _NOT_IMPL
