---
artifact: SKELETON
status: ready
created: 2026-05-23
app: IdeaLens
stack: React 19, Vite, TypeScript, Python 3.12, FastAPI, PostgreSQL, SQLAlchemy async, Anthropic SDK, React Flow
sections: [01, 02, 03, 04, 05, 06]
---

# IdeaLens — Skeleton

> **React is the active frontend.** SvelteKit is documented separately in `SVELTE_REFERENCE.md` for future reference.
> Deployment (AWS, Railway/Neon/Vercel) is documented separately in `DEPLOYMENT.md` — not part of the build path.

---

## §01 · Concept

IdeaLens is a web app where users submit any idea or topic and receive a structured LLM analysis visualized as an interactive node graph. The interface is a split-view workspace: a chat panel on the left where the conversation lives, and a node graph on the right that the LLM populates and updates in real time. The LLM breaks every idea down across nine fixed dimensions (concept, requirements, gaps, benefits, drawbacks, feasibility, flaws, alternatives, open questions) and expresses each finding as a graph node. Users bring their own Anthropic API key.

The primary flow: user registers → saves API key → creates a new analysis → types their idea → LLM responds with analysis text and graph actions simultaneously → user continues the conversation to dig deeper → graph evolves with each reply.

---

## §02 · Architecture

### Component Diagram

```
Browser
  └── React SPA (Vite dev server :3000 / nginx in prod)
        │  HTTPS + Bearer token
        └── FastAPI (uvicorn :8000)
              ├── PostgreSQL (local :5432 / RDS in prod)
              └── Anthropic API (external, per-user key)
```

Local dev: both processes run independently. `docker-compose.yml` provides the PostgreSQL container only.

### Data Model (entities and key fields)

```
User
  id, email, password_hash, encrypted_api_key, created_at

RefreshToken
  id, user_id (→ User), token_hash, expires_at, revoked

Session
  id, user_id (→ User), name, idea, selected_model,
  graph_state (JSONB), context_summary, created_at, updated_at

Message
  id, session_id (→ Session), role (user|assistant|system),
  content, message_index, created_at
```

### API Surface

```
GET  /health                         liveness check

POST /auth/register                  create account + issue tokens
POST /auth/login                     issue tokens
POST /auth/refresh                   rotate access token via cookie
POST /auth/logout                    revoke refresh token

GET  /api/users/me                   current user profile
PATCH /api/users/me                  update display name / email
PATCH /api/users/me/password         change password
PUT  /api/users/me/api-key           save encrypted Anthropic key
DELETE /api/users/me                 delete account + cascade

GET  /api/models                     list allowed model identifiers (public)

GET  /api/sessions                   paginated list, ordered by updated_at desc
POST /api/sessions                   create session + seed root node
GET  /api/sessions/:id               session + all messages + graph_state
PATCH /api/sessions/:id              rename, change model
DELETE /api/sessions/:id             delete session + cascade
PUT  /api/sessions/:id/graph         persist updated graph_state

POST /api/chat                       SSE stream — LLM response + graph actions
```

---

## §03 · Tech Stack

**Backend**
- Python 3.12
- FastAPI — API framework
- SQLAlchemy 2.x (async, asyncpg driver) — ORM
- Alembic — migrations
- Pydantic v2 + pydantic-settings — validation and config
- `python-jose` + `bcrypt` — JWT and password hashing
- `cryptography` (Fernet) — API key encryption at rest
- Anthropic SDK — LLM calls
- `structlog` — structured logging
- `slowapi` — rate limiting
- `uv` — package manager

**Frontend**
- React 19 + Vite + TypeScript
- React Router v7 — routing
- Zustand — global state (auth, session, graph, chat)
- Axios — HTTP client (interceptors for token refresh)
- `@xyflow/react` (React Flow) — node graph
- `dagre` — auto-layout for graph
- `zod` — schema validation (graph actions, API responses)
- `react-resizable-panels` — split panel layout
- `sonner` — toast notifications

**Tooling**
- `docker-compose.yml` — PostgreSQL only (local dev)
- Vitest — unit tests (frontend)
- pytest + httpx — backend tests

---

## §04 · Backend

### Directory Structure

