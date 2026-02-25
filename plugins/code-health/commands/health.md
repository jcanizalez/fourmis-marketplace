---
name: health
description: Run a full codebase health check — complexity, dependencies, tech debt, and overall score
---

# Health Command

When the user runs `/health`, perform a comprehensive codebase health analysis and present a scored report.

## Steps

1. **Detect project type**: Look for package.json, go.mod, Cargo.toml, pyproject.toml, etc. to determine the tech stack

2. **Scan for complexity**:
   - Use `Glob` to find all source files (*.ts, *.tsx, *.js, *.go, *.py, *.rs, etc.)
   - Exclude test files, node_modules, vendor, dist, build directories
   - Count total files and lines of code
   - Identify the 5-10 largest/most complex files
   - Check for god files (>500 lines), deeply nested code, long functions

3. **Check dependencies**:
   - Read the dependency manifest (package.json, go.mod, etc.)
   - Count direct vs dev dependencies
   - Run outdated check if CLI tools available (`npm outdated`, etc.)
   - Flag known heavy/deprecated packages

4. **Track tech debt markers**:
   - Search for TODO, FIXME, HACK, XXX, @ts-ignore, eslint-disable, nolint
   - Count and categorize by severity
   - Show the top 5 most critical items with file:line

5. **Assess test coverage**:
   - Look for test files and test directories
   - Compare test file count vs source file count
   - Flag source files with no corresponding test file

6. **Generate health score** (0-100):
   - Start at 100, deduct points for issues:
   - -5 per critical tech debt marker (XXX, nosec)
   - -3 per high-priority marker (FIXME, HACK)
   - -1 per medium marker (TODO, @ts-ignore)
   - -5 per god file (>500 lines)
   - -2 per file exceeding warning thresholds
   - -10 if >30% of dependencies are outdated
   - -10 if test coverage ratio is <0.3 (tests/source files)
   - Minimum score: 0

7. **Present the report** using this format:

```
# Codebase Health Report

## Score: 72/100 ⚠️

### Overview
| Metric | Value |
|--------|-------|
| Source files | 47 |
| Total lines | 12,340 |
| Dependencies | 23 direct, 8 dev |
| Test files | 12 (25% coverage) |
| Tech debt markers | 18 total |

### Complexity (3 files need attention)
| File | Lines | Issues |
|------|-------|--------|
| src/services/user.ts | 523 | God file, 28 functions |
| src/api/routes.ts | 412 | Deep nesting (5 levels) |
| src/utils/helpers.ts | 318 | Catch-all module |

### Dependencies (2 concerns)
- express 4.18 → 5.1 available (major update)
- moment.js installed (consider date-fns or Intl API)

### Tech Debt (18 markers)
- 2 Critical (XXX)
- 4 High (FIXME, HACK)
- 12 Medium (TODO)

Top items:
1. src/auth/session.ts:42 — HACK: token not validated
2. src/api/payment.ts:128 — XXX: SQL concatenation
3. src/services/order.ts:89 — FIXME: race condition

### Recommendations
1. **Split user.ts** — Extract auth, profile, and validation (effort: 1h)
2. **Fix payment SQL** — Use parameterized queries (effort: 15min)
3. **Add tests** — Focus on services/ directory first (effort: 4h)
```

## Scope

- Default: scan the current working directory
- If argument provided: scan that path instead
- Skip binary files, generated files, and third-party code
- Keep the analysis fast — don't read every file in detail, sample the largest/most problematic ones
