# 🔧 hooks-toolkit

> Production-ready Claude Code hooks — bash command safety guards (blocks rm -rf, force push, DROP TABLE), file protection (.

**Category:** Development | **3 skills** | **2 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/hooks-toolkit
```

## Overview

Production-ready Claude Code hooks — bash command safety guards (blocks rm -rf, force push, DROP TABLE), file protection (.env, credentials, SSH keys), auto-lint after edits (ESLint, Prettier, ruff, gofmt), project context injection on session start, and task completeness verification via prompt hook. 3 skills, 2 commands, 1 agent, 5 hooks. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `hook-patterns` | When the user asks about Claude Code hook patterns |
| `prompt-hooks` | When the user asks about prompt-based hooks |
| `writing-hooks` | When the user asks how to write a Claude Code hook |

## Commands

| Command | Description |
|---------|-------------|
| `/hooks-check` | Scan the current project for active Claude Code hooks and verify they are correctly configured |
| `/hooks-new` | Scaffold a new Claude Code hook — choose the event, type, and matcher, then generate the script and hooks.json entry |

## Agents

### hooks-auditor
Autonomous hook auditor — scans the project for Claude Code hooks, verifies configuration, tests scripts, identifies security gaps, and recommends improvements

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
