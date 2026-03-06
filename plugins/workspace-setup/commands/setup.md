---
name: setup
description: Detect your project stack and get personalized plugin recommendations from the Fourmis Marketplace
---

# Setup Command

When the user runs `/setup`, analyze their project and provide a personalized onboarding experience.

## Steps

### 1. Detect the Stack

Scan the project root for:

| File/Directory | Indicates |
|---------------|-----------|
| `package.json` | Node.js |
| `tsconfig.json` | TypeScript |
| `go.mod` | Go |
| `pyproject.toml`, `requirements.txt` | Python |
| `Cargo.toml` | Rust |
| `Dockerfile`, `docker-compose.yml` | Docker |
| `.github/workflows/` | GitHub Actions CI/CD |
| `*.tf` | Terraform |

Also check `package.json` dependencies for frameworks:
- `next` → Next.js
- `react` → React
- `express` → Express
- `prisma` → Prisma ORM
- `xstate` → XState

### 2. Check Existing Setup

Look for:
- `CLAUDE.md` — does it exist? Is it comprehensive or thin?
- `.claude/settings.json` — are permissions configured?
- Installed plugins — check `.claude/plugins/` or plugin config

### 3. Generate Recommendations

Based on the detected stack, recommend:

**Plugins to install** — map stack to relevant plugins:
- TypeScript → `typescript-patterns`
- React → `react-patterns`
- Next.js → `nextjs-patterns`
- Go → `go-patterns`
- Express/API → `api-design-patterns`
- Prisma/DB → `database-patterns`
- Docker → `docker-toolkit`
- GitHub Actions → `ci-cd`
- Always → `git-workflow`, `hooks-toolkit`

**CLAUDE.md improvements** — if it exists, suggest additions. If not, offer to create one.

**Settings** — suggest permission rules based on the stack.

### 4. Present the Report

Format as a clear, actionable report:

```
🔍 Workspace Analysis
=====================

Stack: TypeScript, React, Next.js, Prisma
Infra: Docker, GitHub Actions

📦 Recommended Plugins:
  ✓ git-workflow (always recommended)
  ✓ hooks-toolkit (safety guards + auto-lint)
  → typescript-patterns (advanced TS patterns)
  → nextjs-patterns (App Router, RSC, caching)
  → database-patterns (Prisma, queries, migrations)
  → docker-toolkit (Dockerfiles, Compose, debugging)
  → ci-cd (GitHub Actions, deployment)
  → test-gen (unit, integration, E2E testing)

📝 CLAUDE.md: Not found — I can create one for you
⚙️ Settings: No .claude/settings.json — I can set up permissions

Would you like me to:
1. Install recommended plugins
2. Create a CLAUDE.md for this project
3. Set up .claude/settings.json with permissions
4. All of the above
```

### 5. Execute User Choice

If the user asks to proceed:
- **Install plugins**: Run `claude plugin add` for each
- **Create CLAUDE.md**: Generate based on detected stack, existing package.json scripts, README, etc.
- **Create settings.json**: Generate based on stack with sensible defaults

## Rules

- Always explain WHY each plugin is recommended (not just list them)
- Don't install anything without user confirmation
- If CLAUDE.md already exists and is good, say so — don't suggest unnecessary changes
- Keep recommendations focused: 5-8 plugins max, not the entire catalog
- Show install commands so the user can do it manually if preferred
