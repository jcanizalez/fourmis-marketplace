# 📋 workspace-setup

> Smart workspace onboarding for Claude Code — auto-detects your project stack (Node.

**Category:** Productivity | **2 skills** | **2 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/workspace-setup
```

## Overview

Smart workspace onboarding for Claude Code — auto-detects your project stack (Node.js, TypeScript, Go, Python, React, Next.js, Prisma, Docker, Kubernetes, GitHub Actions), recommends relevant marketplace plugins, and configures your workspace. Includes /setup and /plugins commands, a SessionStart hook for automatic stack detection, and a workspace-advisor agent. 2 skills, 2 commands, 1 agent, 1 hook. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `plugin-discovery` | When the user asks what plugins to install |
| `workspace-config` | When the user asks how to configure their Claude Code workspace |

## Commands

| Command | Description |
|---------|-------------|
| `/plugins` | Browse and search the Fourmis Marketplace plugin catalog by category or keyword |
| `/setup` | Detect your project stack and get personalized plugin recommendations from the Fourmis Marketplace |

## Agents

### workspace-advisor
Autonomous workspace advisor — analyzes your project structure, detects tech stack, reviews CLAUDE.md and settings, recommends plugins, and helps configure an optimal Claude Code development environment

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
