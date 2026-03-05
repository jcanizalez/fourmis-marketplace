---
description: When the user asks to commit changes, write a commit message, asks about conventional commit format, commit types (feat, fix, refactor, chore), commit scopes, breaking changes in commits, how to write good commit messages, git commit --amend, fixup commits, signed commits, co-authored-by, or commit message best practices
---

# Conventional Commits

This skill activates when writing commit messages. Follow the Conventional Commits specification (conventionalcommits.org).

## When to Activate

- User asks to commit changes
- User asks to write a commit message
- You are about to run `git commit`
- User asks about commit message format

## Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Types (in order of frequency)

| Type | When to Use | Example |
|------|-------------|---------|
| `feat` | A new feature for the user | `feat: add dark mode toggle` |
| `fix` | A bug fix | `fix: resolve login timeout on slow connections` |
| `docs` | Documentation only changes | `docs: add API authentication guide` |
| `refactor` | Code change that neither fixes a bug nor adds a feature | `refactor: extract validation into shared util` |
| `test` | Adding or correcting tests | `test: add unit tests for payment service` |
| `chore` | Maintenance tasks, deps, CI config | `chore: upgrade typescript to 5.4` |
| `style` | Formatting, semicolons, whitespace (not CSS) | `style: fix indentation in auth module` |
| `perf` | Performance improvement | `perf: cache database queries for user lookup` |
| `ci` | CI/CD configuration changes | `ci: add node 22 to test matrix` |
| `build` | Build system or external dependency changes | `build: switch from webpack to vite` |
| `revert` | Reverts a previous commit | `revert: revert "feat: add dark mode toggle"` |

## Rules

1. **Description**: Imperative mood, lowercase, no period at end, max 72 characters
   - Good: `feat: add user avatar upload`
   - Bad: `feat: Added user avatar upload.`

2. **Scope** (optional): Noun describing the section of the codebase
   - `feat(auth): add OAuth2 support`
   - `fix(api): handle null response from payment gateway`
   - Common scopes: `api`, `ui`, `auth`, `db`, `config`, `deps`

3. **Body** (optional): Explain the motivation for the change. Wrap at 72 characters.
   ```
   fix(auth): prevent session fixation on login

   The session ID was not being regenerated after successful
   authentication, allowing an attacker to fixate a session ID
   before the user logs in.
   ```

4. **Breaking Changes**: Add `!` after type/scope, or `BREAKING CHANGE:` footer
   ```
   feat(api)!: change authentication to use JWT tokens

   BREAKING CHANGE: API endpoints now require Bearer token
   instead of session cookies.
   ```

5. **Multi-line commits**: Use a HEREDOC for proper formatting:
   ```bash
   git commit -m "$(cat <<'EOF'
   feat(auth): add OAuth2 login flow

   Implements OAuth2 authorization code flow with PKCE for
   Google and GitHub providers. Stores tokens in encrypted
   session storage.

   Co-Authored-By: kite <kite@fourmis.ai>
   EOF
   )"
   ```

## Choosing the Right Type

Ask yourself:
- Does the user see something new? → `feat`
- Does this fix broken behavior? → `fix`
- Does this change how code works internally without changing behavior? → `refactor`
- Does this only change docs/comments? → `docs`
- Does this only add/change tests? → `test`
- Is this a dependency update, CI change, or other maintenance? → `chore`

## Fixup & Amend Patterns

### Amend the Last Commit

```bash
# Fix the last commit message (not yet pushed)
git commit --amend -m "feat(auth): correct description here"

# Add forgotten files to the last commit
git add forgotten-file.ts
git commit --amend --no-edit    # keeps the existing message
```

**Warning**: Never amend commits that have already been pushed to a shared branch.

### Fixup Commits (for later squashing)

```bash
# Create a fixup targeting a specific commit
git commit --fixup=abc1234

# Later, auto-squash during rebase
git rebase -i --autosquash main
# The fixup commit will be auto-placed after its target with "fixup" action
```

Use fixup when you find a small issue in an earlier commit during a PR review cycle. It keeps the intent clear and auto-squashes cleanly.

## Signed Commits

```bash
# Sign with GPG key (required by some orgs)
git commit -S -m "feat(auth): add OAuth2 login"

# Configure signing globally
git config --global commit.gpgsign true
git config --global user.signingkey YOUR_KEY_ID
```

## Co-Authors

When pair programming or getting help from an AI:

```bash
git commit -m "$(cat <<'EOF'
feat(auth): add login form validation

Co-Authored-By: Partner Name <partner@example.com>
Co-Authored-By: kite <kite@fourmis.ai>
EOF
)"
```

## Analyze Changes Before Committing

Before writing the commit message:
1. Run `git diff --staged` to see what's being committed
2. Identify the primary purpose of the changes
3. Choose the most appropriate type
4. Write a concise, accurate description
5. If changes span multiple concerns, consider splitting into separate commits
