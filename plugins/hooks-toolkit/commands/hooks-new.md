---
name: hooks-new
description: Scaffold a new Claude Code hook — choose the event, type, and matcher, then generate the script and hooks.json entry
arguments:
  - name: event
    description: "Hook event: PreToolUse, PostToolUse, SessionStart, Stop, UserPromptSubmit, PreCompact, Notification"
    required: false
---

# New Hook Scaffold Command

When the user runs `/hooks-new`, interactively guide them through creating a new Claude Code hook.

## Steps

### 1. Choose the Event

If no event argument was provided, ask the user what they want to hook into:

| Event | Best for |
|-------|---------|
| **PreToolUse** | Block or warn before a tool runs (safety guards, file protection) |
| **PostToolUse** | React after a tool runs (linting, logging, notifications) |
| **SessionStart** | Inject context when a session begins (project info, reminders) |
| **Stop** | Verify task completeness before Claude stops |
| **UserPromptSubmit** | Transform or validate user input |

### 2. Choose the Hook Type

Ask which type of hook to create:

- **command** (recommended for most cases) — runs a shell script
- **prompt** — uses LLM reasoning to evaluate
- **agent** — delegates to a full agent with tool access

### 3. Configure the Matcher

For PreToolUse and PostToolUse, ask which tool(s) to match:

- `Bash` — shell commands only
- `Write|Edit` — file modifications
- `Read` — file reads
- `Glob|Grep` — search operations
- `.*` — all tools
- Custom pattern (regex)

### 4. Generate the Hook

Based on choices, generate:

**For command hooks:**
1. Create the script file at `scripts/<hook-name>.sh` with:
   - Proper shebang (`#!/bin/bash`)
   - Input parsing (`$TOOL_INPUT`, `$TOOL_NAME`)
   - Placeholder logic with comments
   - Correct output format for the event type
   - `set -euo pipefail` for safety
2. Make it executable with `chmod +x`
3. Add the entry to `hooks/hooks.json`

**For prompt hooks:**
1. Draft the prompt text with:
   - Clear evaluation criteria
   - Expected JSON response format
   - Appropriate timeout
2. Add the entry to `hooks/hooks.json`

### 5. Test Instructions

After generating, show the user how to test:

```bash
# For command hooks:
export TOOL_NAME="Bash"
export TOOL_INPUT='{"command":"echo hello"}'
./scripts/<hook-name>.sh
echo "Exit code: $?"

# For prompt hooks:
# Start a new Claude session and trigger the event
```

## Rules

- Always create the `hooks/` directory and `hooks.json` if they don't exist
- If `hooks.json` already exists, merge the new hook into the existing structure (don't overwrite)
- Use `${CLAUDE_PLUGIN_ROOT}` for script paths in hooks.json
- Set sensible default timeouts: 5s for PreToolUse, 30s for PostToolUse, 10s for SessionStart, 15s for Stop
- Include helpful comments in generated scripts
- Show the user the generated files and explain each part
