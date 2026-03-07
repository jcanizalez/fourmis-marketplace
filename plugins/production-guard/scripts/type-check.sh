#!/usr/bin/env bash
# type-check.sh — PostToolUse hook for Write|Edit (async)
# Runs type checker after file edits for typed languages.
# Supports: tsc (TypeScript), mypy (Python), go vet (Go).
# Only runs if the project has the relevant config (tsconfig.json, etc.).
# Reports errors as informational warnings — does NOT block.

set -euo pipefail

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

EXT="${FILE_PATH##*.}"

# Find project root (look for .git, package.json, go.mod, pyproject.toml)
find_project_root() {
  local dir
  dir=$(dirname "$FILE_PATH")
  while [ "$dir" != "/" ]; do
    if [ -f "$dir/.git" ] || [ -d "$dir/.git" ] || [ -f "$dir/package.json" ] || [ -f "$dir/go.mod" ] || [ -f "$dir/pyproject.toml" ]; then
      echo "$dir"
      return
    fi
    dir=$(dirname "$dir")
  done
  echo ""
}

PROJECT_ROOT=$(find_project_root)
if [ -z "$PROJECT_ROOT" ]; then
  exit 0
fi

case "$EXT" in
  # TypeScript — run tsc --noEmit
  ts|tsx)
    if [ -f "$PROJECT_ROOT/tsconfig.json" ] && command -v npx &>/dev/null; then
      ERRORS=$(cd "$PROJECT_ROOT" && npx --no-install tsc --noEmit --pretty false 2>&1 | grep -c "error TS" 2>/dev/null || echo "0")
      if [ "$ERRORS" -gt 0 ]; then
        # Get first 5 errors for context
        FIRST_ERRORS=$(cd "$PROJECT_ROOT" && npx --no-install tsc --noEmit --pretty false 2>&1 | grep "error TS" | head -5)
        echo "⚠️ TypeScript: $ERRORS type error(s) found after editing $FILE_PATH"
        echo "$FIRST_ERRORS"
      fi
    fi
    ;;

  # Python — run mypy on the file
  py)
    if command -v mypy &>/dev/null; then
      if [ -f "$PROJECT_ROOT/mypy.ini" ] || [ -f "$PROJECT_ROOT/pyproject.toml" ] || [ -f "$PROJECT_ROOT/setup.cfg" ]; then
        ERRORS=$(cd "$PROJECT_ROOT" && mypy "$FILE_PATH" --no-error-summary 2>&1 | grep -c "error:" 2>/dev/null || echo "0")
        if [ "$ERRORS" -gt 0 ]; then
          FIRST_ERRORS=$(cd "$PROJECT_ROOT" && mypy "$FILE_PATH" --no-error-summary 2>&1 | grep "error:" | head -5)
          echo "⚠️ mypy: $ERRORS type error(s) in $FILE_PATH"
          echo "$FIRST_ERRORS"
        fi
      fi
    fi
    ;;

  # Go — run go vet
  go)
    if [ -f "$PROJECT_ROOT/go.mod" ] && command -v go &>/dev/null; then
      PKG_DIR=$(dirname "$FILE_PATH")
      ERRORS=$(cd "$PROJECT_ROOT" && go vet "./${PKG_DIR#$PROJECT_ROOT/}/..." 2>&1 | grep -cv "^$" 2>/dev/null || echo "0")
      if [ "$ERRORS" -gt 0 ]; then
        FIRST_ERRORS=$(cd "$PROJECT_ROOT" && go vet "./${PKG_DIR#$PROJECT_ROOT/}/..." 2>&1 | head -5)
        echo "⚠️ go vet: issues found after editing $FILE_PATH"
        echo "$FIRST_ERRORS"
      fi
    fi
    ;;
esac

exit 0
