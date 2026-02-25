---
name: pr
description: Create a pull request with a well-structured description, testing steps, and checklist
---

# PR Command

When the user runs `/pr`, analyze the branch changes and create a well-structured pull request.

## Arguments

Optional target branch: `/pr` (defaults to main) or `/pr develop`

## Steps

1. **Gather context**:
   - Current branch name: `git branch --show-current`
   - Target branch (default: main): determine from argument or repo convention
   - Commits in branch: `git log <target>..HEAD --oneline`
   - Files changed: `git diff <target>...HEAD --stat`
   - Full diff: `git diff <target>...HEAD` (for understanding the changes)

2. **Analyze changes**:
   - Read through the diff to understand what was done and why
   - Group related changes into logical sections
   - Identify any breaking changes, new dependencies, or configuration changes

3. **Generate PR title**:
   - Follow conventional commit format: `feat(scope): description`
   - Keep under 72 characters
   - If the branch has a single commit, use that message
   - If multiple commits, summarize the overall purpose

4. **Generate PR description** using this structure:
   ```markdown
   ## Summary
   [1-3 sentences: WHAT changed and WHY]

   ## Changes
   - [Grouped list of specific changes]

   ## How to Test
   1. [Step-by-step verification instructions]
   2. [Include commands, URLs, expected outcomes]

   ## Checklist
   - [ ] Tests pass
   - [ ] No new warnings
   - [ ] Documentation updated (if needed)
   - [ ] Breaking changes documented (if any)
   ```

5. **Create PR**:
   - Push branch if not already pushed: `git push -u origin <branch>`
   - Create PR: `gh pr create --title "..." --body "..."`
   - Return the PR URL to the user

## Rules

- The Summary should explain WHY, not just WHAT — the diff shows what changed
- Include concrete testing steps — don't say "test the feature", say exactly how
- Link related issues with `Closes #123` or `Fixes #456`
- If the branch is behind the target, warn the user about potential conflicts
- Always show the proposed title and description before creating, ask for confirmation
- Use HEREDOC for the body to preserve formatting

## Example Flow

```
User: /pr

→ Analyze branch feature/oauth-login (5 commits, 12 files changed)

→ "Here's the PR I'll create:

   Title: feat(auth): add OAuth2 login with Google and GitHub

   Summary:
   Implements OAuth2 authorization code flow with PKCE for Google
   and GitHub providers. Users can now sign in with their existing
   accounts instead of creating a new password.

   Changes:
   - Add OAuth2 provider abstraction (Google, GitHub)
   - Add /auth/callback endpoint for OAuth redirects
   - Add login page UI with provider buttons
   - Store OAuth tokens in encrypted session

   How to Test:
   1. Set GOOGLE_CLIENT_ID and GITHUB_CLIENT_ID in .env
   2. Run the dev server
   3. Click 'Sign in with Google' on the login page
   4. Verify redirect and successful authentication

   Create this PR? (y/n)"
```
