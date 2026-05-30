# challenger-app-idealens

IdeaLens lets users submit any idea and receive a structured AI analysis visualized as a live node graph. The LLM breaks ideas down across nine dimensions — concepts, gaps, flaws, feasibility, and more — while a split-view workspace shows the chat on the left and an evolving, interactive graph on the right.

Users bring their own Anthropic API key (stored encrypted at rest).

> This README is for people working in the codebase. If you just want to *use* IdeaLens, read the [user manual](docs/manual/README.md). If you want to *run or host* it, read the [deployment guide](docs/manual/deployment.md).

## Status

Functional. The backend foundation, analysis engine, frontend workspace, graph visualization, graph interactions, and polish/tests (iterations 01–07) are implemented. See `docs/planning/` for the build plan.

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
docs/manual/    End-user + operator guides (usage, deployment, testing)
docs/planning/  Skeleton + iteration build plan
docker-compose.yml   PostgreSQL for local dev
```

Architecture notes — the graph-action contract, backend layering, frontend route gating, and the per-user LLM flow — live in [`CLAUDE.md`](CLAUDE.md).

## Setup & running

The full local + production setup (prerequisites, every environment variable, migrations, reverse-proxy/SSE notes) is documented once in the [deployment guide](docs/manual/deployment.md). The short version, from the repo root:

```bash
docker compose up -d                                           # PostgreSQL
cd backend && uv venv && uv sync && cp .env.example .env        # fill in the values
alembic upgrade head && uv run uvicorn app.main:app --reload --port 8000
cd ../frontend && bun install && cp .env.example .env.local && bun run dev
```

Backend on http://localhost:8000 (docs at `/docs`, liveness at `/health`); frontend on http://localhost:3000.

## Tests

```bash
scripts/run-tests.sh        # backend + frontend unit suites (from repo root)
```

The end-to-end suite is skipped unless a real Anthropic key is provided. See the [testing guide](docs/manual/testing.md) for the test-database setup, the per-suite commands, and how to run the e2e flow.

## Documentation

- [`docs/manual/`](docs/manual/README.md) — usage, [deployment](docs/manual/deployment.md), and [testing](docs/manual/testing.md) guides.
- `docs/planning/` — `SKELETON.md` plus the `ITER_NN.md` build plan.
- API reference: http://localhost:8000/docs (OpenAPI) when the backend is running.
