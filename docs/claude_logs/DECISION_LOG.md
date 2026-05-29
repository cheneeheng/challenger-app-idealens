# Decision Log

### Entry 001

**Type:** Decision
**Mode:** Autonomous
**Timestamp:** 2026-05-29
**Task:** Implement IdeaLens SKELETON.md scaffold (§01–§06)

**Context:** The skeleton specifies structure but leaves several scaffold-level
details unspecified: how stub route handlers should behave, concrete model
identifiers for `GET /api/models`, and dependency version pins (the stack lists
libraries without versions except React 19 / Python 3.12).

**Decision:**
- Stub route handlers raise `HTTPException(501 Not Implemented)` rather than
  returning fake data, so the app boots and the contract is visible while making
  it obvious logic is unimplemented. `/health` and `GET /api/models` are real
  since they need no business logic.
- Model identifiers use current Claude IDs (`claude-sonnet-4-6` default,
  `claude-haiku-4-5-20251001`, `claude-opus-4-8`) matching the skeleton's
  "sonnet default, haiku, opus" note.
- Dependencies pinned to lower bounds (`>=`) on current major versions; no exact
  pins since the skeleton specified none.
- Branch named `feat/skeleton-scaffold` per the feat/ convention.
- `test_health.py` is the only test (smoke test for the one real endpoint);
  per the contract, tests were written but not run.

**Impact / Risk:** Low. All choices are localized to the scaffold and easily
overridden in later iterations (ITER_01+). Model IDs may need adjustment if the
allowed set changes.

**Outcome:** 78 files created across backend/ and frontend/. App structure boots
to 501s on unimplemented routes; real logic lands in ITER iterations.

### Entry 002

**Type:** Decision
**Mode:** Autonomous
**Timestamp:** 2026-05-29
**Task:** Implement ITER_01–ITER_03 (backend foundation, analysis engine, frontend shell)

**Context:** Several points where the ITER specs and the existing scaffold (or
runtime constraints) diverged and the user left the resolution unspecified.

**Decision:**
- **Frontend layout:** Followed the existing scaffold's `src/lib/` + `src/layouts/`
  structure (documented as authoritative in CLAUDE.md) rather than ITER_03's literal
  `src/services/api.ts` + `src/components/ProtectedLayout` + `src/schemas/user.ts`
  paths. Added `lib/schemas.ts` (Zod `userSchema`) and `lib/errors.ts` to fit that
  convention.
- **Initial migration hand-written** (`alembic/versions/0001_initial.py`) to match
  the models, because `alembic revision --autogenerate` requires a live database
  and command execution was out of scope. Drift risk noted — regenerate if models change.
- **`SessionCreate` schema** changed so `idea` is required and `name` is optional
  (defaults to first 60 chars of `idea`, per ITER_01 §8), instead of the scaffold's
  required `name`.
- **`ApiKeyGuard`** renders a full-page "add your key" prompt (ITER_03 §5) instead of
  the scaffold's silent redirect to `/settings`.
- **Model allowlist centralized** in `app/core/llm_models.py` (single source for the
  models route, session default, and chat allowlist); kept the scaffold's
  `claude-opus-4-8` id (per Entry 001), not ITER_02's `claude-opus-4-6`.
- **Reconnection replay:** the assistant message PK is pinned to the SSE `id:` so a
  reconnect with `Last-Event-ID` can replay it.
- Per the contract, tests were written but not run; backend deps and node_modules
  are not installed in this environment.

**Impact / Risk:** Low–medium. The hand-written migration is the main drift risk.
All other choices are localized and reversible.

**Outcome:** Backend §03/§04/§06 and frontend §03/§05 implemented on branch
`feat/iter-01-03-foundation`. Backend has no remaining 501 stubs.

### Entry 003

**Type:** Decision
**Mode:** Autonomous
**Timestamp:** 2026-05-29
**Task:** Implement ITER_04–06 (workspace + chat, graph visualization, graph interactions)

**Context:** Several points where the ITER specs diverged from the existing scaffold,
repo conventions, or backend serialization reality, with no user resolution given.

**Decision:**
- **Zod schema location:** Kept the graph action Zod mirror in `src/lib/graphActions.ts`
  (the location CLAUDE.md documents as authoritative and the existing file) rather than
  creating ITER_05's literal `src/schemas/graph.ts`. Tightened it in place to match the
  backend (DimensionType enum, `label` max 60, `score` 0–10 nullable, required `connect`
  fields, `update` without `score`).
- **Update-action nullability:** ITER_05 specs `label`/`content` as `.optional()`, but the
  backend `model_dump(mode="json")` emits explicit `null` for fields the LLM leaves unset,
  which `.optional()` rejects. Made them `.nullish()` and treat null as "no change" in
  `applyGraphActions`, so real backend update actions validate instead of being skipped.
- **Graph components dir:** Followed the plan's `src/components/graph/` for the graph
  components (AnalysisNode, GraphToolbar, NodeDetailPanel, NodeContextMenu); relocated the
  two pre-existing flat stubs (AnalysisNode, GraphToolbar) there for consistency.
