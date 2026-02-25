---
name: PR Workflow
description: Generates well-structured pull request descriptions, changelogs from git history, and pre-commit checklists. Activates when creating PRs, generating changelogs, or reviewing changes before committing.
version: 1.0.0
---

# PR Workflow

This skill activates when working with pull requests, changelogs, or pre-commit reviews.

## When to Activate

- User asks to create a PR or pull request
- User asks for a PR description or template
- User asks to generate a changelog
- User asks for a pre-commit checklist or review
- You are about to run `gh pr create`

---

## Pull Request Descriptions

When creating a PR, generate a structured description using this template:

```markdown
## Summary
[1-3 bullet points describing WHAT changed and WHY]

## Changes
- [Specific change 1]
- [Specific change 2]
- [Specific change 3]

## How to Test
1. [Step-by-step testing instructions]
2. [Include specific commands or URLs]
3. [Expected behavior/outcome]

## Checklist
- [ ] Tests pass locally
- [ ] No new warnings or errors
- [ ] Documentation updated (if applicable)
- [ ] Breaking changes documented (if applicable)
```

### PR Description Rules

1. **Summary focuses on WHY, not WHAT** — the diff shows what changed, the description explains the motivation
2. **Keep it concise** — 3-5 bullet points in Changes, not a full essay
3. **Include testing steps** — the reviewer should know exactly how to verify
4. **Link related issues** — use `Closes #123` or `Fixes #456` to auto-close issues

### Analyzing Changes for PR Description

Before writing the PR description:
1. Run `git log main..HEAD --oneline` to see all commits in the branch
2. Run `git diff main...HEAD --stat` to see files changed
3. Identify the primary purpose and group related changes
4. Write the summary from the reviewer's perspective

### PR Title

Follow the same format as conventional commits:
```
feat(auth): add OAuth2 login flow
fix(api): handle null payment response
chore: upgrade dependencies to latest
```

Keep under 72 characters. This becomes the merge commit message.

---

## Changelog Generation

When the user asks for a changelog, analyze git history and produce a structured changelog.

### Process

1. Get commits since last tag or specified range:
   ```bash
   git log v1.0.0..HEAD --oneline
   # or
   git log --since="2 weeks ago" --oneline
   ```

2. Group commits by type (feat, fix, chore, etc.)

3. Generate changelog in this format:
   ```markdown
   ## [Unreleased] / [v1.1.0] - YYYY-MM-DD

   ### Added
   - Description of new feature (#PR)
   - Description of another feature (#PR)

   ### Fixed
   - Description of bug fix (#PR)

   ### Changed
   - Description of change (#PR)

   ### Removed
   - Description of removal (#PR)
   ```

### Changelog Rules

1. **User-facing language** — write for users, not developers. "Add dark mode support" not "feat: implement ThemeProvider with context"
2. **One line per change** — merge related commits into single entries
3. **Include PR/issue links** when available
4. **Follow Keep a Changelog format** (keepachangelog.com)
5. **Categories**: Added (feat), Fixed (fix), Changed (refactor, perf), Deprecated, Removed, Security

---

## Pre-Commit Checklist

When the user is about to commit or asks for a review, run through this checklist:

### Quick Check (Always)
- [ ] `git diff --staged` reviewed — changes match intent
- [ ] No debug code left (console.log, print, debugger, TODO hacks)
- [ ] No sensitive data (API keys, passwords, tokens, .env values)
- [ ] Commit message follows conventional format

### Thorough Check (Before Important Commits)
- [ ] Tests pass (`npm test` / `go test` / relevant test command)
- [ ] Linting passes (`npm run lint` / equivalent)
- [ ] Types check (`tsc --noEmit` / equivalent)
- [ ] No unintended file changes (check `git status` for unexpected files)
- [ ] New files have appropriate file headers/licenses
- [ ] Documentation updated for any API/interface changes
- [ ] No merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
- [ ] Dependencies are justified and pinned to specific versions

### When to Flag

Alert the user if you find:
- Files larger than 1MB being committed
- Binary files in the staging area
- `.env`, `credentials`, or files matching secret patterns
- `node_modules/`, `dist/`, or build artifacts
- Merge conflict markers
- `console.log` / `fmt.Println` / `print()` debugging statements
