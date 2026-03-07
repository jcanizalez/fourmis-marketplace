#!/usr/bin/env bash
# stuck-loop-detector.sh — PostToolUse hook for Bash (async)
# Detects when the agent is stuck in a loop — repeating the same commands
# or hitting the same errors. Warns after 3 repeated errors, alerts at 5.
#
# Tracks: last N bash commands and their exit codes.
# Triggers: same non-zero exit code 3+ times, or same command repeated 4+ times.

set -euo pipefail

INPUT=$(cat)

STATE_DIR="${TMPDIR:-/tmp}/session-guard"
HISTORY_FILE="$STATE_DIR/bash-history"
ERROR_FILE="$STATE_DIR/error-history"

mkdir -p "$STATE_DIR"

# Extract command and exit code from hook payload
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
# PostToolUse doesn't always have exit code in tool_input — check tool_result
EXIT_CODE=$(echo "$INPUT" | jq -r '.tool_result.exit_code // "0"' 2>/dev/null)

if [ -z "$COMMAND" ]; then
  exit 0
fi

# Normalize command (strip whitespace, take first 200 chars for comparison)
NORMALIZED=$(echo "$COMMAND" | tr -s '[:space:]' ' ' | head -c 200)

# Track command history (keep last 20)
echo "$NORMALIZED" >> "$HISTORY_FILE"
tail -20 "$HISTORY_FILE" > "$HISTORY_FILE.tmp" && mv "$HISTORY_FILE.tmp" "$HISTORY_FILE"

# Track error history (keep last 10 non-zero exits)
if [ "$EXIT_CODE" != "0" ] && [ "$EXIT_CODE" != "null" ]; then
  echo "$EXIT_CODE:$NORMALIZED" >> "$ERROR_FILE"
  tail -10 "$ERROR_FILE" > "$ERROR_FILE.tmp" && mv "$ERROR_FILE.tmp" "$ERROR_FILE"
fi

# Check 1: Same command repeated 4+ times in recent history
if [ -f "$HISTORY_FILE" ]; then
  REPEAT_COUNT=$(grep -cF "$NORMALIZED" "$HISTORY_FILE" 2>/dev/null || echo "0")
  if [ "$REPEAT_COUNT" -ge 5 ]; then
    echo "🔴 STUCK LOOP: Same command executed $REPEAT_COUNT times. The agent appears to be stuck. Consider: changing approach, reading error output more carefully, or asking the user for help."
    exit 0
  elif [ "$REPEAT_COUNT" -ge 4 ]; then
    echo "⚠️ LOOP WARNING: Same command repeated $REPEAT_COUNT times. If this continues, the agent may be stuck in a loop."
    exit 0
  fi
fi

# Check 2: Same error repeated 3+ times
if [ -f "$ERROR_FILE" ]; then
  # Extract error signatures (exit code + first 100 chars of command)
  ERROR_SIG="$EXIT_CODE:$(echo "$NORMALIZED" | head -c 100)"
  ERROR_REPEAT=$(grep -cF "$ERROR_SIG" "$ERROR_FILE" 2>/dev/null || echo "0")

  if [ "$ERROR_REPEAT" -ge 4 ]; then
    echo "🔴 REPEATED ERROR: Same command has failed $ERROR_REPEAT times with exit code $EXIT_CODE. The agent is not learning from the error. Try a different approach or debug the root cause."
    exit 0
  elif [ "$ERROR_REPEAT" -ge 3 ]; then
    echo "⚠️ ERROR PATTERN: Command has failed $ERROR_REPEAT times with exit code $EXIT_CODE. Consider investigating the error more carefully before retrying."
    exit 0
  fi
fi

# Check 3: Too many errors in a row (any command)
if [ -f "$ERROR_FILE" ]; then
  RECENT_ERRORS=$(wc -l < "$ERROR_FILE" | tr -d ' ')
  if [ "$RECENT_ERRORS" -ge 8 ]; then
    echo "🔴 ERROR STORM: $RECENT_ERRORS errors in recent commands. The session may need human intervention. Stop and assess the situation."
    exit 0
  fi
fi

exit 0
