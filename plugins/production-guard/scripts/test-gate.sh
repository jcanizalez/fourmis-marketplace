#!/usr/bin/env bash
# test-gate.sh — Stop hook
# Runs the project's test suite before allowing Claude to stop.
# Detects the test runner from project config (package.json, go.mod, etc.).
# If tests fail, blocks the stop and reports which tests broke.
# If no test runner is found, approves silently.

set -euo pipefail

# Read stdin (hook payload)
INPUT=$(cat)

# Find project root from current directory
find_project_root() {
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -d "$dir/.git" ] || [ -f "$dir/package.json" ] || [ -f "$dir/go.mod" ] || [ -f "$dir/Cargo.toml" ] || [ -f "$dir/pyproject.toml" ]; then
      echo "$dir"
      return
    fi
    dir=$(dirname "$dir")
  done
  echo "$PWD"
}

PROJECT_ROOT=$(find_project_root)

# Detect test runner and run tests
TEST_OUTPUT=""
TEST_EXIT=0

run_tests() {
  local cmd="$1"
  local name="$2"

  TEST_OUTPUT=$( cd "$PROJECT_ROOT" && eval "$cmd" 2>&1 ) || TEST_EXIT=$?

  if [ $TEST_EXIT -ne 0 ]; then
    # Extract just the failure summary (last 20 lines)
    SUMMARY=$(echo "$TEST_OUTPUT" | tail -20)
    echo "{\"decision\": \"block\", \"reason\": \"🧪 TEST GATE: $name tests failed (exit code $TEST_EXIT). Fix failing tests before stopping.\\n\\n$SUMMARY\"}"
    exit 0
  fi
}

# Check for test runners in priority order

# Node.js (package.json with test script)
if [ -f "$PROJECT_ROOT/package.json" ]; then
  HAS_TEST=$(jq -r '.scripts.test // empty' "$PROJECT_ROOT/package.json" 2>/dev/null)
  if [ -n "$HAS_TEST" ] && [ "$HAS_TEST" != "echo \"Error: no test specified\" && exit 1" ]; then
    # Check which package manager
    if [ -f "$PROJECT_ROOT/pnpm-lock.yaml" ]; then
      run_tests "pnpm test --if-present 2>&1" "pnpm"
    elif [ -f "$PROJECT_ROOT/yarn.lock" ]; then
      run_tests "yarn test 2>&1" "yarn"
    elif [ -f "$PROJECT_ROOT/bun.lockb" ]; then
      run_tests "bun test 2>&1" "bun"
    else
      run_tests "npm test 2>&1" "npm"
    fi
    echo '{"decision": "approve"}'
    exit 0
  fi
fi

# Go (go.mod)
if [ -f "$PROJECT_ROOT/go.mod" ]; then
  run_tests "go test ./... -count=1 -short 2>&1" "Go"
  echo '{"decision": "approve"}'
  exit 0
fi

# Python (pyproject.toml or pytest.ini or setup.py)
if [ -f "$PROJECT_ROOT/pyproject.toml" ] || [ -f "$PROJECT_ROOT/pytest.ini" ] || [ -f "$PROJECT_ROOT/setup.cfg" ]; then
  if command -v pytest &>/dev/null; then
    run_tests "pytest --tb=short -q 2>&1" "pytest"
    echo '{"decision": "approve"}'
    exit 0
  elif command -v python &>/dev/null; then
    run_tests "python -m pytest --tb=short -q 2>&1" "pytest"
    echo '{"decision": "approve"}'
    exit 0
  fi
fi

# Rust (Cargo.toml)
if [ -f "$PROJECT_ROOT/Cargo.toml" ]; then
  run_tests "cargo test 2>&1" "cargo"
  echo '{"decision": "approve"}'
  exit 0
fi

# Makefile with test target
if [ -f "$PROJECT_ROOT/Makefile" ]; then
  if grep -q "^test:" "$PROJECT_ROOT/Makefile" 2>/dev/null; then
    run_tests "make test 2>&1" "make"
    echo '{"decision": "approve"}'
    exit 0
  fi
fi

# No test runner found — approve silently
echo '{"decision": "approve"}'
