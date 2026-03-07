#!/usr/bin/env bash
# commit-guard.sh — PreToolUse hook for Bash
# Validates git commit messages follow conventional commits format.
# Blocks force pushes to main/master. Blocks commits without messages.
# Only intercepts git commands — passes through everything else.

set -euo pipefail

INPUT=$(cat)

# Extract the bash command
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

if [ -z "$COMMAND" ]; then
  echo '{"decision": "approve"}'
  exit 0
fi

# Only check git commands
if ! echo "$COMMAND" | grep -qE '^\s*git\s'; then
  echo '{"decision": "approve"}'
  exit 0
fi

# Block force push to main/master
if echo "$COMMAND" | grep -qE 'git\s+push\s+.*--force|git\s+push\s+-f'; then
  if echo "$COMMAND" | grep -qE '\b(main|master)\b'; then
    echo '{"decision": "block", "reason": "🛑 Force push to main/master blocked. This is a destructive operation that rewrites shared history. Use a feature branch or git push --force-with-lease instead."}'
    exit 0
  fi
fi

# Block git reset --hard on main/master
if echo "$COMMAND" | grep -qE 'git\s+reset\s+--hard'; then
  BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
  if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
    echo '{"decision": "block", "reason": "🛑 git reset --hard on main/master blocked. This discards commits permanently. Switch to a feature branch first."}'
    exit 0
  fi
fi

# Check commit message format
if echo "$COMMAND" | grep -qE 'git\s+commit'; then
  # Extract commit message from -m "..." or -m '...' (macOS compatible)
  MSG=""
  # Try double quotes first: -m "message here"
  if echo "$COMMAND" | grep -qE '\-m\s+"'; then
    MSG=$(echo "$COMMAND" | sed -n 's/.*-m[[:space:]]*"\([^"]*\)".*/\1/p')
  # Try single quotes: -m 'message here'
  elif echo "$COMMAND" | grep -qE "\-m\s+'"; then
    MSG=$(echo "$COMMAND" | sed -n "s/.*-m[[:space:]]*'\([^']*\)'.*/\1/p")
  # Try heredoc: -m "$(cat <<'EOF'
  elif echo "$COMMAND" | grep -qE '\-m\s+"\$\(cat'; then
    MSG=$(echo "$COMMAND" | sed -n '/^[[:space:]]*[a-z]/p' | head -1 | sed 's/^[[:space:]]*//')
  fi

  if [ -n "$MSG" ]; then
    # Check for conventional commit format: type(scope): description
    # Or: type: description
    if ! echo "$MSG" | head -1 | grep -qE '^(feat|fix|refactor|docs|test|chore|style|perf|build|ci|revert)(\(.+\))?(!)?:\s'; then
      echo "{\"decision\": \"block\", \"reason\": \"📝 Commit message doesn't follow conventional commits format. Expected: type(scope): description. Valid types: feat, fix, refactor, docs, test, chore, style, perf, build, ci, revert. Example: feat(auth): add JWT refresh token rotation\"}"
      exit 0
    fi

    # Check minimum message length (after the type prefix)
    DESC=$(echo "$MSG" | head -1 | sed 's/^[a-z]*\([^)]*\)\?!*:\s*//')
    if [ ${#DESC} -lt 10 ]; then
      echo '{"decision": "block", "reason": "📝 Commit message description is too short (minimum 10 characters). Write a meaningful description of what changed and why."}'
      exit 0
    fi
  fi
fi

# Block branch deletion of main/master
if echo "$COMMAND" | grep -qE 'git\s+branch\s+(-d|-D)\s+(main|master)'; then
  echo '{"decision": "block", "reason": "🛑 Deleting main/master branch blocked. This is almost certainly a mistake."}'
  exit 0
fi

echo '{"decision": "approve"}'
