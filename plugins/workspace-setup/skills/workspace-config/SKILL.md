---
description: When the user asks how to configure their Claude Code workspace, set up CLAUDE.md, configure settings.json, organize their project for Claude Code, set up plugin settings, manage Claude Code configuration, optimize their development environment for AI-assisted coding, or asks about CLAUDE.md best practices
---

# Workspace Configuration

Best practices for configuring your Claude Code workspace for maximum productivity. Covers CLAUDE.md, settings, plugin configuration, and project structure.

## CLAUDE.md — Your Project Context

CLAUDE.md is the most important file for Claude Code. It tells Claude about your project, conventions, and preferences.

### Structure

```markdown
# Project Name

## Overview
Brief description of what this project does and its architecture.

## Tech Stack
- Frontend: React 19 + TypeScript + Tailwind CSS
- Backend: Go 1.23 + chi router
- Database: PostgreSQL 16 + pgx
- Infra: Docker + GitHub Actions

## Conventions
- Use conventional commits (feat:, fix:, refactor:, etc.)
- TypeScript: strict mode, no `any`, prefer interfaces over types
- Go: follow standard project layout (cmd/, internal/, pkg/)
- Tests: colocate with source files (*.test.ts, *_test.go)

## Commands
- `npm run dev` — start frontend dev server
- `go run ./cmd/server` — start backend
- `npm test` — run frontend tests
- `go test ./...` — run backend tests

## Important Files
- `src/lib/api.ts` — API client
- `internal/auth/` — authentication logic
- `docker-compose.yml` — local development stack

## Rules
- Never modify .env files directly
- Always run tests before committing
- Use the /commit command for consistent commits
```

### Best Practices

| Practice | Why |
|----------|-----|
| Keep it under 200 lines | Too long = wasted context window |
| List your commands | Claude can run them for you |
| Specify conventions | Prevents style inconsistencies |
| Mention important files | Claude knows where to look |
| State your rules | Prevents unwanted modifications |

### Tiered CLAUDE.md

For larger projects, use a hierarchy:

```
project/
├── CLAUDE.md              # Project-wide context
├── src/
│   └── CLAUDE.md          # Frontend-specific context
├── server/
│   └── CLAUDE.md          # Backend-specific context
└── infra/
    └── CLAUDE.md          # DevOps-specific context
```

Claude merges these based on which directory you're working in.

## settings.json

Project-level Claude Code settings in `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(go test *)",
      "Bash(git *)",
      "Read",
      "Write(src/**)",
      "Edit(src/**)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Write(.env*)",
      "Bash(git push --force*)"
    ]
  }
}
```

### Permission Patterns

| Pattern | Allows |
|---------|--------|
| `Bash(npm run *)` | Any npm script |
| `Write(src/**)` | Write to any file under src/ |
| `Edit(*.ts)` | Edit any TypeScript file |
| `Bash(git *)` | Any git command |
| `Read` | Read any file (no restriction) |

## Plugin Configuration

Many plugins support per-project settings via `.claude/<plugin-name>.local.md`:

```markdown
---
# .claude/hooks-toolkit.local.md
protected_paths:
  - src/generated/
  - prisma/migrations/
lint_command: npm run lint:fix
---

Additional context for hooks-toolkit in this project.
The generated/ directory contains auto-generated Prisma client code.
Migrations should never be modified directly.
```

## Project Setup Checklist

- [ ] Create CLAUDE.md with project overview, stack, conventions, commands
- [ ] Set up `.claude/settings.json` with permission rules
- [ ] Install relevant marketplace plugins for your stack
- [ ] Configure plugin-specific settings in `.claude/*.local.md`
- [ ] Add `hooks-toolkit` for safety guards and auto-linting
- [ ] Set up `git-workflow` for consistent commits and PR workflow
- [ ] Test by starting a new Claude Code session and verifying context loads
