# 🔧 project-scaffold

> Project scaffolding toolkit — generate production-ready boilerplate for Next.

**Category:** Development | **6 skills** | **3 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/project-scaffold
```

## Overview

Project scaffolding toolkit — generate production-ready boilerplate for Next.js, Express, Go, Python, monorepos, and npm/PyPI libraries. Best-practice project structure, configs, CI, testing, and Docker setup. 6 skills, 3 commands, 1 agent. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `express-api` | When the user asks to scaffold an Express API |
| `go-service` | When the user asks to scaffold a Go service |
| `library-package` | When the user asks to scaffold an npm package or PyPI library |
| `monorepo-setup` | When the user asks to scaffold a monorepo |
| `nextjs-app` | When the user asks to scaffold a Next.js app |
| `python-project` | When the user asks to scaffold a Python project |

## Commands

| Command | Description |
|---------|-------------|
| `/init` | Initialize missing configs in an existing project — add linting, testing, CI, Docker, or TypeScript |
| `/scaffold` | Generate a new project from a template — Next.js, Express, Go, Python, monorepo, or library |
| `/stack` | Analyze the current project's tech stack, dependencies, and suggest improvements |

## Agents

### project-architect
Autonomous project scaffolding agent — analyzes requirements, selects the best tech stack, and generates a complete production-ready project with all configs, CI, Docker, and testing

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
