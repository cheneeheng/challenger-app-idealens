# challenger-app-idealens

IdeaLens lets users submit any idea and receive a structured AI analysis visualized as a live node graph. The LLM breaks ideas down across nine dimensions — concepts, gaps, flaws, feasibility, and more — while a split-view workspace shows the chat on the left and an evolving, interactive graph on the right.

Users bring their own Anthropic API key (stored encrypted at rest).

## Status

Functional. The backend foundation, analysis engine, frontend workspace, graph visualization, graph interactions, and polish/tests (iterations 01–07) are implemented. See `docs/planning/` for the build plan and `docs/manual/` for end-user guides.

## Features

- Email/password auth with JWT access tokens and refresh-token cookies.
- Bring-your-own Anthropic API key, encrypted at rest with Fernet.
- Split-view workspace: streaming chat on the left, live node graph on the right.
- LLM analysis across nine fixed dimensions (concept, requirements, gaps, benefits, drawbacks, feasibility, flaws, alternatives, open questions).
- Real-time graph mutations streamed over SSE (`add` / `update` / `delete` / `connect`), with Dagre auto-layout.
- Selectable model per session (Sonnet / Haiku / Opus); cheaper model used for context summarization.
- Graph interactions: node detail panel, context menu, manual node add/delete, and a graph-to-chat feedback loop.
- Session management with rename, pagination, and per-user data isolation.

## Tech Stack

**Backend** — Python 3.12, FastAPI, SQLAlchemy 2 (async / asyncpg), Alembic, Pydantic v2, python-jose + bcrypt, cryptography (Fernet), Anthropic SDK, structlog, slowapi. Managed with `uv`.

**Frontend** — React 19 + Vite + TypeScript, React Router v7, Zustand, Axios, `@xyflow/react` (React Flow) + dagre, zod, react-resizable-panels, sonner.

**Infra (local)** — `docker-compose.yml` runs PostgreSQL only; both app processes run on the host.

## Project Structure

```
backend/        FastAPI service (app factory, models, schemas, routes, services, alembic)
frontend/       React SPA (pages, layouts, components, Zustand stores)
docs/planning/  Skeleton + iteration plans
docker-compose.yml   PostgreSQL for local dev
```

## Prerequisites

- Python 3.12 and [`uv`](https://docs.astral.sh/uv/)
- Node.js 20+
- Docker (for the local PostgreSQL container)

## Backend

```bash
cd backend
uv venv && uv sync
cp .env.example .env          # fill in the values below
docker compose up -d          # from repo root: starts PostgreSQL
alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

API docs at http://localhost:8000/docs, liveness at http://localhost:8000/health.

### Environment variables

| Name | Description |
|------|-------------|
| `DATABASE_URL` | Async PostgreSQL DSN (`postgresql+asyncpg://...`) |
| `JWT_SECRET` | Secret for signing access tokens |
| `API_KEY_ENCRYPTION_KEY` | Fernet key for encrypting Anthropic keys at rest |
| `ENVIRONMENT` | `development` or `production`; `production` enables the `Secure` flag on the refresh-token cookie |
| `FRONTEND_URLS` | Comma-separated allowed CORS origins |
| `CONTEXT_WINDOW_MAX_MESSAGES` | Recent messages kept verbatim before summarization (default `20`) |

Generate a Fernet key:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## Frontend

```bash
cd frontend
bun install
cp .env.example .env.local    # VITE_API_URL=http://localhost:8000
bun run dev                    # http://localhost:3000
```

## Tests

```bash
cd backend && uv run pytest      # backend (pytest + httpx)
cd frontend && bun run test      # frontend unit tests (vitest)
cd frontend && bun run test:e2e  # frontend end-to-end (Playwright)
```

## Documentation

- `docs/manual/` — end-user guides (getting started, workspace, graph, account, FAQ).
- `docs/planning/` — `SKELETON.md` plus `ITER_NN.md` build plan.
- API reference: http://localhost:8000/docs (OpenAPI) when the backend is running.
