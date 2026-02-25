---
name: Complexity Analysis
description: Analyzes code file complexity when reviewing code, auditing projects, or when asked about code quality. Identifies overly complex files, deep nesting, long functions, and suggests refactoring opportunities.
version: 1.0.0
---

# Complexity Analysis

This skill activates when analyzing code quality, reviewing files, or assessing codebase health.

## When to Activate

- User asks about code quality or complexity
- User asks to review or audit the codebase
- User asks "is this code too complex?" or "should I refactor this?"
- The `/health` or `/debt` commands are invoked
- When reviewing a file that shows complexity warning signs

## Complexity Indicators

### File-Level Red Flags

| Indicator | Warning Threshold | Critical Threshold |
|-----------|-------------------|-------------------|
| File length | >300 lines | >500 lines |
| Function/method count | >15 per file | >25 per file |
| Longest function | >50 lines | >100 lines |
| Nesting depth | >3 levels | >5 levels |
| Import count | >15 imports | >25 imports |
| Parameters per function | >4 params | >6 params |

### Code Smell Patterns

When scanning code, flag these patterns:

1. **God files** — Files that do too many unrelated things (>500 lines, many exports, mixed concerns)
2. **Deep nesting** — Callbacks within callbacks, nested conditionals >3 levels
3. **Long parameter lists** — Functions with >4 parameters (suggest using an options object)
4. **Switch/case explosion** — Switch statements with >7 cases (suggest polymorphism or strategy pattern)
5. **Duplicated logic** — Similar code blocks repeated across files (suggest extraction)
6. **Magic numbers/strings** — Hardcoded values without named constants
7. **Excessive comments** — Comments explaining WHAT instead of WHY (code should be self-documenting)
8. **Dead code** — Commented-out blocks, unreachable code, unused variables

## Analysis Process

When performing a complexity analysis:

1. **Identify source directories**: Look for `src/`, `lib/`, `app/`, `pkg/`, `internal/`, or project-specific patterns
2. **Scan files**: Use `Glob` to find source files, `Read` to analyze them
3. **Score each file**: Rate complexity on a simple scale:
   - **Green** (healthy): Under all warning thresholds
   - **Yellow** (attention): Exceeds 1-2 warning thresholds
   - **Red** (needs refactoring): Exceeds any critical threshold or 3+ warning thresholds
4. **Prioritize findings**: Rank files by severity, focusing on most-changed files first (they cause the most developer pain)
5. **Suggest fixes**: For each red/yellow file, provide specific refactoring suggestions

## Report Format

When presenting findings, use this format:

```
## Complexity Report

### Summary
- Files scanned: X
- Healthy (green): Y
- Needs attention (yellow): Z
- Needs refactoring (red): W

### Critical Files
1. `src/services/userService.ts` (RED)
   - 487 lines, 23 functions, max nesting: 5
   - Suggestion: Split into UserAuthService, UserProfileService, UserValidation

2. `src/handlers/api.ts` (RED)
   - 612 lines, 31 exports
   - Suggestion: Split by route group into separate handler files

### Attention Needed
3. `src/utils/helpers.ts` (YELLOW)
   - 312 lines, catch-all utility file
   - Suggestion: Group related utils into domain-specific modules
```

## Language-Specific Notes

- **TypeScript/JavaScript**: Check for `any` types, missing return types, excessive type assertions
- **Go**: Check for error handling ignored (`_ = err`), long function chains, unexported types
- **Python**: Check for mutable default arguments, bare `except:` clauses, global state
- **React**: Check for component file length (>200 lines), prop drilling (>3 levels), excessive useEffect hooks
