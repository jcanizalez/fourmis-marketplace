---
description: When the user asks how to write a Claude Code hook, create a custom hook, build a PreToolUse or PostToolUse script, write a bash hook script, handle TOOL_INPUT and TOOL_NAME, use jq to parse hook input, debug hooks, test hooks locally, set up hooks.json, add hooks to a plugin, or needs a step-by-step guide to building hooks
---

# Writing Claude Code Hooks

Step-by-step guide to writing your own Claude Code hooks from scratch. Covers script structure, input parsing, output format, and testing.

## Quick Start: Your First Hook

### 1. Create the Script

```bash
#!/bin/bash
# scripts/my-guard.sh — PreToolUse hook
# Blocks writes to the build/ directory

FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // .path // empty')

if [[ "$FILE_PATH" == build/* ]] || [[ "$FILE_PATH" == */build/* ]]; then
  echo '{"hookSpecificOutput":{"permissionDecision":"deny","reason":"Cannot write to build/ — this directory is auto-generated"}}'
  exit 2
fi

exit 0
```

### 2. Make It Executable

```bash
chmod +x scripts/my-guard.sh
```

### 3. Register in hooks.json

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/my-guard.sh",
            "timeout": 5,
            "statusMessage": "Checking file permissions..."
          }
        ]
      }
    ]
  }
}
```

### 4. Test Locally

```bash
# Simulate the environment Claude provides
export TOOL_NAME="Write"
export TOOL_INPUT='{"file_path":"build/output.js","content":"test"}'

./scripts/my-guard.sh
echo "Exit code: $?"
# Should print deny JSON and exit 2
```

## Input Parsing with jq

Claude passes tool arguments as JSON in `$TOOL_INPUT`. Use `jq` to extract fields:

```bash
# For Bash tool
COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // empty')

# For Write tool
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty')
CONTENT=$(echo "$TOOL_INPUT" | jq -r '.content // empty')

# For Edit tool
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty')
OLD_STRING=$(echo "$TOOL_INPUT" | jq -r '.old_string // empty')
NEW_STRING=$(echo "$TOOL_INPUT" | jq -r '.new_string // empty')

# For Glob tool
PATTERN=$(echo "$TOOL_INPUT" | jq -r '.pattern // empty')

# For Read tool
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty')
```

**Tip:** Always use `// empty` with jq to handle missing fields gracefully.

## Output Formats

### PreToolUse Output (Blocking)

```bash
# Block (deny silently)
echo '{"hookSpecificOutput":{"permissionDecision":"deny","reason":"Blocked: explanation"}}'
exit 2

# Warn (ask user)
echo '{"hookSpecificOutput":{"permissionDecision":"ask","reason":"This looks risky. Proceed?"}}'
exit 2

# Allow explicitly
echo '{"hookSpecificOutput":{"permissionDecision":"allow"}}'
exit 0

# Allow implicitly (no output needed)
exit 0
```

### PostToolUse Output (Feedback)

```bash
# Add a system message Claude will see
echo '{"systemMessage":"Linted successfully — 0 errors"}'

# No output needed if nothing to report
exit 0
```

### Stop Hook Output (Prompt Type)

Stop hooks use prompt type — the LLM responds with JSON:
```json
{"ok": true}
{"ok": false, "reason": "Tests haven't been run yet"}
```

## Script Template

Use this template as a starting point for any command hook:

```bash
#!/bin/bash
# hook-name.sh — [PreToolUse|PostToolUse] hook
# Purpose: What this hook does
#
# Matcher: [Bash|Write|Edit|Write|Edit|.*]
# Type: command

set -euo pipefail

# --- Parse input ---
TOOL="${TOOL_NAME:-unknown}"
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // .path // empty' 2>/dev/null)
COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // empty' 2>/dev/null)

# --- Your logic here ---


# --- Default: allow ---
exit 0
```

## Multi-Check Pattern

Check multiple conditions in a single hook:

```bash
#!/bin/bash
COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // empty')
BLOCKED=""
REASON=""

# Check 1: Dangerous patterns
if echo "$COMMAND" | grep -qiE 'rm\s+-rf\s+/\s'; then
  BLOCKED=true
  REASON="Destructive command: rm -rf /"
fi

# Check 2: Production access
if echo "$COMMAND" | grep -qiE 'ssh\s+.*prod'; then
  BLOCKED=true
  REASON="Direct production access not allowed"
fi

# Check 3: Secrets in commands
if echo "$COMMAND" | grep -qiE '(api_key|secret|token)=[A-Za-z0-9]{16,}'; then
  BLOCKED=true
  REASON="Possible secret in command arguments"
fi

if [ "$BLOCKED" = "true" ]; then
  echo "{\"hookSpecificOutput\":{\"permissionDecision\":\"deny\",\"reason\":\"$REASON\"}}"
  exit 2
fi

exit 0
```

## Debugging Tips

### Enable Verbose Output

```bash
#!/bin/bash
# Add at the top of your hook for debugging
exec 2>/tmp/hook-debug.log  # redirect stderr to log file
set -x                       # trace all commands
echo "TOOL_NAME=$TOOL_NAME" >&2
echo "TOOL_INPUT=$TOOL_INPUT" >&2
```

### Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| Hook doesn't fire | Wrong matcher | Check tool name matches exactly |
| Script not found | Wrong path | Use `${CLAUDE_PLUGIN_ROOT}/scripts/` |
| Permission denied | Not executable | Run `chmod +x script.sh` |
| jq not found | Missing dependency | Install jq or use grep/sed fallback |
| Timeout | Script too slow | Increase timeout or make script faster |
| JSON parse error | Malformed output | Validate JSON with `echo '...' | jq .` |

### Fallback Without jq

If jq isn't available, use grep/sed:

```bash
# Extract file_path without jq
FILE_PATH=$(echo "$TOOL_INPUT" | grep -oP '"file_path"\s*:\s*"\K[^"]+')

# Extract command without jq
COMMAND=$(echo "$TOOL_INPUT" | grep -oP '"command"\s*:\s*"\K[^"]+')
```

## Testing Checklist

- [ ] Script is executable (`chmod +x`)
- [ ] Script exits 0 for allowed operations
- [ ] Script exits 2 for blocked operations (with valid JSON)
- [ ] JSON output is valid (test with `| jq .`)
- [ ] Script handles missing fields (empty TOOL_INPUT)
- [ ] Script runs within timeout
- [ ] Tested with real tool input samples
