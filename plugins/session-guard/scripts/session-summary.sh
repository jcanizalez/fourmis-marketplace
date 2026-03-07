#!/usr/bin/env bash
# session-summary.sh — Stop hook
# Generates a session summary when Claude stops — files changed, commits made,
# tests status, and time spent. Saves to .session-guard/summaries/.
# Always approves — this is informational, not a gate.

set -euo pipefail

INPUT=$(cat)

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
  echo "$PWD"
}

PROJECT_ROOT=$(find_project_root)
cd "$PROJECT_ROOT"

# Session state
STATE_DIR="${TMPDIR:-/tmp}/session-guard"
EDIT_COUNT=0
if [ -f "$STATE_DIR/edit-counter" ]; then
  EDIT_COUNT=$(cat "$STATE_DIR/edit-counter")
fi

# Summary output dir
SUMMARY_DIR="$PROJECT_ROOT/.session-guard/summaries"
mkdir -p "$SUMMARY_DIR"

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
SUMMARY_FILE="$SUMMARY_DIR/session-$TIMESTAMP.md"

# Gather stats
UNCOMMITTED=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
STAGED=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')

# Recent commits (from this session — look for checkpoint commits or last hour)
SESSION_COMMITS=$(git log --oneline --since="2 hours ago" 2>/dev/null | wc -l | tr -d ' ')
COMMIT_LIST=$(git log --oneline --since="2 hours ago" 2>/dev/null | head -10 || echo "(none)")

# Lines changed
INSERTIONS=$(git diff --stat HEAD~"${SESSION_COMMITS:-1}" HEAD 2>/dev/null | tail -1 | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
DELETIONS=$(git diff --stat HEAD~"${SESSION_COMMITS:-1}" HEAD 2>/dev/null | tail -1 | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")

# Files changed (unique across all recent commits)
FILES_CHANGED=$(git diff --name-only HEAD~"${SESSION_COMMITS:-1}" HEAD 2>/dev/null | sort -u | wc -l | tr -d ' ' || echo "0")

# Stuck loop stats
ERROR_COUNT=0
if [ -f "$STATE_DIR/error-history" ]; then
  ERROR_COUNT=$(wc -l < "$STATE_DIR/error-history" | tr -d ' ')
fi

# Write summary
cat > "$SUMMARY_FILE" << SUMMARY
# Session Summary — $TIMESTAMP

## Stats
- **File edits tracked**: $EDIT_COUNT
- **Files changed**: $FILES_CHANGED
- **Lines**: +$INSERTIONS / -$DELETIONS
- **Commits this session**: $SESSION_COMMITS
- **Uncommitted files**: $((UNCOMMITTED + STAGED))
- **Errors encountered**: $ERROR_COUNT

## Commits
$COMMIT_LIST

## Uncommitted Changes
$(git diff --name-only 2>/dev/null | head -10 || echo "(none)")
$(git diff --cached --name-only 2>/dev/null | head -10)
SUMMARY

# Print summary to stdout (visible in Claude's output)
echo "📊 Session Summary: $EDIT_COUNT edits, $FILES_CHANGED files changed (+$INSERTIONS/-$DELETIONS), $SESSION_COMMITS commits, $ERROR_COUNT errors"
echo "   Summary saved: .session-guard/summaries/session-$TIMESTAMP.md"

# Clean up session state for next run
rm -f "$STATE_DIR/edit-counter" "$STATE_DIR/bash-history" "$STATE_DIR/error-history"

# Always approve — summary is informational
echo '{"decision": "approve"}'