```
backend/
├── app/
│   ├── main.py                  app factory: middleware, routers, lifespan
│   ├── core/
│   │   └── config.py            pydantic-settings Settings + get_settings()
│   ├── db/
│   │   ├── session.py           get_db async generator
│   │   └── models/
│   │       ├── __init__.py      imports all models (Alembic discovery)
│   │       ├── base.py          declarative base
│   │       ├── user.py
│   │       ├── refresh_token.py
│   │       ├── session.py
│   │       └── message.py
│   ├── schemas/
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── session.py
│   │   ├── graph.py             graph action types (Pydantic + mirrored in Zod)
│   │   └── chat.py
│   ├── api/
│   │   ├── deps.py              get_current_user dependency
│   │   └── routes/
│   │       ├── auth.py
│   │       ├── users.py
│   │       ├── sessions.py
│   │       ├── chat.py
│   │       └── models.py
│   ├── services/
│   │   ├── auth_service.py      hash/verify, JWT create/verify
│   │   ├── encryption_service.py  Fernet encrypt/decrypt
│   │   └── llm_service.py       build_messages, stream, parse, summarize
│   └── prompts/
│       └── analysis_system.py   SYSTEM_PROMPT constant
├── alembic/
├── tests/
├── pyproject.toml
├── .env.example
└── Dockerfile
```

**How to run locally:**
```bash
cd backend
uv venv && uv sync
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, API_KEY_ENCRYPTION_KEY
docker compose up -d   # starts PostgreSQL only
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Required env vars (names only):**
```
DATABASE_URL
JWT_SECRET
API_KEY_ENCRYPTION_KEY
ENVIRONMENT          (development | production)
FRONTEND_URLS        (comma-separated list of allowed origins)
CONTEXT_WINDOW_MAX_MESSAGES   (default: 20)
```

---

## §05 · Frontend

### Screens and Routes

```
/login              Login page
/register           Register page
/dashboard          Session list + "New Analysis" button
/session/:id        Workspace — split view (chat + graph)
/settings           Profile, API key, password, danger zone
```

`/dashboard`, `/session/:id`, and `/settings` are protected (redirect to `/login` if not authenticated). `/session/:id` and `/dashboard` additionally require an API key to be set.

### Component Tree (top level)

```
App
├── AuthLayout
│   ├── LoginPage
│   └── RegisterPage
└── ProtectedLayout (checks auth token)
    ├── ApiKeyGuard (checks user.has_api_key)
    │   ├── DashboardPage
    │   │   ├── AppHeader
    │   │   ├── SessionCard (×n)
    │   │   └── NewAnalysisModal
    │   └── SessionPage
    │       ├── AppHeader
    │       └── SplitLayout
    │           ├── ChatPanel
    │           │   ├── MessageBubble (×n)
    │           │   └── ChatInput
    │           └── GraphPanel
    │               ├── ReactFlow (nodes + edges)
    │               │   └── AnalysisNode (custom node)
    │               └── GraphToolbar
    └── SettingsPage
        └── AppHeader
```

**Placeholder data strategy:** All stores initialize empty. Pages render empty states until real data loads. No mock data in the skeleton — wire real API calls from the first iteration that introduces each page.

**How to run locally:**
```bash
cd frontend
npm install
cp .env.example .env.local   # VITE_API_URL=http://localhost:8000
npm run dev                  # starts on :3000
```

---

## §06 · LLM / Prompts

The LLM is used to analyze ideas and produce structured graph updates alongside conversational text.

**Provider:** Anthropic SDK. Model is user-selectable per session (sonnet default, haiku, opus as options).

**Output contract:** Every LLM response must include a `<GRAPH_ACTIONS>` block containing a JSON array, followed by natural language text. The backend parses this block and emits each action as a separate SSE event (`event: graph_action`). The frontend applies each action to the graph store.

```
<GRAPH_ACTIONS>
[
  {"action": "add",     "payload": { "id": "...", "type": "...", "label": "...", "content": "...", "score": null, "parent_id": null }},
  {"action": "update",  "payload": { "id": "...", "label": "...", "content": "..." }},
  {"action": "delete",  "payload": { "id": "..." }},
  {"action": "connect", "payload": { "source": "...", "target": "...", "label": "...", "type": "..." }}
]
</GRAPH_ACTIONS>

Natural language explanation follows here...
```

**Stub system prompt (placeholder — full prompt in ITER_02):**
```python
SYSTEM_PROMPT = """You are a rigorous analytical assistant.
Analyze ideas across 9 dimensions. Always include a <GRAPH_ACTIONS> block first."""
```

**Context strategy (deferred to ITER_02):** Last-N messages verbatim + summarization for overflow.
