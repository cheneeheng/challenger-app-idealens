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
