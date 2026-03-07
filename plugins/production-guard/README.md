# 🚀 production-guard

> Production readiness hooks — test gates that block session end until tests pass, secret scanning that blocks writes containing API keys and tokens, auto-formatting (prettier/gofmt/black/rustfmt), commit message validation (conventional commits, force-push protection), and async type checking (tsc/mypy/go vet).

**Category:** DevOps | **2 skills** | **1 command** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/production-guard
```

## Overview

Production readiness hooks — test gates that block session end until tests pass, secret scanning that blocks writes containing API keys and tokens, auto-formatting (prettier/gofmt/black/rustfmt), commit message validation (conventional commits, force-push protection), and async type checking (tsc/mypy/go vet). 2 skills, 1 command, 1 agent, 5 hooks. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `ci-pipeline` | When the user asks about CI/CD pipeline configuration |
| `deploy-readiness` | When the user asks if their code is ready to deploy |

## Commands

| Command | Description |
|---------|-------------|
| `/pre-deploy` | Run a comprehensive pre-deployment check on your project — tests, types, secrets, lint, and readiness verification |

## Agents

### production-auditor
Autonomous production readiness auditor. Scans the entire codebase for deployment risks — secret leaks, missing tests, type errors, debug code, hardcoded config, missing error handling, and infrastructure gaps.

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
