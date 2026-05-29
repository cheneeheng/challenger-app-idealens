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
