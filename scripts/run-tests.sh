#!/usr/bin/env bash
#
# Run all IdeaLens tests (backend pytest + frontend vitest).
#
# Usage:
#   scripts/run-tests.sh              # run backend + frontend tests
#   scripts/run-tests.sh backend      # backend tests only
#   scripts/run-tests.sh frontend     # frontend tests only
#   scripts/run-tests.sh --e2e        # also run frontend Playwright e2e tests
#
# Exits non-zero if any selected suite fails.

set -uo pipefail

# Resolve repo root regardless of where the script is called from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

run_backend=true
run_frontend=true
run_e2e=false

for arg in "$@"; do
  case "$arg" in
    backend)  run_frontend=false ;;
    frontend) run_backend=false ;;
    --e2e)    run_e2e=true ;;
    -h|--help)
      sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

failures=()

run_suite() {
  local name="$1"; shift
  echo ""
  echo "=================================================="
  echo "  ${name}"
  echo "=================================================="
  if "$@"; then
    echo "PASS: ${name}"
  else
    echo "FAIL: ${name}"
    failures+=("${name}")
  fi
}

if [ "$run_backend" = true ]; then
  run_suite "backend (pytest)" bash -c "cd '${REPO_ROOT}/backend' && uv run pytest"
fi

if [ "$run_frontend" = true ]; then
  # `vitest run` exits after a single run (no watch mode).
  run_suite "frontend (vitest)" bash -c "cd '${REPO_ROOT}/frontend' && bun run test run"
fi

if [ "$run_e2e" = true ]; then
  run_suite "frontend e2e (playwright)" bash -c "cd '${REPO_ROOT}/frontend' && bun run test:e2e"
fi

echo ""
echo "=================================================="
if [ "${#failures[@]}" -eq 0 ]; then
  echo "  All test suites passed."
  exit 0
else
  echo "  Failed suites: ${failures[*]}"
  exit 1
fi
