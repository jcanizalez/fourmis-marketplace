---
name: hooks-check
description: Scan the current project for active Claude Code hooks and verify they are correctly configured
---

# Hooks Check Command

When the user runs `/hooks-check`, analyze the current project's Claude Code hooks setup and report their status.

## Steps

1. **Find hooks configuration**: Look for `hooks/hooks.json` in the current project, and check `.claude-plugin/plugin.json` for any installed plugins that include hooks
2. **Parse hooks.json**: Read and validate the JSON structure. Check that all referenced scripts exist and are executable
3. **Verify scripts**: For each command-type hook, check that:
   - The script file exists at the referenced path
   - The script is executable (`chmod +x`)
   - The script has a valid shebang line (`#!/bin/bash` or similar)
   - The script handles the expected environment variables (`$TOOL_INPUT`, `$TOOL_NAME`)
4. **Check for common issues**:
   - Scripts referencing `jq` but jq not installed
   - Timeouts that seem too low for the script's complexity
   - Matchers that don't match any known tool names
   - Duplicate matchers that could conflict
5. **Report findings**: Present a clear summary table

## Output Format

```
Hooks Status Report
====================

PreToolUse hooks:
  [OK] bash-guard.sh        → Bash        (timeout: 5s)
  [OK] file-protect.sh      → Write|Edit  (timeout: 5s)

PostToolUse hooks:
  [OK] auto-lint.sh         → Write|Edit  (timeout: 30s, async)

SessionStart hooks:
  [OK] project-context.sh   → startup     (timeout: 10s)

Stop hooks:
  [OK] completeness-check   → prompt      (timeout: 15s)

Issues found: 0
```

If issues are found, list them with suggested fixes:

```
Issues found: 2
  [WARN] scripts/my-hook.sh is not executable — run: chmod +x scripts/my-hook.sh
  [ERR]  scripts/missing.sh does not exist — check the path in hooks.json
```

## Rules

- Read file contents to verify, don't just check paths
- Be helpful — suggest the exact fix command for each issue
- If no hooks are configured, explain how to set them up and point to the hooks-toolkit skills
- Check both local project hooks and installed plugin hooks
