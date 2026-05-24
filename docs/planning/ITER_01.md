---
artifact: ITER_01
status: ready
created: 2026-05-23
scope: Backend foundation — project setup, database models, migrations, auth endpoints, user settings endpoints, session CRUD
sections_changed: [03, 04]
sections_unchanged: [01, 02, 05, 06]
---

# ITER_01 — Backend Foundation

## §01 · Concept
> Unchanged — see SKELETON.md §01

## §02 · Architecture
> Unchanged — see SKELETON.md §02

---

## §03 · Tech Stack

New dependencies for this iteration (add to `pyproject.toml` via `uv add`):

| Package | Purpose |
|---|---|
| `fastapi` | API framework |
| `uvicorn[standard]` | ASGI server |
| `sqlalchemy[asyncio]` | ORM |
| `asyncpg` | async PostgreSQL driver |
| `alembic` | migrations |
| `pydantic-settings` | typed config from env |
| `python-jose[cryptography]` | JWT |
| `bcrypt` | password hashing |
| `cryptography` | Fernet API key encryption |
| `structlog` | structured logging |
| `slowapi` | rate limiting (wired to app now; limits applied in ITER_07) |
| `pytest`, `pytest-asyncio`, `httpx` | testing |

---

## §04 · Backend

### 1. Project Setup

Initialize with `uv`:
```bash
uv init backend
cd backend
uv venv
uv add fastapi uvicorn[standard] sqlalchemy[asyncio] asyncpg alembic \
       pydantic-settings python-jose[cryptography] bcrypt cryptography \
       structlog slowapi
uv add --dev pytest pytest-asyncio httpx
```

`pyproject.toml` tool config:
```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.ruff]
line-length = 100
```

### 2. Config (`app/core/config.py`)

Use `pydantic-settings`. The `Settings` class reads all env vars. Expose via `get_settings()` with `@lru_cache`.

Key fields:
```python
class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    api_key_encryption_key: str
    environment: str = "development"
    frontend_urls: list[str] = []
    context_window_max_messages: int = 20
```

> **Gotcha — cached config breaks tests:** `get_settings()` uses `@lru_cache`. Test fixtures that need to override env vars must call `get_settings.cache_clear()` before each test, or override the cached instance directly. Wire this in `tests/conftest.py`.

### 3. App Factory (`app/main.py`)

`create_app()` returns a FastAPI instance. Middleware registration order matters — register in this sequence so the outermost layer is applied last:

```python
app.add_middleware(SecurityHeadersMiddleware)  # innermost
app.add_middleware(CORSMiddleware, ...)        # outermost
```

> **Gotcha — middleware order:** FastAPI/Starlette applies middleware in reverse registration order (last registered = first to process the request). CORS must be outermost so preflight OPTIONS requests are handled before any auth check runs. Register SecurityHeaders first so it wraps everything.

Include routers with prefixes: `/auth`, `/api/users`, `/api/sessions`, `/api/chat`, `/api/models`.

Add `GET /health` returning `{"status": "ok"}`.

### 4. Database Models

`app/db/models/base.py` — `Base = DeclarativeBase()` with a `TimestampMixin` (created_at, updated_at with `onupdate=func.now()`).

Four models. Key points:

**User**
```python
id: Mapped[uuid] = mapped_column(primary_key=True, default=uuid4)
email: Mapped[str] = mapped_column(unique=True, index=True)
display_name: Mapped[str | None]
password_hash: Mapped[str]
encrypted_api_key: Mapped[str | None]
```

**RefreshToken**
```python
id: Mapped[uuid]
user_id: Mapped[uuid] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
token_hash: Mapped[str] = mapped_column(unique=True)
expires_at: Mapped[datetime]
revoked: Mapped[bool] = mapped_column(default=False)
```

**Session**
```python
id: Mapped[uuid]
user_id: Mapped[uuid] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
name: Mapped[str]
idea: Mapped[str]
selected_model: Mapped[str] = mapped_column(default="claude-sonnet-4-6")
graph_state: Mapped[dict] = mapped_column(JSONB, default=dict)
context_summary: Mapped[str | None]
```

**Message**
```python
id: Mapped[uuid]
session_id: Mapped[uuid] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"))
role: Mapped[str]           # "user" | "assistant" | "system"
content: Mapped[str]
message_index: Mapped[int]
```

`app/db/models/__init__.py` must import all four models explicitly — Alembic only discovers what has been imported.

### 5. Alembic Setup

```bash
alembic init alembic
```

Configure `alembic/env.py` for async:
- Import `Base` from `app.db.models`
- Use `run_async_migrations()` with `AsyncEngine` and `NullPool` (NullPool prevents connection reuse across migration steps)
- `target_metadata = Base.metadata`

