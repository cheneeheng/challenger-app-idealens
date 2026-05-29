# Deployment & Running the App

This guide is for whoever **runs or hosts** an IdeaLens instance — not for end users. If you
just want to *use* IdeaLens, start with [Getting Started](getting-started.md).

IdeaLens is two processes plus a database:

- **Backend** — a FastAPI service (Python 3.12, served by Uvicorn) on port `8000`.
- **Frontend** — a React + Vite single-page app served on port `3000` in dev, or as a static
  bundle in production.
- **Database** — PostgreSQL 16. Locally this runs in Docker; in production it is a managed
  PostgreSQL instance.

The frontend talks to the backend over HTTP/SSE; the backend talks to PostgreSQL and, per
request, to the Anthropic API using each user's own key.

## Prerequisites

- Python 3.12 and [`uv`](https://docs.astral.sh/uv/)
- Node.js 20+ (the frontend uses [`bun`](https://bun.sh/) for install/scripts)
- Docker (for the local PostgreSQL container)

## Quick start (local)

Run these from the repository root unless noted.

### 1. Start PostgreSQL

```bash
docker compose up -d
```

This starts PostgreSQL 16 with database `idealens`, user `idealens`, password `idealens`, on
port `5432` (see `docker-compose.yml`). Data persists in the `pgdata` Docker volume across
restarts.

### 2. Start the backend

```bash
cd backend
uv venv && uv sync                 # create venv + install dependencies
cp .env.example .env               # then fill in the values (see below)
alembic upgrade head               # create / migrate the schema
uv run uvicorn app.main:app --reload --port 8000
```

The backend is up when http://localhost:8000/health returns `{"status": "ok"}`. Interactive
API docs are at http://localhost:8000/docs.

### 3. Start the frontend

```bash
cd frontend
bun install
cp .env.example .env.local         # VITE_API_URL=http://localhost:8000
bun run dev                        # serves http://localhost:3000
```

Open http://localhost:3000, register an account, add your Anthropic API key in **Settings**,
and you're ready — see [Getting Started](getting-started.md).

## Environment variables

IdeaLens is configured entirely through environment variables. The backend reads them from
`backend/.env` (loaded by pydantic-settings); the frontend reads `VITE_*` variables from
`frontend/.env.local` and **bakes them into the bundle at build time**.

### Backend (`backend/.env`)

| Name | Required | Default | What it is for |
|------|----------|---------|----------------|
| `DATABASE_URL` | yes | — | Async PostgreSQL connection string, using the **asyncpg** driver: `postgresql+asyncpg://user:password@host:port/dbname`. The `+asyncpg` part is mandatory — a plain `postgresql://` URL will fail because the app uses async SQLAlchemy. Managed Postgres usually needs SSL appended, e.g. `?sslmode=require`. |
| `JWT_SECRET` | yes | — | Secret key used to **sign and verify JWT access tokens**. Anyone who knows this value can forge a valid login, so treat it as a credential. Use a long random string; generate one with `openssl rand -hex 32`. Changing it invalidates all existing access tokens (everyone is effectively logged out). |
| `API_KEY_ENCRYPTION_KEY` | yes | — | **Fernet key** used to encrypt each user's Anthropic API key before it is written to the database, and to decrypt it for each LLM call. Must be a valid Fernet key (44-character base64). **If you lose or change this key, every stored API key becomes unrecoverable** and users must re-enter theirs. Generate with: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`. |
| `ENVIRONMENT` | no | `development` | `development` or `production`. Affects environment-sensitive behavior such as cookie security. Set to `production` for any deployed instance. |
| `FRONTEND_URLS` | no | `http://localhost:3000` | Comma-separated list of origins allowed by **CORS**. The browser app's URL(s) must appear here or requests from the frontend are blocked. In production this is your deployed frontend URL, e.g. `https://idealens.example.com`. No trailing slash. |
| `CONTEXT_WINDOW_MAX_MESSAGES` | no | `20` | How many of the most recent messages are sent to the LLM **verbatim** before older context is summarized. Higher means more context per call (more tokens, higher cost); lower means more aggressive summarization. |
| `JWT_ALGORITHM` | no | `HS256` | Signing algorithm for JWTs. Rarely changed. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | no | `15` | Lifetime of an access token. After this, the frontend silently refreshes using the refresh-token cookie. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | no | `30` | Lifetime of the refresh-token cookie — effectively how long a user stays signed in without re-entering their password. |

The first three (`DATABASE_URL`, `JWT_SECRET`, `API_KEY_ENCRYPTION_KEY`) have no defaults and
the backend will not start without them.

### Frontend (`frontend/.env.local`)

| Name | Required | Default | What it is for |
|------|----------|---------|----------------|
| `VITE_API_URL` | no | `http://localhost:8000` | Base URL the SPA uses for all backend calls. In production, set it to your public backend URL, e.g. `https://api.idealens.example.com`. **Baked in at build time** — if it changes you must rebuild and redeploy the frontend. |

## Database migrations

The schema is managed by Alembic. Apply all migrations with:

```bash
cd backend
alembic upgrade head
```

Run this on first setup and after pulling any change that adds a migration. When you change a
model, generate a migration with `alembic revision --autogenerate -m "msg"` (all models must be
imported in `backend/app/db/models/__init__.py` for autogenerate to see them).

## Running in production

The development commands above use `--reload` (backend) and the Vite dev server (frontend),
which are not for production. For a production instance:

### Backend

Run Uvicorn without reload and with multiple workers, bound to all interfaces:

```bash
cd backend
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
```

Set `ENVIRONMENT=production` and point `DATABASE_URL` at your managed PostgreSQL. Run
`alembic upgrade head` against the production database before serving traffic.

### Frontend

The frontend is a static bundle — no Node server is needed at runtime:

```bash
cd frontend
VITE_API_URL=https://api.idealens.example.com bun run build   # outputs dist/
```

Serve the contents of `dist/` from any static host or CDN. Remember `VITE_API_URL` is baked in
at build time, so rebuild if the backend URL changes.

### Reverse proxy and SSE

Chat replies stream over **Server-Sent Events** from `POST /api/chat`. If you put a reverse
proxy (Nginx, a load balancer) in front of the backend, it **must not buffer** that response,
or tokens arrive in batches instead of in real time. For Nginx:

```nginx
location /api/chat {
    proxy_pass         http://localhost:8000;
    proxy_buffering    off;
    proxy_read_timeout 120s;
    proxy_set_header   X-Accel-Buffering no;
}
```

Load balancers need a generous idle timeout (e.g. 300s) for the same reason.

### Cross-origin cookies

The refresh token is an httpOnly cookie (`backend/app/api/routes/auth.py`). As shipped it is
set with `SameSite=Strict`, `Secure` only when `ENVIRONMENT=production`, and `Path=/auth`.

`SameSite=Strict` means the cookie is **only sent on same-site requests**, so a deployment that
puts the frontend and backend on **different domains** will not send it — the silent
token-refresh flow breaks. For a same-domain deployment (frontend and backend behind one host /
reverse proxy), this is fine and is the recommended setup.

If you must split domains, the cookie attributes have to change in code: a cross-site fetch
requires `SameSite=None; Secure` (which mandates HTTPS on both). `docs/planning/DEPLOYMENT.md`
(Option B, "Cross-Origin Cookie Fix") discusses this for the Railway + Vercel path.

## Cloud deployment options

Two worked end-to-end deployment recipes — AWS (EC2 + S3/CloudFront + RDS) and the cheaper
Railway + Neon + Vercel path — live in [`docs/planning/DEPLOYMENT.md`](../planning/DEPLOYMENT.md),
including Terraform layout, Dockerfile, CI/CD, and required secrets. That document is the
reference for production hosting beyond a single host.

## Verifying a deployment

1. `GET /health` on the backend returns `{"status": "ok"}`.
2. `GET /docs` on the backend serves the OpenAPI UI.
3. The frontend loads and you can register, sign in, and reach **Settings**.
4. After adding an Anthropic key in Settings, a new analysis streams a reply and populates the
   graph (see [Getting Started](getting-started.md)).

If something doesn't work, the [FAQ & Troubleshooting](faq.md) covers common end-user symptoms;
for backend errors, check the service logs and confirm the required environment variables are
set.
