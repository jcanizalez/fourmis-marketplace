---
description: When the user asks how to configure their Claude Code workspace, set up CLAUDE.md, configure settings.json, organize their project for Claude Code, set up plugin settings, manage Claude Code configuration, optimize their development environment for AI-assisted coding, or asks about CLAUDE.md best practices
---

# Workspace Configuration

Best practices for configuring your Claude Code workspace for maximum productivity. Covers CLAUDE.md, settings, plugin configuration, and project structure.

## CLAUDE.md — Your Project Context

CLAUDE.md is the most important file for Claude Code. It tells Claude about your project, conventions, and preferences. Claude reads it automatically at session start.

### Minimal CLAUDE.md (Quick Start)

For small projects, keep it simple:

```markdown
# my-app

Express + PostgreSQL REST API. TypeScript, Prisma ORM.

## Commands
- `npm run dev` — start dev server (port 3000)
- `npm test` — run Jest tests
- `npm run db:migrate` — run Prisma migrations
- `npm run lint` — ESLint + Prettier check

## Conventions
- Conventional commits (feat:, fix:, chore:)
- All routes in src/routes/, services in src/services/
- Tests colocated: src/services/user.test.ts
- Never modify prisma/migrations/ directly — use `prisma migrate dev`
```

This is often enough. Don't over-engineer CLAUDE.md for simple projects.

### Full CLAUDE.md Template

For larger or team projects, include more sections:

```markdown
# Project Name

## Overview
Brief description — what it does, who uses it, high-level architecture.
Example: "B2B SaaS dashboard. Next.js frontend, Go API, PostgreSQL.
Deployed on Vercel (frontend) and Cloud Run (API)."

## Tech Stack
- Frontend: Next.js 15, TypeScript 5.6, Tailwind CSS 4, Zustand
- Backend: Go 1.23, chi router, sqlc
- Database: PostgreSQL 16, Redis (sessions + cache)
- Infra: Docker, GitHub Actions, Terraform (GCP)

## Conventions
- TypeScript: strict mode, no `any`, prefer interfaces over type aliases
- Go: standard project layout (cmd/, internal/, pkg/)
- CSS: Tailwind utility classes, no custom CSS unless unavoidable
- Commits: conventional commits (feat:, fix:, refactor:, docs:, test:)
- Branches: feature/<ticket>-<short-desc>, fix/<ticket>-<short-desc>
- Tests: colocate with source — *.test.ts, *_test.go

## Commands
- `npm run dev` — start Next.js dev server (port 3000)
- `go run ./cmd/api` — start Go API (port 8080)
- `npm test` — run frontend tests (Vitest)
- `go test ./...` — run all Go tests
- `npm run lint` — ESLint + Prettier
- `docker compose up -d` — start full local stack (DB, Redis, API)

## Important Files
- `src/app/layout.tsx` — root layout with providers
- `src/lib/api-client.ts` — typed API client (generated from OpenAPI)
- `cmd/api/main.go` — API entry point
- `internal/auth/` — JWT + session handling
- `docker-compose.yml` — local dev stack
- `terraform/` — infrastructure as code

## Architecture Notes
- API uses repository pattern: handler → service → repository
- Frontend uses server components by default, client only when needed
- Auth: JWT access tokens (15min) + HTTP-only refresh cookie (7d)
- Background jobs: Go workers consuming from Redis queue

## Rules
- Never modify generated files (src/lib/api-client.ts, prisma/generated/)
- Never commit .env files
- Always run tests before pushing
- Database changes require a migration — never modify schema directly
- Frontend: prefer server components, use 'use client' only when necessary
```

### What NOT to Put in CLAUDE.md

| Don't Include | Why |
|---------------|-----|
| Full API documentation | Too long — link to it instead |
| Every file path in the project | Claude discovers these via Read/Glob |
| Copy-pasted README content | Wastes context with marketing text |
| Installation instructions | Claude doesn't need to install your project |
| Long code examples | Keep CLAUDE.md under 200 lines total |
| Obvious language features | "JavaScript uses `const` for constants" — not helpful |

### Tiered CLAUDE.md for Large Projects

For monorepos and large codebases, use directory-scoped CLAUDE.md files. Claude merges them based on your working directory:

```
myapp/
├── CLAUDE.md                  # Project-wide: architecture, shared conventions
├── apps/
│   ├── web/
│   │   └── CLAUDE.md          # Next.js frontend specifics
│   ├── api/
│   │   └── CLAUDE.md          # Go API specifics
│   └── mobile/
│       └── CLAUDE.md          # React Native specifics
├── packages/
│   └── shared/
│       └── CLAUDE.md          # Shared library conventions
└── infra/
    └── CLAUDE.md              # Terraform/K8s specifics
```

**Root CLAUDE.md** — shared context:

```markdown
# myapp (monorepo)

Turborepo monorepo. Apps: web (Next.js), api (Go), mobile (React Native).
Shared packages in packages/. Infrastructure in infra/.

## Conventions (all packages)
- TypeScript strict mode everywhere
- Conventional commits with scope: feat(web):, fix(api):
- PRs require 1 approval + passing CI

## Commands
- `turbo run dev` — start all apps
- `turbo run test` — run all tests
- `turbo run lint` — lint all packages
```

**Subdirectory CLAUDE.md** — scoped context:

