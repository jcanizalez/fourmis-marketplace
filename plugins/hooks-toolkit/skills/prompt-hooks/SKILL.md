---
description: When the user asks about prompt-based hooks, LLM hooks, Stop hooks, task completeness checks, using AI to evaluate tool calls, prompt hook format, how prompt hooks work, agent-type hooks, prompt vs command hooks, when to use prompt hooks, smart hooks, or AI-powered hook decisions
---

# Prompt-Based Hooks

Guide to writing hooks that use LLM reasoning instead of shell scripts. Prompt hooks are ideal for nuanced decisions that require understanding context, not just pattern matching.

## When to Use Prompt Hooks

| Use Prompt Hooks When | Use Command Hooks When |
|----------------------|----------------------|
| Decision requires understanding context | Check is a simple pattern match |
| Evaluating code quality or completeness | Checking file paths or command flags |
| Need reasoning about intent | Need deterministic yes/no |
| Checking semantic meaning | Checking string patterns |

## Stop Hook: Task Completeness

The most common prompt hook. Fires when Claude is about to stop responding.

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Review the conversation and determine if the user's request has been fully addressed.\n\nCheck:\n1. Was the original request completed?\n2. Were there any errors that weren't resolved?\n3. If tests were mentioned, were they run?\n4. If a commit was requested, was it made?\n\nRespond with JSON only:\n- Complete: {\"ok\": true}\n- Incomplete: {\"ok\": false, \"reason\": \"what's still missing\"}",
            "timeout": 15
          }
        ]
      }
    ]
  }
}
```

### How It Works

1. Claude is about to send its final response
2. The Stop hook fires, passing conversation context to a separate LLM call
3. The LLM evaluates completeness and responds with `{ok: true/false}`
4. If `ok: false`, Claude continues working on the missing items
5. If `ok: true`, Claude stops normally

## Prompt Hook Response Format

### For Stop Hooks

```json
{"ok": true}
```

```json
{"ok": false, "reason": "The user asked for tests but none were run"}
```

### Key Rules

- Response must be valid JSON
- `ok` field is required (boolean)
- `reason` field is required when `ok` is false
- Keep the prompt focused — the LLM has limited context

## Advanced Patterns

### Pattern: Code Review on Commit

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "The user is about to run a bash command. If it's a git commit, review the staged changes (available in context) for:\n1. Debug code (console.log, print statements)\n2. Commented-out code blocks\n3. TODO/FIXME markers\n4. Obvious security issues\n\nIf issues found, respond: {\"ok\": false, \"reason\": \"Found: [issues]\"}\nIf clean, respond: {\"ok\": true}",
            "timeout": 20
          }
        ]
      }
    ]
  }
}
```

### Pattern: Smart File Protection

```json
{
  "type": "prompt",
  "prompt": "A file is about to be modified. Evaluate if this modification is safe.\n\nConsider:\n- Is this a configuration file that could break the build?\n- Are the changes consistent with the user's stated goal?\n- Could this change have unintended side effects?\n\nRespond: {\"ok\": true} or {\"ok\": false, \"reason\": \"...\"}",
  "timeout": 15
}
```

### Pattern: Completeness for Specific Workflows

```json
{
  "type": "prompt",
  "prompt": "The user asked for a feature implementation. Before stopping, verify:\n1. Code was written and saved to files\n2. Types/interfaces are properly defined\n3. Error handling is present\n4. At least basic tests exist\n5. No placeholder/TODO code remains\n\nRespond: {\"ok\": true} or {\"ok\": false, \"reason\": \"Missing: [items]\"}",
  "timeout": 20
}
```

## Writing Effective Prompts

### Do

- Be specific about what to check
- Use numbered criteria for clarity
- Specify the exact JSON response format
- Keep prompts under 500 words
- Test with various conversation scenarios

### Don't

- Make prompts too vague ("check if things look good")
- Include too many criteria (pick the top 3-5)
- Forget to specify the response format
- Set unrealistically short timeouts
- Rely on prompt hooks for deterministic checks (use command hooks instead)

## Prompt Hook vs Agent Hook

| Feature | Prompt Hook | Agent Hook |
|---------|-------------|------------|
| Complexity | Single evaluation | Multi-step with tools |
| Speed | Fast (one LLM call) | Slower (agent loop) |
| Tool access | No | Yes (Read, Bash, etc.) |
| Best for | Judgment calls | Complex verification |
| Timeout | 10-20s | 30-120s |

### When to Use Agent Hooks

Agent hooks delegate to a full agent with tool access:

```json
{
  "type": "agent",
  "agent": "${CLAUDE_PLUGIN_ROOT}/agents/verify-agent.md",
  "timeout": 60
}
```

Use when you need to:
- Read files to verify changes
- Run commands to check output
- Perform multi-step verification
- Access external resources

## Combining Prompt + Command Hooks

Use command hooks for fast, deterministic checks and prompt hooks for nuanced evaluation:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/bash-guard.sh",
            "timeout": 5
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Verify the task is complete...",
            "timeout": 15
          }
        ]
      }
    ]
  }
}
```

This gives you the best of both worlds: fast safety guards with intelligent completeness checks.
