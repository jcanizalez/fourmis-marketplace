---
name: changelog
description: Generate a changelog from git history, grouped by type
---

# Changelog Command

When the user runs `/changelog`, generate a structured changelog from git commit history.

## Arguments

Optional range specification:
- `/changelog` — all commits since the last tag
- `/changelog v1.0.0` — commits since v1.0.0
- `/changelog 2 weeks` — commits from the last 2 weeks
- `/changelog v1.0.0..v1.1.0` — commits between two tags

## Steps

1. **Determine range**: Find the appropriate commit range
   - Check for tags: `git tag --sort=-version:refname | head -5`
   - If tags exist, default to commits since the last tag
   - If no tags, use last 20 commits or user-specified range
2. **Gather commits**: `git log <range> --oneline --format="%h %s"`
3. **Parse and categorize**: Group commits by conventional commit type
4. **Generate changelog**: Format in Keep a Changelog style
5. **Output**: Display the changelog and offer to save to CHANGELOG.md

## Output Format

```markdown
## [Unreleased] - YYYY-MM-DD

### Added
- Description of new feature (commit-hash)

### Fixed
- Description of bug fix (commit-hash)

### Changed
- Description of change (commit-hash)

### Removed
- Description of removal (commit-hash)
```

## Category Mapping

| Commit Type | Changelog Category |
|-------------|-------------------|
| `feat` | Added |
| `fix` | Fixed |
| `refactor`, `perf` | Changed |
| `revert` | Removed |
| `docs` | Documentation |
| `chore`, `ci`, `build` | Maintenance |
| `test` | (omit from user-facing changelog) |
| `style` | (omit from user-facing changelog) |

## Rules

- Write in **user-facing language**, not developer jargon
- Merge related commits into single entries when they clearly belong together
- Omit test-only and style-only commits from the changelog
- Always include the commit hash for reference
- If commits don't follow conventional format, do your best to categorize them by reading the message