```markdown
# apps/api

Go 1.23 REST API. chi router, sqlc for queries, pgx for PostgreSQL.

## Commands
- `go run ./cmd/api` — start server (port 8080)
- `go test ./...` — run tests
- `go generate ./...` — regenerate sqlc queries

## Conventions
- Handler signature: `func(w http.ResponseWriter, r *http.Request)`
- Errors: return domain errors from services, map to HTTP in handlers
- SQL: write raw SQL in queries/, sqlc generates Go code
- Never use ORM — sqlc only
```

When you work in `apps/api/`, Claude sees both the root and the `apps/api/` CLAUDE.md merged together.

### CLAUDE.md by Project Type

**API-Only (Express/Fastify):**
Focus on routes, middleware, error handling, database access patterns.

```markdown
## Key Patterns
- Routes: src/routes/<resource>.ts (one file per resource)
- Middleware: src/middleware/ (auth, validation, error-handler)
- Error handling: throw AppError(code, message) — caught by global handler
- Validation: Zod schemas in src/schemas/, validated in middleware
```

**CLI Tool (Go/Rust):**
Focus on command structure, flags, output format.

```markdown
## Key Patterns
- Commands: cmd/<subcommand>/main.go
- Flags: use cobra, define in init()
- Output: structured JSON with --json flag, human-readable default
- Config: ~/.myapp/config.yaml, loaded via viper
```

**Data Pipeline (Python):**
Focus on dependencies, data flow, testing approach.

```markdown
## Key Patterns
- Pipeline: src/pipeline/<stage>.py (extract, transform, load)
- Models: src/models/ (Pydantic for validation)
- Tests: use pytest fixtures for sample data, mock external APIs
- Run: `python -m src.pipeline.main --stage extract --date 2024-01-01`
```

## settings.json — Permissions & Configuration

Project-level Claude Code settings live in `.claude/settings.json`. This controls what Claude can and cannot do in your project.

### Permission Syntax

```
Tool(pattern)
```

| Pattern | What it matches |
|---------|----------------|
| `Bash(npm run *)` | Any npm script |
| `Bash(go test ./...)` | Exact command match |
| `Write(src/**)` | Write to any file under src/ recursively |
| `Write(*.ts)` | Write to any .ts file in current directory |
| `Edit(src/**/*.ts)` | Edit TypeScript files under src/ |
| `Read` | Read any file (unrestricted) |
| `Bash(docker compose *)` | Any docker compose command |

### Starter Configs

**Node.js/TypeScript project:**

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(npx *)",
      "Bash(git *)",
      "Read",
      "Write(src/**)",
      "Edit(src/**)",
      "Write(tests/**)",
      "Edit(tests/**)"
    ],
    "deny": [
      "Write(.env*)",
      "Bash(rm -rf *)",
      "Bash(git push --force*)",
      "Write(node_modules/**)",
      "Write(dist/**)"
    ]
  }
}
```

**Go project:**

```json
{
  "permissions": {
    "allow": [
      "Bash(go *)",
      "Bash(make *)",
      "Bash(git *)",
      "Read",
      "Write(cmd/**)",
      "Write(internal/**)",
      "Write(pkg/**)",
      "Edit(cmd/**)",
      "Edit(internal/**)",
      "Edit(pkg/**)"
    ],
    "deny": [
      "Write(.env*)",
      "Bash(rm -rf *)",
      "Bash(git push --force*)",
      "Write(vendor/**)"
    ]
  }
}
```

**Monorepo (Turborepo/Nx):**

```json
{
  "permissions": {
    "allow": [
      "Bash(turbo run *)",
      "Bash(npm run *)",
      "Bash(pnpm *)",
      "Bash(git *)",
      "Read",
      "Write(apps/**)",
      "Write(packages/**)",
      "Edit(apps/**)",
      "Edit(packages/**)"
    ],
    "deny": [
      "Write(.env*)",
      "Write(**/node_modules/**)",
      "Write(**/dist/**)",
      "Bash(rm -rf *)",
      "Bash(git push --force*)"
    ]
  }
}
```

### Permission Strategy

**Start permissive, tighten as needed.** Common mistakes:

| Mistake | Problem | Fix |
|---------|---------|-----|
| Denying all Write | Claude can't create files | Allow Write to source directories |
| Not allowing test runners | Claude can't verify changes | `Bash(npm test)`, `Bash(go test *)` |
| Denying all Bash | Claude can't run anything | Allow specific commands you trust |
| No deny rules | Claude can do anything | Deny destructive operations at minimum |

## Plugin Configuration

Plugins can be configured per-project using `.claude/<plugin-name>.local.md`:

```markdown
---
# .claude/hooks-toolkit.local.md
protected_paths:
  - src/generated/
  - prisma/migrations/
  - public/assets/
lint_command: npm run lint:fix
---

Additional context for hooks-toolkit in this project.
The generated/ directory contains auto-generated Prisma client.
Migrations should never be modified — use `prisma migrate dev`.
Assets are managed by the design team.
```

This lets plugins adapt to your project without modifying their source code.

## Workspace Setup Checklist

For a new project, configure in this order:

1. **CLAUDE.md** — project overview, stack, conventions, commands, important files, rules
2. **`.claude/settings.json`** — allow trusted commands, deny destructive operations
3. **Plugins** — install stack-relevant plugins (`/setup` can help)
4. **Plugin config** — add `.claude/*.local.md` for project-specific plugin settings
5. **Hooks** — install `hooks-toolkit` for safety guards (bash-guard, file-protect, auto-lint)
6. **Verify** — start a new Claude Code session and confirm context loads correctly
