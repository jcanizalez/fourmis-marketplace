---
name: session-check
description: Run a session health check — uncommitted changes, TODO count, test status, and session stats
---

# Session Health Check

Perform a quick health check on the current session. Report on work in progress, potential issues, and session statistics.

## Steps

1. **Git status** — check for uncommitted changes, untracked files
2. **TODO scan** — count TODO/FIXME/HACK markers in recently modified files
3. **Test status** — run the project's test suite and report pass/fail
4. **Session stats** — read `.session-guard/summaries/` for recent session data
5. **Drift check** — compare source file changes vs test file changes

## Output Format

```
## Session Health Check

| Metric | Status | Details |
|--------|--------|---------|
| Uncommitted changes | ⚠️ 3 files | src/api.ts, src/auth.ts, tests/auth.test.ts |
| TODO markers | ✅ 0 found | No incomplete work detected |
| Tests | ✅ PASS | 47/47 passing |
| Source/test balance | ✅ OK | 5 source edits, 3 test edits |
| Last checkpoint | 12 min ago | chore: checkpoint (3 files, 14:30) |

**Status: HEALTHY** — Session is on track. Consider committing the 3 uncommitted files.
```

If any issues found, list specific files and recommended actions.
