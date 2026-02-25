---
name: branch
description: Create a properly named git branch following naming conventions
---

# Branch Command

When the user runs `/branch`, help them create a properly named branch.

## Arguments

The user can optionally provide a description: `/branch add user search` → `feature/add-user-search`

## Steps

1. **Determine purpose**: Ask the user what the branch is for (if not provided as argument)
2. **Select type**: Choose the branch prefix based on purpose:
   - New functionality → `feature/`
   - Bug fix → `fix/`
   - Urgent production fix → `hotfix/`
   - Maintenance/deps → `chore/`
   - Documentation → `docs/`
   - Code restructuring → `refactor/`
   - Tests → `test/`
3. **Generate name**: Convert the description to kebab-case, 2-4 words max
4. **Check current state**: Run `git status` to ensure working directory is clean (or warn about uncommitted changes)
5. **Create branch**: Run `git checkout -b <type>/<name>` from the appropriate base

## Naming Rules

- Lowercase kebab-case only: `feature/add-dark-mode`
- 2-4 words max: descriptive but concise
- Include ticket ID if mentioned: `feature/PROJ-123-user-avatar`
- No personal names, dates, or generic words like "update" or "changes"

## Example Flow

```
User: /branch implement OAuth login

→ "Creating branch for OAuth login implementation.

   Branch: feature/oauth-login
   Base: main (current)

   Creating..."

→ git checkout -b feature/oauth-login
→ "Created and switched to feature/oauth-login"
```

```
User: /branch fix the login timeout bug, ticket GH-456

→ Branch: fix/GH-456-login-timeout
→ git checkout -b fix/GH-456-login-timeout
```
