from datetime import UTC, datetime

from fastapi import APIRouter, Cookie, HTTPException, Request, Response, status
from sqlalchemy import select, update

from app.api.deps import DbSession
from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.db.models.refresh_token import RefreshToken
from app.db.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "refresh_token"


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=raw_token,
        httponly=True,
        samesite="strict",
        secure=settings.ENVIRONMENT == "production",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/auth")


async def _issue_refresh_token(db: DbSession, user_id, response: Response) -> None:
    raw_token, token_hash = auth_service.create_refresh_token()
    db.add(
        RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=auth_service.refresh_token_expiry(),
        )
    )
    _set_refresh_cookie(response, raw_token)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/15minutes")
async def register(
    payload: RegisterRequest, response: Response, db: DbSession, request: Request
) -> TokenResponse:
    existing = await db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(email=payload.email, password_hash=auth_service.hash_password(payload.password))
    db.add(user)
    await db.flush()  # populate user.id

    await _issue_refresh_token(db, user.id, response)
    await db.commit()

    return TokenResponse(access_token=auth_service.create_access_token(str(user.id)))


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/15minutes")
async def login(
    payload: LoginRequest, response: Response, db: DbSession, request: Request
) -> TokenResponse:
    user = await db.scalar(select(User).where(User.email == payload.email))
    if user is None or not auth_service.verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    # Rotate: revoke any active refresh tokens before issuing a fresh one.
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id, RefreshToken.revoked.is_(False))
        .values(revoked=True)
    )
    await _issue_refresh_token(db, user.id, response)
    await db.commit()

    return TokenResponse(access_token=auth_service.create_access_token(str(user.id)))


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    db: DbSession,
    refresh_token: str | None = Cookie(default=None),
) -> TokenResponse:
    if refresh_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token"
        )

    token_hash = auth_service.hash_refresh_token(refresh_token)
    stored = await db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    if stored is None or stored.revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )

    if stored.expires_at <= datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired refresh token"
        )

    user = await db.get(User, stored.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Rotate: revoke the presented token, issue a fresh one.
    stored.revoked = True
    await _issue_refresh_token(db, user.id, response)
    await db.commit()

    return TokenResponse(access_token=auth_service.create_access_token(str(user.id)))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    db: DbSession,
    refresh_token: str | None = Cookie(default=None),
) -> None:
    if refresh_token is not None:
        token_hash = auth_service.hash_refresh_token(refresh_token)
        stored = await db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
        if stored is not None:
            stored.revoked = True
            await db.commit()
    _clear_refresh_cookie(response)
