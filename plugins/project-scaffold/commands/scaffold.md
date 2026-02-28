---
name: scaffold
description: Generate a new project from a template — Next.js, Express, Go, Python, monorepo, or library
allowed-tools: Read, Write, Bash, Glob, Grep
---

# /scaffold — Project Generator

Scaffold a new project with production-ready boilerplate.

## Usage

```
/scaffold                     # Interactive — ask what to build
/scaffold nextjs my-app       # Next.js app
/scaffold express my-api      # Express REST API
/scaffold go my-service       # Go HTTP service
/scaffold python my-project   # Python project (CLI or FastAPI)
/scaffold monorepo my-mono    # Turborepo monorepo
/scaffold library my-lib      # Publishable npm/PyPI package
```

## Workflow

1. **Determine the stack**: Parse arguments or ask the user what they want to build
2. **Choose the project name**: Use the provided name or ask
3. **Ask for variants** (if applicable):
   - Next.js: with database? with auth? with tRPC?
   - Express: with database? with JWT auth? with WebSocket?
   - Go: with PostgreSQL? with gRPC? with Redis?
   - Python: CLI or FastAPI? with database? with Celery?
   - Monorepo: which apps? (web, api, docs)
   - Library: npm or PyPI?
4. **Generate all files**: Use the corresponding skill templates
5. **Initialize git**: `git init` + initial commit
6. **Install dependencies**: Run the appropriate package manager
7. **Verify**: Run the dev server or tests to confirm everything works

## Output

After scaffolding, provide:
- Summary of all generated files
- How to run the project (`npm run dev`, `make dev`, `uv run serve`)
- Suggested next steps (add database, set up auth, deploy, etc.)

## Important

- Always create a `.env.example` with documented variables
- Always include a `.gitignore` appropriate for the stack
- Always include a `README.md` with setup instructions
- Always include a CI workflow (`.github/workflows/ci.yml`)
- Use the latest stable versions of all dependencies
- Follow each stack's conventions and best practices
