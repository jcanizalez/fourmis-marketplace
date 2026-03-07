# 📋 session-guard

> Autonomous session management hooks — auto-checkpoints every N edits (git commits), stuck loop detection (repeated errors/commands), TODO/FIXME scanner (blocks session end if stubs remain), session summary generator (stats on stop), and test drift detector (warns when source changes outpace tests).

**Category:** Productivity | **2 skills** | **1 command** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/session-guard
```

## Overview

Autonomous session management hooks — auto-checkpoints every N edits (git commits), stuck loop detection (repeated errors/commands), TODO/FIXME scanner (blocks session end if stubs remain), session summary generator (stats on stop), and test drift detector (warns when source changes outpace tests). Built for Ralph Wiggum loops and long-running autonomous sessions. 2 skills, 1 command, 1 agent, 5 hooks. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `autonomous-patterns` | When the user asks about autonomous coding sessions |
| `session-management` | When the user asks about managing Claude Code sessions |

## Commands

| Command | Description |
|---------|-------------|
| `/session-check` | Run a session health check — uncommitted changes, TODO count, test status, and session stats |

## Agents

### session-monitor
Autonomous session health monitor. Reviews session state, identifies stuck loops, verifies progress, and generates improvement recommendations. Use when sessions are running long or autonomously.

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
