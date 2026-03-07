#!/usr/bin/env bash
# drift-detector.sh — PostToolUse hook for Write|Edit (async)
# Detects when the agent is making changes without corresponding tests.
# Warns after N source file edits without any test file edits.
# Prevents the common autonomous session problem of implementing features
# without tests, which compounds into broken codebases.
#
# Config: DRIFT_THRESHOLD env var (default: 8 source edits without a test edit)

set -euo pipefail

INPUT=$(cat)

DRIFT_THRESHOLD="${DRIFT_THRESHOLD:-8}"
STATE_DIR="${TMPDIR:-/tmp}/session-guard"
SOURCE_COUNTER="$STATE_DIR/source-edits"
TEST_COUNTER="$STATE_DIR/test-edits"

mkdir -p "$STATE_DIR"

# Get the file that was edited
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

BASENAME=$(basename "$FILE_PATH")

# Classify file: test or source
IS_TEST=false
if echo "$FILE_PATH" | grep -qiE '(\.test\.|\.spec\.|_test\.|test_|__tests__|__test__|\.stories\.)'; then
  IS_TEST=true
elif echo "$BASENAME" | grep -qiE '^test_|_test\.go$|_test\.py$'; then
  IS_TEST=true
fi

# Skip non-source files (configs, docs, generated)
IS_SOURCE=false
case "$BASENAME" in
  *.ts|*.tsx|*.js|*.jsx|*.py|*.go|*.rs|*.rb|*.java|*.kt|*.swift|*.c|*.cpp)
    IS_SOURCE=true
    ;;
esac

if ! $IS_SOURCE; then
  exit 0  # Not a source file, don't track
fi

if $IS_TEST; then
  # Reset the source counter — test was edited
  echo "0" > "$SOURCE_COUNTER"
  # Increment test counter
  if [ -f "$TEST_COUNTER" ]; then
    TC=$(cat "$TEST_COUNTER")
    echo $((TC + 1)) > "$TEST_COUNTER"
  else
    echo "1" > "$TEST_COUNTER"
  fi
  exit 0
fi

# Source file edited — increment counter
if [ -f "$SOURCE_COUNTER" ]; then
  SC=$(cat "$SOURCE_COUNTER")
  SC=$((SC + 1))
else
  SC=1
fi
echo "$SC" > "$SOURCE_COUNTER"

# Check drift threshold
if [ "$SC" -ge "$((DRIFT_THRESHOLD + 4))" ]; then
  echo "🔴 TEST DRIFT: $SC source files edited without any test changes. This is a significant gap. Write tests for the recent changes before continuing."
elif [ "$SC" -ge "$DRIFT_THRESHOLD" ]; then
  echo "⚠️ TEST DRIFT: $SC source files edited without any test changes. Consider writing tests for the recent changes to prevent regressions."
fi

exit 0
