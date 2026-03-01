---
name: upgrade
description: Upgrade frameworks and dependencies — analyze breaking changes, generate codemods, create incremental upgrade plans, and verify compatibility
allowed-tools: Read, Write, Glob, Grep, Bash
---

# /upgrade — Framework & Dependency Upgrades

Plan and execute framework upgrades and dependency updates.

## Usage

```
/upgrade                                    # Analyze project for available upgrades
/upgrade <package>                          # Plan upgrade for a specific package
/upgrade --breaking                         # Show only breaking changes
/upgrade --plan                             # Generate step-by-step upgrade plan
```

## Workflow

### Analysis Mode (default)

1. **Scan dependencies**: Read package.json, go.mod, requirements.txt, Cargo.toml
2. **Check versions**: Compare installed vs latest for all dependencies
3. **Categorize risk**: Patch (safe), minor (review), major (breaking changes)
4. **Report**: Prioritized upgrade plan with risk assessment

### Package Mode

1. **Read changelog**: Fetch release notes and migration guides
2. **Find breaking changes**: Parse CHANGELOG, GitHub releases, migration docs
3. **Scan codebase**: Find usage of deprecated/changed APIs
4. **Generate plan**: Step-by-step migration with code changes needed

### Plan Mode

1. **Dependency graph**: Analyze which upgrades need to go together
2. **Order upgrades**: Sequence to avoid conflicts (peer deps, breaking combos)
3. **Estimate effort**: Based on breaking changes × codebase usage
4. **Output**: Ordered upgrade plan with rollback checkpoints

## Output

```markdown
## Upgrade Report

### Summary
- Total dependencies: [N]
- Up to date: [N] ✅
- Patch available: [N] (safe)
- Minor available: [N] (review)
- Major available: [N] ⚠️ (breaking)

### Major Upgrades (Breaking Changes)
| Package | Current | Latest | Breaking Changes | Effort |
|---------|---------|--------|-----------------|--------|
| next | 14.2 | 15.1 | async params, caching | Medium |
| react | 18.3 | 19.0 | forwardRef, Context | Low |

### Recommended Upgrade Order
1. [Package] — [reason for ordering]
2. [Package] — [depends on #1]

### Code Changes Required
- [File]: [specific change needed]
```

## Important

- Always check peer dependency compatibility before upgrading
- Recommend lock file updates (`npm install`, `go mod tidy`) after each upgrade
- Suggest running tests after each major upgrade, not all at once
- For framework upgrades (Next.js, React), recommend incremental migration
- Flag deprecated APIs that will break in the next version
