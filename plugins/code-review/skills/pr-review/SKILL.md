# PR Review

Pull request review workflow — how to review PRs systematically, what to check, and how to provide actionable feedback.

## When to Activate

When the user asks to:
- Review a pull request
- Check a PR before merging
- Provide feedback on a PR
- Assess if a PR is ready to merge

## PR Review Workflow

### Step 1: Understand the Context
- Read the PR title and description
- Check linked issues or tickets
- Understand the "why" before looking at the "what"
- Review the PR size — flag if too large (>400 lines is a lot)

### Step 2: Review the Diff
```bash
# See what changed
git diff main...feature-branch

# Or with gh CLI
gh pr diff <number>

# File-by-file review
gh pr diff <number> --name-only
```

### Step 3: Run the Code
```bash
# Checkout the branch
gh pr checkout <number>

# Run tests
npm test      # or pytest, go test, etc.

# Run linter
npm run lint

# Try the feature locally if applicable
```

### Step 4: Review by Priority

| Priority | Check | Status |
|----------|-------|--------|
| 1 | Does it solve the stated problem? | |
| 2 | Are there correctness bugs? | |
| 3 | Are security concerns addressed? | |
| 4 | Are edge cases handled? | |
| 5 | Is error handling appropriate? | |
| 6 | Are there performance issues? | |
| 7 | Is code readable and maintainable? | |
| 8 | Are tests included and adequate? | |
| 9 | Does it follow project conventions? | |
| 10 | Is documentation updated if needed? | |

### Step 5: Provide Verdict

| Verdict | When | Action |
|---------|------|--------|
| ✅ **Approve** | All checks pass, minor nits only | Merge when ready |
| 🔄 **Request changes** | Bugs, security issues, missing tests | Author must fix |
| 💬 **Comment** | Questions, suggestions, non-blocking | Discussion needed |

## PR Size Guidelines

| Size | Lines Changed | Ideal Review Time |
|------|--------------|-------------------|
| XS | 1-10 | 5 min |
| S | 11-50 | 10 min |
| M | 51-200 | 20-30 min |
| L | 201-400 | 30-60 min |
| XL | 400+ | ⚠️ Suggest splitting |

Large PRs have higher defect rates. If a PR is >400 lines, suggest splitting into:
- Refactoring PR (no behavior change)
- Feature PR (new functionality)
- Test PR (test additions)

## What to Check in Different PR Types

### Feature PR
- Does the implementation match the requirements?
- Are all acceptance criteria met?
- Are tests covering the new behavior?
- Is the API/interface well-designed?
- Are there backward compatibility concerns?

### Bug Fix PR
- Is the root cause identified?
- Does the fix address the root cause (not just symptoms)?
- Is there a regression test that would have caught the bug?
- Could this bug exist elsewhere in similar code?

### Refactoring PR
- Is behavior preserved? (Tests should NOT change)
- Is the code actually simpler/cleaner?
- Are there incremental improvements (not rewriting everything)?
- Is the scope focused (not mixing refactoring with features)?

### Dependency Update PR
- What changed in the dependency? (Changelog/release notes)
- Are there breaking changes?
- Is the version pinned appropriately?
- Do all tests pass with the new version?
- Are there security advisories for the current version?

## Using gh CLI for Reviews

```bash
# List open PRs
gh pr list

# View PR details
gh pr view <number>

# See PR diff
gh pr diff <number>

# Checkout PR locally
gh pr checkout <number>

# Review with comment
gh pr review <number> --comment --body "Looks good overall. A few suggestions..."

# Approve
gh pr review <number> --approve --body "LGTM! Clean implementation."

# Request changes
gh pr review <number> --request-changes --body "Please fix the error handling in auth.ts"

# Add inline comment
gh pr comment <number> --body "**src/auth.ts line 42**: This should validate the token expiration."
```
