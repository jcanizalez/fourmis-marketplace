---
name: pre-deploy
description: Run a comprehensive pre-deployment check on your project — tests, types, secrets, lint, and readiness verification
---

# Pre-Deploy Check

Run a full production readiness check on the current project. Check each category and report results.

## Steps

1. **Identify the project type** — scan for package.json, go.mod, pyproject.toml, Cargo.toml
2. **Run tests** — execute the project's test suite and report pass/fail count
3. **Run type checker** — tsc --noEmit, mypy, go vet (depending on language)
4. **Run linter** — eslint, golangci-lint, ruff (depending on language)
5. **Scan for secrets** — check all staged/modified files for API keys, tokens, private keys
6. **Check for debug code** — scan for console.log, fmt.Println, print() in source files
7. **Check for hardcoded URLs** — localhost, 127.0.0.1, hardcoded IPs in source
8. **Verify .env handling** — confirm .env is in .gitignore, .env.example exists

## Output Format

Present results as a checklist:

```
## Pre-Deploy Report

| Check | Status | Details |
|-------|--------|---------|
| Tests | ✅ PASS | 47 passed, 0 failed |
| Types | ✅ PASS | No type errors |
| Lint | ⚠️ WARN | 3 warnings (non-blocking) |
| Secrets | ✅ PASS | No secrets detected |
| Debug code | ❌ FAIL | 2 console.log in src/api.ts |
| Hardcoded URLs | ✅ PASS | None found |
| .env safety | ✅ PASS | .env in .gitignore |

**Verdict: NOT READY** — Fix debug code in src/api.ts before deploying.
```

If any ❌ FAIL checks are found, list the specific files and line numbers that need fixing.
