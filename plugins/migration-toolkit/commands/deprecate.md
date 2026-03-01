---
name: deprecate
description: Plan and manage deprecations — create sunset plans, find deprecated usage in codebase, generate migration guides, and track deprecation timelines
allowed-tools: Read, Write, Glob, Grep, Bash
---

# /deprecate — Deprecation Management

Plan deprecations, track deprecated usage, and manage sunset timelines.

## Usage

```
/deprecate                                  # Scan codebase for deprecated usage
/deprecate plan <feature>                   # Create a sunset plan for a feature/API
/deprecate track                            # Show deprecation timeline and status
/deprecate guide <feature>                  # Generate a migration guide for consumers
```

## Workflow

### Scan Mode (default)

1. **Find annotations**: Search for @deprecated, DeprecationWarning, // Deprecated:
2. **Count usage**: For each deprecated item, find how many call sites exist
3. **Check dates**: Flag deprecations past their removal date
4. **Report**: Deprecated items ranked by usage count and urgency

### Plan Mode

1. **Assess impact**: Find all consumers of the feature/API
2. **Define timeline**: Announce → warn → restrict → sunset → remove
3. **Draft communications**: Changelog entry, migration notice
4. **Output**: Complete sunset plan document

### Track Mode

1. **Read registry**: Load deprecation entries from code/config
2. **Check status**: Compare dates against current date
3. **Report**: Timeline view with overdue, upcoming, and completed deprecations

### Guide Mode

1. **Analyze old vs new**: Compare deprecated API with replacement
2. **Generate examples**: Before/after code for common use cases
3. **Document gotchas**: Edge cases, behavior differences, breaking changes
4. **Output**: Migration guide ready to publish

## Output

```markdown
## Deprecation Scan

### Overdue Removals ❌
| Item | Announced | Remove By | Usage Count |
|------|-----------|-----------|-------------|
| getUser() | 2025-06 | 2026-01 | 12 call sites |

### Active Deprecations ⏳
| Item | Announced | Remove By | Usage Count |
|------|-----------|-----------|-------------|
| /api/v1/users | 2026-01 | 2026-07 | 3 consumers |

### Completed ✅
| Item | Removed | Clean |
|------|---------|-------|
| legacy-auth | 2025-12 | Yes — dead code removed |
```

## Important

- Always provide a clear alternative when deprecating something
- Include code examples in migration guides (before/after)
- Track usage metrics to know when it's safe to remove
- Extend sunset dates if adoption of replacement is below target
- Keep deprecation registry as a single source of truth
