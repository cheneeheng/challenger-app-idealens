# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

IdeaLens — a split-view web app. User submits an idea; an LLM analyzes it across nine fixed dimensions and emits graph-mutation actions that build/update an interactive node graph in real time. Users bring their own Anthropic API key (encrypted at rest with Fernet).

This repo is **plan-driven**. `docs/planning/SKELETON.md` defines the scaffold; `ITER_NN.md` files layer in real logic. Most route handlers and the LLM service are currently **stubs that raise `501`** — fill them per the relevant ITER, not ad hoc. When implementing, resolve a section's authoritative spec via the most recent `ITER_NN.md` whose `sections_changed` includes it, else fall back to `SKELETON.md`. `SVELTE_REFERENCE.md` and `DEPLOYMENT.md` are reference-only — React is the active frontend; deployment is out of the build path.

## Commands

Backend (from `backend/`, managed with `uv`):
```bash
uv venv && uv sync                                   # install
docker compose up -d                                 # PostgreSQL (run from repo root)
alembic upgrade head                                 # migrate
uv run uvicorn app.main:app --reload --port 8000     # serve (docs at /docs)
uv run pytest                                         # all backend tests
uv run pytest tests/test_health.py::test_health      # single test
alembic revision --autogenerate -m "msg"             # new migration
```

Frontend (from `frontend/`):
```bash
npm install
npm run dev            # :3000
npm run build          # tsc -b && vite build (type-check gate)
npm test               # vitest
npm test -- <pattern>  # single test file/pattern
```

## Architecture

**The graph-action contract is the spine of the app.** An LLM reply contains a `<GRAPH_ACTIONS>` JSON block (actions: `add` / `update` / `delete` / `connect`) followed by prose. The backend parses the block and emits each action as a separate SSE `graph_action` event from `POST /api/chat`; the frontend validates and applies them to the graph store. The action shapes are defined twice and **must stay in sync**: `backend/app/schemas/graph.py` (Pydantic) and `frontend/src/lib/graphActions.ts` (Zod). Change one, change both.

**Backend** (`backend/app/`) is layered: `api/routes/` (thin handlers) → `services/` (`auth_service`, `encryption_service`, `llm_service`) → `db/`. `main.py` is an app factory wiring CORS, slowapi, lifespan, and routers. Settings come from `core/config.py` (pydantic-settings, `.env`). Auth is JWT Bearer access token + refresh-token cookie; `api/deps.py` exposes `get_current_user` / `CurrentUser` / `DbSession`. DB is async SQLAlchemy (asyncpg); **all models must be imported in `db/models/__init__.py`** or Alembic autogenerate won't see them. The four entities are User, RefreshToken, Session (holds `graph_state` JSONB + `context_summary`), and Message. Tenant data is scoped by `user_id`.

**Frontend** (`frontend/src/`) is a React Router SPA with two-tier route gating: `ProtectedLayout` (requires auth token) wraps everything authenticated; nested `ApiKeyGuard` (requires `user.has_api_key`) wraps `/dashboard` and `/session/:id` only — **`/settings` is protected but intentionally outside ApiKeyGuard** so a keyless user can add their key. Global state is four Zustand stores: `authStore`, `sessionStore`, `graphStore`, `chatStore`. HTTP goes through the single Axios instance in `lib/api.ts` (interceptors handle token attach + refresh-on-401). The graph renders via `@xyflow/react` with the custom `AnalysisNode`; dagre does auto-layout.

**LLM** is per-user: each call uses the requesting user's decrypted Anthropic key and the session's `selected_model` (sonnet default / haiku / opus). `app/prompts/analysis_system.py` holds the system prompt. Context strategy is last-N messages verbatim (`CONTEXT_WINDOW_MAX_MESSAGES`) plus summarization on overflow.

## Conventions

- Autonomous-mode decisions are logged in `docs/claude_logs/DECISION_LOG.md`.
- Stub handlers raise `HTTPException(501)` rather than returning fake data, so the surface is callable while signaling "not yet implemented".
