# 📋 code-health

> Codebase quality metrics and tech debt tracking.

**Category:** Productivity | **3 skills** | **2 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/code-health
```

## Overview

Codebase quality metrics and tech debt tracking. Analyzes file complexity, outdated dependencies, TODO/FIXME markers, and dead code. Gives your codebase a health score with actionable improvements.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `complexity-analysis` | Analyzes code file complexity when reviewing code |
| `dependency-audit` | Checks project dependencies for outdated packages |
| `tech-debt-tracking` | Finds and categorizes TODO, FIXME |

## Commands

| Command | Description |
|---------|-------------|
| `/debt` | Find and list all tech debt markers (TODO, FIXME, HACK, XXX) with severity and context |
| `/health` | Run a full codebase health check — complexity, dependencies, tech debt, and overall score |

## Agents

### health-auditor
Use this agent for thorough, deep codebase health analysis. Scans file complexity, dependency health, tech debt markers, test coverage gaps, and dead code patterns across the entire project.

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
