#!/usr/bin/env bash
# progress-checkpoint.sh — PostToolUse hook for Write|Edit (async)
# Auto-commits changed files after every N file edits.
# Prevents lost work during long autonomous sessions.
# Uses lightweight "checkpoint" commits that can be squashed later.
#
# Config: Set CHECKPOINT_INTERVAL env var to change frequency (default: 5)

set -euo pipefail

INPUT=$(cat)

# Config
CHECKPOINT_INTERVAL="${CHECKPOINT_INTERVAL:-5}"
STATE_DIR="${TMPDIR:-/tmp}/session-guard"
COUNTER_FILE="$STATE_DIR/edit-counter"

mkdir -p "$STATE_DIR"

# Find project root
find_project_root() {
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -d "$dir/.git" ]; then
      echo "$dir"
      return
    fi
    dir=$(dirname "$dir")
  done
  echo ""
}

PROJECT_ROOT=$(find_project_root)
if [ -z "$PROJECT_ROOT" ]; then
  exit 0  # Not a git repo — skip
fi

# Increment counter
if [ -f "$COUNTER_FILE" ]; then
  COUNT=$(cat "$COUNTER_FILE")
  COUNT=$((COUNT + 1))
else
  COUNT=1
fi
echo "$COUNT" > "$COUNTER_FILE"

# Check if it's time for a checkpoint
if [ $((COUNT % CHECKPOINT_INTERVAL)) -ne 0 ]; then
  exit 0  # Not yet
fi

# Check if there are actual changes to commit
cd "$PROJECT_ROOT"
if git diff --quiet && git diff --cached --quiet; then
  exit 0  # No changes
fi

# Count changed files for the commit message
CHANGED=$(git diff --name-only | wc -l | tr -d ' ')
STAGED=$(git diff --cached --name-only | wc -l | tr -d ' ')
TOTAL=$((CHANGED + STAGED))

if [ "$TOTAL" -eq 0 ]; then
  exit 0
fi

# Create checkpoint commit
git add -A
TIMESTAMP=$(date +"%H:%M")
git commit -m "chore: checkpoint ($TOTAL files, $TIMESTAMP)" \
  --no-verify \
  --author="session-guard <session-guard@fourmis.ai>" \
  2>/dev/null || true

echo "📸 Checkpoint: committed $TOTAL changed files (edit #$COUNT)"
