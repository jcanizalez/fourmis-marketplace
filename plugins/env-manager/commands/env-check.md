---
name: env-check
description: Validate .env against .env.example — find missing variables, check for exposed secrets, and verify config completeness
---

# /env-check — Environment Validation

Audit your environment configuration for missing variables, security issues, and sync problems.

## Usage

```
/env-check                      # Full audit (sync + security + validation)
/env-check sync                 # Compare .env vs .env.example
/env-check security             # Scan for exposed secrets in code
/env-check validate             # Run app's config validation
/env-check --path <dir>         # Check a specific project directory
```

## Examples

```
/env-check
/env-check sync
/env-check security
/env-check --path ./apps/api
```

## Process

1. **sync**: Compare `.env` against `.env.example`
   - Missing from `.env`: variables you need to add
   - Missing from `.env.example`: variables you need to document
   - Also scan code (`process.env.*`, `os.getenv()`, `os.Getenv()`) for undocumented vars
2. **security**: Scan for exposed secrets
   - Check if `.env` is in `.gitignore`
   - Search code for hardcoded secrets (API keys, passwords, tokens)
   - Check git history for committed `.env` files
   - Flag suspicious patterns (AWS keys, Stripe keys, etc.)
3. **validate**: Check if the app's config module validates successfully
   - Run the config validation (Zod, Pydantic, envconfig)
   - Show which variables fail validation and why
4. **Default** (no argument): Run all three checks

## Output Format

```
## Environment Check: [project]

### Sync Status
✅ 15 variables defined in both .env and .env.example
⚠️  2 variables in .env but missing from .env.example:
  - NEW_FEATURE_FLAG
  - REDIS_URL
❌ 1 variable in .env.example but missing from .env:
  - SENTRY_DSN

### Security
✅ .env is in .gitignore
✅ No .env files in git history
⚠️  Possible hardcoded secret found:
  - src/config.ts:15 — API_KEY = "sk_test_..."

### Validation
✅ All required variables present and valid
⚠️  PORT is set to "abc" — expected a number
```

## Notes

- Auto-detects project type (Node.js, Python, Go) for code scanning
- Complements the security-audit plugin for deeper secret scanning
- Works with monorepos — use `--path` for specific apps
