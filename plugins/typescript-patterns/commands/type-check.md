---
name: type-check
description: Analyze TypeScript code for type safety improvements — find any casts, missing type guards, untyped catches, and loose types
arguments:
  - name: path
    description: File or directory to analyze (default: ./src)
    required: false
---

# Type Check

Analyze the TypeScript code at `$ARGUMENTS` (default: `./src`) for type safety improvements. Search through all `.ts` and `.tsx` files and report findings.

## Analysis Steps

1. **Find the target**: Check the given path. If a directory, scan all `.ts`/`.tsx` files recursively. If a single file, analyze just that file.

2. **Type Assertions (`as` casts)**:
   - Search for `as ` type assertions (excluding `as const`)
   - Flag `as any` and `as unknown` as high priority
   - Suggest type guards or proper narrowing instead
   - Note: `as const` is fine and should NOT be flagged

3. **Non-null Assertions (`!`)**:
   - Search for `!.` and `![` patterns (non-null assertion operator)
   - Suggest optional chaining (`?.`) or proper null checks instead

4. **any / unknown Usage**:
   - Search for `: any` type annotations
   - Search for `// @ts-ignore` and `// @ts-expect-error` without explanations
   - Suggest specific types or `unknown` with narrowing

5. **Untyped Error Handling**:
   - Find `catch (e)` or `catch (error)` blocks
   - Check if the error is narrowed (instanceof, type guard) before use
   - Suggest `unknown` annotation and proper narrowing

6. **Loose Function Signatures**:
   - Functions with implicit `any` parameters
   - Functions with no return type that should have one (exported functions)
   - Callbacks typed as `Function` instead of specific signatures

7. **Missing Discriminants**:
   - Union types used in switch/if without exhaustive checking
   - Objects passed around without discriminant fields

8. **Index Access Without Checks**:
   - Array access like `arr[0]` without `noUncheckedIndexedAccess`
   - Object index access `obj[key]` without undefined handling

## Output Format

Present findings grouped by severity:

🔴 **Critical** (type safety holes):
| File:Line | Issue | Suggestion |
|-----------|-------|------------|

🟡 **Warning** (can be improved):
| File:Line | Issue | Suggestion |
|-----------|-------|------------|

🟢 **Good Patterns Found**: List examples of good type safety patterns in the codebase.

End with a type safety score (e.g., "8/10 — strong typing, fix the 3 `as any` casts") and top 3 improvements.
