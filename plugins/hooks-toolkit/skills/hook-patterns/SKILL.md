---
description: When the user asks about Claude Code hook patterns, hook event types, PreToolUse hooks, PostToolUse hooks, SessionStart hooks, Stop hooks, hook matchers, hookSpecificOutput, permissionDecision, blocking tool calls, async hooks, command hooks, prompt hooks, agent hooks, HTTP hooks, hook exit codes, how to structure hooks.json, or hook best practices
---

# Claude Code Hook Patterns

Comprehensive reference for all Claude Code hook events, types, and patterns. Use this to understand how hooks work and pick the right pattern for your use case.

## Hook Events Overview

| Event | When it fires | Can block? | Common use |
|-------|--------------|------------|------------|
| `PreToolUse` | Before a tool executes | Yes (deny/ask) | Safety guards, validation |
| `PostToolUse` | After a tool executes | No (feedback only) | Linting, notifications, logging |
| `SessionStart` | When a session begins | No | Context injection, setup |
| `Stop` | Before Claude stops responding | Yes (continue) | Completeness checks |
| `UserPromptSubmit` | When user sends a message | Yes (transform) | Input sanitization |
| `PreCompact` | Before context compaction | No | Save state before compact |
| `Notification` | On agent notifications | No | External alerting |
| `SubagentStart` | When a subagent launches | No | Subagent monitoring |
| `SubagentStop` | When a subagent finishes | No | Subagent result handling |

## Hook Types

### Command Hooks (Most Common)

Run a shell script. Best for file checks, git operations, and system-level validation.

```json
{
  "type": "command",
  "command": "${CLAUDE_PLUGIN_ROOT}/scripts/my-hook.sh",
  "timeout": 10,
  "statusMessage": "Running check..."
}
```

**Environment variables available:**
- `$TOOL_NAME` — the tool being called (e.g., "Bash", "Write", "Edit")
- `$TOOL_INPUT` — JSON string of tool arguments
- `$SESSION_ID` — current session identifier
- `$CLAUDE_PLUGIN_ROOT` — absolute path to the plugin directory

**Exit codes:**
- `0` = allow (no issues found)
- `2` = block (with JSON output for reason/decision)

### Prompt Hooks

Use an LLM to evaluate context. Best for nuanced decisions that need reasoning.

```json
{
  "type": "prompt",
  "prompt": "Evaluate whether this is complete. Respond with JSON: {\"ok\": true} or {\"ok\": false, \"reason\": \"...\"}",
  "timeout": 15
}
```

### Agent Hooks

Delegate to a full agent with tool access. Best for complex multi-step checks.

```json
{
  "type": "agent",
  "agent": "${CLAUDE_PLUGIN_ROOT}/agents/my-agent.md",
  "timeout": 60
}
```

### HTTP Hooks

Call an external API. Best for remote validation or logging.

```json
{
  "type": "http",
  "url": "https://api.example.com/validate",
  "method": "POST",
  "timeout": 10
}
```

## PreToolUse Patterns

PreToolUse fires before any tool call. Use it to block or warn.

### Pattern: Block Dangerous Commands

```bash
#!/bin/bash
# Exit 0 = allow, Exit 2 = block
COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // empty')

if echo "$COMMAND" | grep -qE 'rm\s+-rf\s+/'; then
  echo '{"hookSpecificOutput":{"permissionDecision":"deny","reason":"Blocked: rm -rf / is not allowed"}}'
  exit 2
fi
exit 0
```

### Pattern: Warn (Ask User)

```bash
if echo "$COMMAND" | grep -qE 'git\s+reset\s+--hard'; then
  echo '{"hookSpecificOutput":{"permissionDecision":"ask","reason":"This will discard uncommitted changes. Proceed?"}}'
  exit 2
fi
```

### Pattern: File Protection

```bash
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // .path // empty')

case "$FILE_PATH" in
  *.env|*credentials*|*secret*)
    echo '{"hookSpecificOutput":{"permissionDecision":"deny","reason":"Protected file: sensitive data"}}'
    exit 2
    ;;
esac
exit 0
```

### Decision Types

| Decision | Effect |
|----------|--------|
| `"deny"` | Block silently, tool is not executed |
| `"ask"` | Show reason to user, let them decide |
| `"allow"` | Explicitly allow (skip further checks) |

## PostToolUse Patterns

PostToolUse fires after a tool completes. It cannot block — only provide feedback.

### Pattern: Auto-lint After File Edit

```bash
#!/bin/bash
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty')
EXT="${FILE_PATH##*.}"

case "$EXT" in
  ts|tsx|js|jsx)
    npx eslint --fix "$FILE_PATH" 2>/dev/null
    echo "{\"systemMessage\":\"Auto-linted $FILE_PATH\"}"
    ;;
esac
```

### Pattern: Async Background Task

Set `"async": true` in hooks.json for long-running tasks:

```json
{
  "type": "command",
  "command": "${CLAUDE_PLUGIN_ROOT}/scripts/auto-lint.sh",
  "timeout": 30,
  "async": true
}
```

Async hooks run in the background — Claude continues working without waiting.

## SessionStart Patterns

Inject context at the start of every session.

### Pattern: Project Context

```bash
#!/bin/bash
echo "=== Project Context ==="
BRANCH=$(git branch --show-current 2>/dev/null)
echo "Branch: $BRANCH"
echo "Last commit: $(git log --oneline -1 2>/dev/null)"
echo "Stack: $([ -f package.json ] && echo 'Node.js') $([ -f go.mod ] && echo 'Go')"
```

## Stop Patterns

Stop hooks decide whether Claude should keep working or finish.

### Pattern: Completeness Check (Prompt)

```json
{
  "type": "prompt",
  "prompt": "Check if the task is complete. If yes: {\"ok\": true}. If not: {\"ok\": false, \"reason\": \"what's missing\"}",
  "timeout": 15
}
```

## Matchers

Matchers control which tool triggers a hook:

```json
{"matcher": "Bash"}           // Only Bash tool
{"matcher": "Write|Edit"}     // Write OR Edit tool
{"matcher": ".*"}             // Any tool
// No matcher = fires for all tools
```

## hooks.json Structure

```json
{
  "description": "What these hooks do",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "...", "timeout": 5 }
        ]
      }
    ],
    "PostToolUse": [...],
    "SessionStart": [...],
    "Stop": [...]
  }
}
```

## Best Practices

- **Keep hooks fast** — timeout of 5-10s for PreToolUse, 30s max for async PostToolUse
- **Use exit 0 for pass, exit 2 for block** — other exit codes are treated as errors
- **Use `async: true` for non-blocking hooks** — linting, logging, notifications
- **Use prompt hooks for judgment calls** — completion checks, code review
- **Use command hooks for deterministic checks** — file paths, command patterns
- **Always provide a `reason`** — helps the user understand why something was blocked
- **Test hooks locally** — run scripts manually with sample TOOL_INPUT before deploying
