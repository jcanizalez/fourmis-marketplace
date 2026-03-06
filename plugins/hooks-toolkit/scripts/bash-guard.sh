#!/bin/bash
# bash-guard.sh — PreToolUse hook for Bash commands
# Blocks dangerous shell commands before they execute.
#
# Blocked patterns:
# - rm -rf / (root deletion)
# - git push --force to main/master
# - DROP TABLE / DROP DATABASE
# - chmod 777
# - mkfs / format disk
# - dd if= (raw disk write)
# - :(){ :|:& };: (fork bomb)
# - curl | sh / wget | sh (pipe to shell)

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

# Normalize: lowercase for pattern matching
CMD_LOWER=$(echo "$COMMAND" | tr '[:upper:]' '[:lower:]')

# --- Dangerous command patterns ---

# Root filesystem deletion
if echo "$CMD_LOWER" | grep -qE 'rm\s+(-[a-z]*f[a-z]*\s+)?(/|/\s)'; then
  echo "Blocked: Deleting root filesystem is not allowed" >&2
  exit 2
fi

# Force push to main/master
if echo "$CMD_LOWER" | grep -qE 'git\s+push\s+.*--force.*\s+(main|master)'; then
  echo "Blocked: Force push to main/master is dangerous. Use --force-with-lease instead" >&2
  exit 2
fi

if echo "$CMD_LOWER" | grep -qE 'git\s+push\s+.*\s+(main|master).*--force'; then
  echo "Blocked: Force push to main/master is dangerous. Use --force-with-lease instead" >&2
  exit 2
fi

# SQL destructive operations
if echo "$CMD_LOWER" | grep -qE 'drop\s+(table|database|schema)'; then
  echo "Blocked: DROP TABLE/DATABASE commands require manual execution" >&2
  exit 2
fi

# World-writable permissions
if echo "$CMD_LOWER" | grep -qE 'chmod\s+777'; then
  echo "Blocked: chmod 777 sets world-writable permissions. Use more restrictive permissions (755, 644)" >&2
  exit 2
fi

# Disk formatting
if echo "$CMD_LOWER" | grep -qE '(mkfs|format)\s+'; then
  echo "Blocked: Disk formatting commands require manual execution" >&2
  exit 2
fi

# Raw disk writes
if echo "$CMD_LOWER" | grep -qE 'dd\s+if=.*of=/dev/'; then
  echo "Blocked: Raw disk write (dd) commands require manual execution" >&2
  exit 2
fi

# Fork bomb patterns
if echo "$COMMAND" | grep -qE ':\(\)\s*\{.*\}'; then
  echo "Blocked: Fork bomb pattern detected" >&2
  exit 2
fi

# Pipe to shell (curl/wget piped to sh/bash)
if echo "$CMD_LOWER" | grep -qE '(curl|wget)\s+.*\|\s*(sudo\s+)?(sh|bash|zsh)'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: "Piping remote content to a shell can execute arbitrary code. Review the URL and content first."
    }
  }'
  exit 0
fi

# git reset --hard
if echo "$CMD_LOWER" | grep -qE 'git\s+reset\s+--hard'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: "git reset --hard discards all uncommitted changes. Make sure you want to lose them."
    }
  }'
  exit 0
fi

# All checks passed
exit 0
