---
name: branch
description: Create a properly named git branch following naming conventions
arguments:
  - name: description
    description: "What the branch is for (e.g., 'add user search', 'fix login timeout'). Used to generate the branch name."
    required: false
  - name: ticket
    description: "Optional ticket/issue ID to include (e.g., 'PROJ-123', 'GH-456')"
    required: false
---

# Branch Command

When the user runs `/branch`, help them create a properly named branch.

Examples: `/branch add user search` → `feature/add-user-search`, `/branch fix login timeout GH-456` → `fix/GH-456-login-timeout`

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

## Related

- Use `/commit` to create conventional commits on your new branch
- Use `/pr` to create a pull request when the branch is ready for review
