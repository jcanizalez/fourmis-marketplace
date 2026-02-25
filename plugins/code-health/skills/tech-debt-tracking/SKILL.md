---
name: Tech Debt Tracking
description: Finds and categorizes TODO, FIXME, HACK, and XXX markers in codebases. Tracks tech debt patterns, prioritizes cleanup, and generates debt reports. Activates when asked about tech debt, code cleanup, or when the /debt command is used.
version: 1.0.0
---

# Tech Debt Tracking

This skill activates when tracking technical debt, finding cleanup opportunities, or generating debt reports.

## When to Activate

- User asks about tech debt or code cleanup
- User asks to find TODOs, FIXMEs, or HACKs
- User asks "what should I clean up?"
- The `/health` or `/debt` commands are invoked

## Debt Markers

### Standard Markers (scan for these)

| Marker | Meaning | Priority |
|--------|---------|----------|
| `TODO` | Planned work, missing feature | Medium |
| `FIXME` | Known bug or broken behavior | High |
| `HACK` | Temporary workaround | High |
| `XXX` | Dangerous or fragile code | Critical |
| `WARN` / `WARNING` | Potential issue | Medium |
| `TEMP` / `TEMPORARY` | Code meant to be replaced | Medium |
| `DEPRECATED` | Code marked for removal | Low |
| `@ts-ignore` / `@ts-expect-error` | TypeScript type suppression | Medium |
| `nolint` / `//nolint` | Go linter suppression | Medium |
| `# type: ignore` | Python type suppression | Medium |
| `eslint-disable` | ESLint rule suppression | Low-Medium |
| `nosec` | Security linter suppression | High |

### Scanning Process

1. **Find all markers**: Use `Grep` to search across the codebase:
   ```
   Pattern: (TODO|FIXME|HACK|XXX|TEMP|TEMPORARY|@ts-ignore|@ts-expect-error|eslint-disable|nolint|nosec)
   ```

2. **Exclude non-source files**: Skip `node_modules/`, `vendor/`, `.git/`, `dist/`, `build/`, lock files

3. **Parse context**: For each marker, read the surrounding code to understand:
   - What the debt is about
   - Why it was left (if documented)
   - How urgent it is
   - Whether it's still relevant

4. **Categorize**: Group by type and severity

## Debt Categories

### By Nature
- **Missing tests** — Code without test coverage, especially complex logic
- **Type safety gaps** — `any` types, type assertions, disabled type checking
- **Error handling** — Swallowed errors, missing error boundaries, generic catches
- **Hardcoded values** — Magic numbers, inline URLs, hardcoded credentials
- **Missing docs** — Public APIs without documentation
- **Dead code** — Unreachable code, commented-out blocks, unused exports

### By Urgency
- **Critical** — Security implications, data loss risk (`XXX`, `nosec`, `HACK` on auth code)
- **High** — Bugs waiting to happen (`FIXME`, error swallowing, race conditions)
- **Medium** — Planned improvements (`TODO`, type suppressions, missing tests)
- **Low** — Nice to have (deprecated code, style improvements, old comments)

## Report Format

```
## Tech Debt Report

### Summary
- Total markers: X
- Critical: Y | High: Z | Medium: W | Low: V

### Critical Items
1. `src/auth/session.ts:42` — HACK: Session token not validated on refresh
   → Risk: Authentication bypass
   → Fix: Implement token validation middleware

2. `src/api/payment.ts:128` — nosec: SQL query built by string concat
   → Risk: SQL injection
   → Fix: Use parameterized queries

### High Priority
3. `src/services/order.ts:89` — FIXME: Race condition when two users checkout
   → Impact: Double-charging possible
   → Fix: Add distributed lock or optimistic concurrency

### Debt Over Time
If you track these regularly, look for trends:
- Are markers increasing or decreasing?
- Are new HACKs being added faster than old ones are resolved?
- Which areas of the codebase accumulate the most debt?
```

## Actionable Advice

When reporting debt, always include:
1. **File and line number** — so the user can navigate directly
2. **What the risk is** — not just "there's a TODO" but what happens if it's not fixed
3. **Suggested fix** — concrete action, not vague advice
4. **Effort estimate** — "5 min fix" vs "needs architectural change"
5. **Priority recommendation** — what to fix first based on risk and effort