```bash
alembic revision --autogenerate -m "initial"
alembic upgrade head
```

### 6. Auth Routes (`app/api/routes/auth.py`)

**POST /auth/register**
- Validate email not already taken (409 if duplicate)
- Hash password with bcrypt
- Create User + RefreshToken in one transaction
- Set refresh token as httpOnly cookie; return access token in body

**POST /auth/login**
- Verify email + bcrypt password
- Rotate: create new RefreshToken, revoke old one if exists
- Same cookie + body response as register

**POST /auth/refresh**
- Read refresh token from httpOnly cookie
- Verify not expired, not revoked; load user (404 if deleted)
- Revoke old token, issue new one (rotation)
- Return new access token in body

**POST /auth/logout**
- Revoke current refresh token from cookie
- Clear cookie

> **Gotcha — refresh cookie parameters:** Set the cookie with identical parameters (`httponly=True`, `samesite="strict"`, `secure=True in production`) in both register AND login. Mismatched parameters create two separate browser cookies, causing one to never be sent.

`app/api/deps.py` — `get_current_user` dependency: decode Bearer token from `Authorization` header, load user from DB, raise 401 if invalid/expired.

### 7. User Routes (`app/api/routes/users.py`)

All routes require `get_current_user`.

**GET /api/users/me** — return `UserResponse` including a computed `has_api_key: bool` field (True if `encrypted_api_key` is not null). Frontend uses this field to show/hide the API key setup banner; never return the decrypted key.

**PATCH /api/users/me** — update email (check uniqueness) or display name

**PATCH /api/users/me/password** — verify current password, hash new one

**PUT /api/users/me/api-key** — validate key starts with `sk-ant-`, encrypt with Fernet, store

**DELETE /api/users/me** — require password confirmation; delete user (cascade handles all related rows)

### 8. Session Routes (`app/api/routes/sessions.py`)

All routes require `get_current_user`. All routes return 403 (not 404) when the session exists but belongs to a different user.

> **Gotcha — 403 not 404:** Returning 404 when a resource belongs to another user leaks its existence. Always return 403 for ownership failures.

**GET /api/sessions** — paginated (`page`, `page_size=20`), ordered by `updated_at desc`

**POST /api/sessions** — create session; `name` defaults to first 60 chars of `idea`; seed `graph_state` with a root node `{"id": "root", "type": "concept", "label": "Analyzing...", "content": "", "position": {"x": 400, "y": 50}}`

**GET /api/sessions/:id** — return session + messages (ordered by `message_index`) + `graph_state`

**PATCH /api/sessions/:id** — update `name` or `selected_model`

**DELETE /api/sessions/:id** — delete (cascade handles messages)

**PUT /api/sessions/:id/graph** — replace `graph_state` JSONB entirely

### 9. Models Endpoint (`app/api/routes/models.py`)

**GET /api/models** — public, no auth. Returns hardcoded list:
```json
[
  {"id": "claude-sonnet-4-6", "label": "Claude Sonnet 4.6", "default": true},
  {"id": "claude-haiku-4-5-20251001", "label": "Claude Haiku 4.5"},
  {"id": "claude-opus-4-6", "label": "Claude Opus 4.6"}
]
```

### 10. Encryption Service (`app/services/encryption_service.py`)

Wrap `cryptography.fernet.Fernet`. Two functions: `encrypt(plaintext: str) -> str` and `decrypt(ciphertext: str) -> str`. The key is read from settings. Never log the plaintext key or decrypted value.

### 11. Auth Service (`app/services/auth_service.py`)

- `hash_password(plain: str) -> str` — bcrypt
- `verify_password(plain: str, hashed: str) -> bool` — bcrypt
- `create_access_token(user_id: str) -> str` — JWT with `exp`
- `decode_access_token(token: str) -> dict` — raises 401 on invalid/expired

### 12. Tests

`tests/conftest.py`:
- Create a per-test async engine with `NullPool` pointed at a test DB
- Use SAVEPOINT isolation: each test wraps in a nested transaction rolled back on teardown
- Override `get_db` dependency with the test session
- `get_settings.cache_clear()` before each test

Write tests for:
- `test_auth.py` — register, login, refresh, logout, expired token, wrong password, deleted user token
- `test_users.py` — all user routes, ownership checks, API key validation, wrong password on delete
- `test_sessions.py` — CRUD, 403 ownership, pagination, graph update

---

## §05 · Frontend
> Unchanged — see SKELETON.md §05

## §06 · LLM / Prompts
> Unchanged — see SKELETON.md §06
