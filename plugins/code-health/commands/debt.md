---
name: debt
description: Find and list all tech debt markers (TODO, FIXME, HACK, XXX) with severity and context
---

# Debt Command

When the user runs `/debt`, scan the codebase for tech debt markers and present a prioritized list.

## Steps

1. **Scan the codebase** for debt markers using Grep:
   - Pattern: `TODO|FIXME|HACK|XXX|TEMP|TEMPORARY`
   - Also check for: `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, `nolint`, `nosec`, `type: ignore`
   - Exclude: node_modules/, vendor/, .git/, dist/, build/, lock files, binary files

2. **Parse each result**:
   - Extract the file path and line number
   - Read the marker text and any accompanying comment
   - Determine severity based on the marker type

3. **Categorize by severity**:
   - **Critical**: XXX, nosec (security-related)
   - **High**: FIXME, HACK (bugs and workarounds)
   - **Medium**: TODO, @ts-ignore, eslint-disable, nolint (planned work, type gaps)
   - **Low**: TEMP, DEPRECATED (scheduled cleanup)

4. **Present results** grouped by severity:

```
## Tech Debt: 24 markers found

### Critical (2)
1. `src/api/payment.ts:128` — XXX: SQL built with string concatenation
2. `src/auth/middleware.ts:55` — nosec: password comparison timing attack

### High (6)
3. `src/services/order.ts:89` — FIXME: Race condition on concurrent checkout
4. `src/api/upload.ts:34` — HACK: File size check disabled for large uploads
...

### Medium (12)
7. `src/components/Form.tsx:45` — TODO: Add form validation
8. `src/types/user.ts:12` — @ts-ignore: Fix UserProfile type
...

### Low (4)
19. `src/utils/legacy.ts:1` — DEPRECATED: Use newUtils instead
...

### Quick Wins (estimated <15 min each)
- Fix `@ts-ignore` on line 12 of user.ts (add proper type)
- Remove `eslint-disable` on line 88 of api.ts (rule no longer applies)
- Delete commented-out code in helpers.ts (lines 45-67)
```

## Arguments

- `/debt` — scan entire project
- `/debt src/` — scan specific directory
- `/debt critical` — show only critical and high severity
- `/debt fixme` — show only FIXME markers
