# Running the Tests

This guide is for whoever **works on or verifies** an IdeaLens instance — contributors and
operators. If you just want to *use* IdeaLens, start with [Getting Started](getting-started.md);
if you want to run or host it, see [Deployment & Running the App](deployment.md).

IdeaLens has three test suites:

| Suite | Tool | Location | Needs a database? | Needs the app running? |
|-------|------|----------|-------------------|------------------------|
| Backend | `pytest` | `backend/tests/` | Yes (PostgreSQL) | No (in-process ASGI client) |
| Frontend unit | `vitest` | `frontend/src/**/*.test.ts(x)` | No | No |
| End-to-end | `playwright` | `frontend/e2e/` | Yes | Yes (backend + frontend) |

## One command for everything

From the repository root:

```bash
scripts/run-tests.sh              # backend + frontend unit suites
scripts/run-tests.sh backend      # backend only
scripts/run-tests.sh frontend     # frontend unit only
scripts/run-tests.sh --e2e        # also run the Playwright end-to-end suite
```

The script runs each selected suite, prints a PASS/FAIL line per suite, and exits non-zero if
any suite fails. The sections below cover prerequisites and what each suite needs.

## Backend tests (pytest)

The backend tests run against a **real PostgreSQL database** through an in-process ASGI client
(no Uvicorn server needed). Each test runs inside a transaction that is rolled back on teardown,
and `conftest.py` creates and drops the schema itself — so you do **not** need to run
`alembic upgrade head` first.

What you do need is a database the tests can connect to. By default they connect to a
**separate** database called `idealens_test` — *not* the `idealens` development database that
`docker compose` creates. This separation is deliberate: the suite drops all tables on teardown,
which would wipe your dev data if pointed at the dev database.

### 1. Start PostgreSQL and create the test database

```bash
docker compose up -d                                          # from repo root
docker compose exec postgres createdb -U idealens idealens_test
```

The `createdb` step is a one-time setup; the database persists in the `pgdata` Docker volume.

### 2. Run the tests

```bash
cd backend
uv run pytest                                       # all backend tests
uv run pytest tests/test_health.py::test_health     # a single test
```

`conftest.py` sets safe defaults for the other required environment variables (`JWT_SECRET`,
`API_KEY_ENCRYPTION_KEY`, `ENVIRONMENT`), so you do not need a `.env` file just to run tests.

### Pointing at a different database

If you would rather not create `idealens_test`, set `TEST_DATABASE_URL` to any async PostgreSQL
DSN the tests should use:

```bash
TEST_DATABASE_URL=postgresql+asyncpg://idealens:idealens@localhost:5432/idealens_test uv run pytest
```

Do **not** point this at your dev database — the suite drops every table on teardown.

## Frontend unit tests (vitest)

These are pure unit tests (stores, helpers, components) with no database or server dependency.

```bash
cd frontend
bun run test run     # single run, then exit
bun run test         # watch mode (re-runs on file change)
bun run test <pattern>   # a single file or pattern
```

Note the two important wrinkles:

- Use `bun run test`, **not** `bun test` — the latter invokes Bun's built-in test runner instead
  of Vitest and will not find the suite.
- `bun run test` on its own starts Vitest in **watch mode** and does not exit. For a one-shot run
  (CI, the `run-tests.sh` script), append `run` so it becomes `vitest run`.

## End-to-end tests (Playwright)

There is one end-to-end test (`frontend/e2e/main.spec.ts`): the full happy path — register, add an
API key, run an analysis, edit the graph, and delete the account.

**This test is skipped by default.** It self-skips unless the `E2E_ANTHROPIC_API_KEY` environment
variable is set (see `main.spec.ts`), so a normal `bun run test:e2e` reports `1 skipped` rather
than running anything. That is expected, not a failure.

It is gated because it is a **live, paid, destructive** test:

- It drives a real browser against running **backend (`:8000`) and frontend (`:3000`)** servers.
- It streams from the **real Anthropic API** using the key you provide, so it consumes tokens
  billed to that account.
- It registers a throwaway account and **deletes it** at the end.

### Running it for real

In separate terminals (see [Deployment](deployment.md) for full setup):

```bash
# 1. database + backend
docker compose up -d
cd backend && uv run uvicorn app.main:app --port 8000

# 2. frontend
cd frontend && bun run dev

# 3. the e2e test, with a real key
cd frontend
E2E_ANTHROPIC_API_KEY=sk-ant-... bun run test:e2e
# or via the helper script, from repo root:
E2E_ANTHROPIC_API_KEY=sk-ant-... scripts/run-tests.sh --e2e frontend
```

The first run also needs the Playwright browser binaries; install them once with
`bunx playwright install chromium`.
