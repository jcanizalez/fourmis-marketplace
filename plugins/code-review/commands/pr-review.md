---
name: pr-review
description: Review a pull request — checks code, tests, and provides a structured review
allowed-tools: Bash
---

# /pr-review — Pull Request Review

Review a pull request end-to-end with structured feedback.

## Usage

```
/pr-review <number>             # Review PR by number
/pr-review <url>                # Review PR by GitHub URL
/pr-review <number> --quick     # Quick check (skim files, major issues only)
/pr-review <number> --security  # Security-focused review
```

## Examples

```
/pr-review 42
/pr-review https://github.com/user/repo/pull/42
/pr-review 42 --quick
/pr-review 42 --security
```

## Process

1. **Fetch PR details** using `gh pr view <number>`
2. **Read the diff** using `gh pr diff <number>`
3. **Check PR metadata**:
   - Title and description clarity
   - PR size (flag if >400 lines)
   - Linked issues
4. **Review each changed file**:
   - Correctness, security, edge cases
   - Apply the appropriate review checklist based on file type
5. **Check for tests**:
   - Are new/changed functions tested?
   - Do existing tests still pass?
6. **Write the review summary** with verdict
7. **Optionally post the review** using `gh pr review`

## Output Format

```markdown
## PR Review: #<number> — <title>

**Size**: S/M/L/XL (<N> files, <N> additions, <N> deletions)
**Verdict**: ✅ Approve / 🔄 Request Changes / 💬 Comment

### Summary
[1-2 sentences on what this PR does]

### What Looks Good
- [positive observations]

### Issues
- 🔴 **[Bug]** description — `file:line`
- 🟠 **[Security]** description — `file:line`
- 🟡 **[Suggestion]** description — `file:line`

### Test Coverage
- [assessment of test coverage for the changes]

### Recommendation
[final recommendation and any follow-up actions]
```

## Notes

- Requires `gh` CLI to be authenticated
- For local file reviews (not PRs), use `/review` instead
- Large PRs (>400 lines) will be flagged with a suggestion to split
