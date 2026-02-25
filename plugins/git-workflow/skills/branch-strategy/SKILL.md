---
name: Branch Strategy
description: Enforces consistent branch naming conventions and git branching strategy. Activates when creating branches, discussing branch strategy, or when the user asks about git workflow organization.
version: 1.0.0
---

# Branch Strategy

This skill activates when creating or discussing git branches. It enforces consistent naming and provides guidance on branching strategy.

## When to Activate

- User asks to create a branch
- User asks about branch naming conventions
- User asks about git workflow or branching strategy
- You are about to run `git checkout -b` or `git switch -c`

## Branch Naming Convention

```
<type>/<short-description>
```

### Branch Types

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New feature development | `feature/user-avatar-upload` |
| `fix/` | Bug fixes | `fix/login-timeout` |
| `hotfix/` | Urgent production fixes | `hotfix/payment-null-pointer` |
| `chore/` | Maintenance, deps, CI | `chore/upgrade-typescript` |
| `docs/` | Documentation updates | `docs/api-authentication-guide` |
| `refactor/` | Code restructuring | `refactor/extract-auth-module` |
| `test/` | Test additions/changes | `test/payment-service-coverage` |
| `release/` | Release preparation | `release/v2.1.0` |
| `experiment/` | Experimental/spike work | `experiment/graphql-migration` |

### Naming Rules

1. **Use kebab-case**: `feature/add-dark-mode` not `feature/addDarkMode` or `feature/add_dark_mode`
2. **Keep it short**: 2-4 words max. `fix/login-timeout` not `fix/fix-the-issue-where-login-times-out-after-30-seconds`
3. **No special characters**: Only lowercase letters, numbers, hyphens, and forward slash
4. **Include ticket ID** when available: `feature/PROJ-123-user-avatar` or `fix/GH-456-login-timeout`
5. **No personal names**: `feature/search-api` not `feature/javier-search-api`

### Creating a Branch

When the user asks to create a branch, follow this process:

1. Ask what the branch is for (if not clear)
2. Determine the type prefix
3. Generate a concise kebab-case description
4. Create from the appropriate base branch:
   - Features/refactors → from `main` or `develop`
   - Hotfixes → from `main` or the production branch
   - Release → from `develop`

```bash
# Standard feature branch
git checkout -b feature/user-avatar-upload

# From a specific base
git checkout -b fix/login-timeout origin/main

# With ticket ID
git checkout -b feature/PROJ-123-oauth-integration
```

## Branching Strategy Guidance

### For Small Teams / Solo Projects (Trunk-Based)
- Work on short-lived feature branches off `main`
- Merge back to `main` quickly (1-3 days max)
- Deploy from `main`
- Use feature flags for incomplete work

### For Medium Teams (GitHub Flow)
- `main` is always deployable
- Feature branches for all changes
- Pull requests for code review
- Merge to `main` and deploy

### For Large Teams / Regulated (Git Flow)
- `main` = production
- `develop` = integration
- `feature/*` → `develop`
- `release/*` → `main` + `develop`
- `hotfix/*` → `main` + `develop`

## When Asked About Strategy

Recommend **trunk-based** or **GitHub Flow** unless the user has specific needs for Git Flow. Simpler is better — most teams overcomplicate their branching strategy.
