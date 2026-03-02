---
name: strict-mode
description: Audit a TypeScript project for strict mode migration — check tsconfig flags, find violations, and create a migration plan
arguments:
  - name: path
    description: Path to tsconfig.json (default: ./tsconfig.json)
    required: false
---

# Strict Mode Audit

Audit the TypeScript project at `$ARGUMENTS` (default: `./tsconfig.json`) for strict mode readiness. Analyze the tsconfig configuration and scan the codebase for potential strict mode violations.

## Analysis Steps

### Step 1: Read tsconfig.json

Read the tsconfig at the given path. Check for `extends` and resolve the full config chain.

Report the current state of each strict flag:

| Flag | Status | Recommendation |
|------|--------|---------------|
| `strict` | ✅/❌ | Enables all strict checks — should be `true` |
| `noUncheckedIndexedAccess` | ✅/❌ | Array/object index returns `T \| undefined` |
| `exactOptionalPropertyTypes` | ✅/❌ | Distinguish missing vs undefined properties |
| `noImplicitReturns` | ✅/❌ | All code paths must return |
| `noFallthroughCasesInSwitch` | ✅/❌ | No accidental fall-through |
| `forceConsistentCasingInFileNames` | ✅/❌ | Cross-platform safety |
| `verbatimModuleSyntax` | ✅/❌ | Use `import type` explicitly |
| `isolatedModules` | ✅/❌ | Required for esbuild/swc/Vite |

### Step 2: Scan for Violations

If strict flags are missing, scan the codebase to estimate the migration effort:

1. **`strictNullChecks` violations**: Search for patterns that assume non-null without checking:
   - `.find()` result used without null check
   - `document.getElementById()` without null check
   - Optional properties accessed without `?.`
   - Count affected files and lines

2. **`noImplicitAny` violations**: Search for:
   - Function parameters without type annotations
   - Variables declared without types that can't be inferred
   - `any` return types from untyped dependencies

3. **`strictPropertyInitialization` violations**: Search for:
   - Class properties without initializers or constructor assignments
   - Properties that rely on lifecycle methods for initialization

4. **`noUncheckedIndexedAccess` impact**: Search for:
   - `array[index]` access patterns
   - `object[key]` dynamic access
   - Destructuring from arrays/maps without safety

### Step 3: Migration Plan

Based on the scan, create a prioritized migration plan:

1. **Phase 1 (Quick wins)**: Flags that can be enabled with zero or minimal changes
2. **Phase 2 (Low effort)**: Flags requiring < 20 file changes
3. **Phase 3 (High effort)**: Flags requiring significant refactoring

For each phase, provide:
- Which flags to enable
- Estimated file count affected
- Specific patterns to fix (with examples from the codebase)
- Suggested approach (manual vs codemod)

### Step 4: Recommendations

Check for additional improvements:
- Is `skipLibCheck` enabled? (OK for speed, but hides type errors in .d.ts)
- Is `declaration` enabled for libraries?
- Are path aliases configured?
- Is the `target` appropriate for the runtime?
- Are there any deprecated or conflicting options?

## Output Format

```
## Current Strict Score: X/8

[Table of flags]

## Migration Effort
- Phase 1: ~X files (enable today)
- Phase 2: ~X files (1-2 days)
- Phase 3: ~X files (refactoring sprint)

## Recommended tsconfig.json Changes
[Show the diff]

## Migration Steps
[Prioritized list with specific file patterns to fix]
```