- **SessionCard idea excerpt:** ITER_04 §05.6 lists an "idea excerpt", but the backend
  `SessionSummary` (list endpoint) does not return `idea` and §04 is out of scope this
  iteration. Card shows name (which defaults to the truncated idea), model badge, and
  relative timestamp instead — no backend change.
- **ID generation:** Used the native `crypto.randomUUID()` for local message/node IDs
  rather than adding a `uuid`/`nanoid` dependency (universal non-goal: no new deps).
- **Shared chat input draft:** Added `draft`/`setDraft` to `chatStore` so the graph context
  menu's "Ask Claude about this" can prefill `ChatInput` across panels.
- **Skipped graphStore-stub step (ITER_04 §05.3):** Implemented the full ITER_05 graphStore
  directly since both iterations are in scope; the stub would have been immediately replaced.

**Impact / Risk:** Low. The nullish update-schema fix is the one functional correction
beyond the literal spec; without it, single-field LLM updates would silently no-op.

**Outcome:** Frontend §05 (ITER_04–06) and backend §04 (ITER_06 messages endpoint)
implemented on branch `feat/iter-04-06-workspace-graph`. Tests written for the new
backend endpoint and the core frontend logic (graphStore, graphLayout, chatStore, time).
Per the contract, tests/type-check were not run — frontend `node_modules` and the backend
`.venv` are not installed in this environment and execution was not requested.

### Entry — Review against plan (ITER_04–06)

**Type:** Decision
**Mode:** Autonomous
**Timestamp:** 2026-05-29T00:00:00Z
**Task:** review-against-plan audit of ITER_04–06 (sections §03, §04, §05).

**Context:** Audit found one gap. ITER_04 §05.6 specifies `SessionCard` "Shows: session
name, idea excerpt (truncated to ~80 chars), model badge, relative timestamp." A prior
decision-log entry deliberately omitted the idea excerpt, reasoning that `name` defaults
to the truncated idea (`name = payload.name or payload.idea[:60]`) so the two collapse.
That reasoning fails after ITER_06's inline session rename: once renamed, `name` diverges
from `idea`, and the spec lists name and idea excerpt as distinct fields. The excerpt was
also unsatisfiable because `SessionSummary` (the list endpoint payload) did not carry `idea`.

**Decision:** Superseded the prior omission. Exposed the existing `Session.idea` column on
`SessionSummary` (backend schema + frontend type + `toSummary` mapping) and rendered a
~80-char truncated excerpt in `SessionCard`. This crosses into §02/§04 (marked unchanged
this iteration), but it is a minimal additive read-field change and is the only way to
satisfy the in-scope §05 spec; the model and `SessionDetail` already expose `idea`.

**Impact / Risk:** Low. Additive field on a read response; no migration (column exists),
no behavior change elsewhere. No sessionStore test asserts the summary shape.

**Outcome:** SessionCard now matches ITER_04 §05.6. All other §03/§04/§05 items across
ITER_04–06 verified present and faithful to spec. Type-check/build not run per the
agent-coding-contract hard rule (validation not explicitly requested).

### Entry 005

**Type:** Decision
**Mode:** Autonomous
**Timestamp:** 2026-05-29
**Task:** Implement ITER_07 (§04 rate limiters, §05 polish + tests) on branch feat/iter-07-polish-tests.

**Context:** Several forks the spec left unresolved.
**Decision:**
1. Extracted the slowapi `Limiter` from `main.py` into `app/core/rate_limit.py` (with a 429 `{"detail": "Rate limit exceeded"}` handler) so route modules can `@limiter.limit` without importing `main` — `main` imports the routes, so importing `limiter` from `main` would be circular.
2. Disabled the limiter in `tests/conftest.py` (`limiter.enabled = False`). Under the in-process httpx client every request shares one rate-limit key, so the suite's repeated register/login calls would otherwise trip the 5/15min and 10/15min limits.
3. Placed new Vitest files co-located as `src/**/*.test.ts` (repo convention) rather than the spec's `src/**/__tests__/` path. `graphLayout` spec items and most `graphStore` items already had coverage; only added the missing "userPositioned preserved through layout" case plus a new `chatService.test.ts`.
4. Dashboard skeletons render only when `isLoading && sessions.length === 0`, so the "Load more" path doesn't wipe already-rendered cards with skeletons.
5. Extended `sessionStore.fetchSessions(page?)` to append on page>1 and track `hasMore` in the store (plus `removeSessionLocal`/`restoreSession` for optimistic delete+undo), keeping all API access in the store layer per existing pattern.
6. Scoped Vitest `include` to `src/**` so the Playwright `e2e/*.spec.ts` (which imports `@playwright/test`) isn't collected by `vitest`. The E2E test `test.skip`s without `E2E_ANTHROPIC_API_KEY` and assumes both servers are running.

**Impact / Risk:** Low–moderate. Rate limiting is now enforced in non-test runs; the test disable keeps the existing suite green. No schema/migration changes. E2E selectors were written against the current UI and may need adjustment as the app evolves.

**Outcome:** All ITER_07 §04/§05 items implemented. Tests/build not run per the agent-coding-contract hard rule (validation not explicitly requested).
