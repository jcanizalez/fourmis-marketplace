# 📋 git-workflow

> Comprehensive git workflow toolkit — conventional commits, branch naming conventions, PR descriptions, changelog generation, git hooks (Husky, lint-staged, Lefthook), merge conflict resolution, rebasing and recovery (reflog, cherry-pick, stash), and monorepo workflows (CODEOWNERS, selective CI, Changesets).

**Category:** Productivity | **6 skills** | **4 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/git-workflow
```

## Overview

Comprehensive git workflow toolkit — conventional commits, branch naming conventions, PR descriptions, changelog generation, git hooks (Husky, lint-staged, Lefthook), merge conflict resolution, rebasing and recovery (reflog, cherry-pick, stash), and monorepo workflows (CODEOWNERS, selective CI, Changesets). 6 skills, 4 commands, 1 agent. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `branch-strategy` | When the user asks about branch naming conventions |
| `conventional-commits` | When the user asks to commit changes |
| `git-hooks` | When the user asks about git hooks |
| `merge-conflicts` | When the user asks about merge conflicts |
| `monorepo-workflows` | When the user asks about monorepo git workflows |
| `pr-workflow` | When the user asks to create a pull request |

## Commands

| Command | Description |
|---------|-------------|
| `/branch` | Create a properly named git branch following naming conventions |
| `/changelog` | Generate a changelog from git history, grouped by type |
| `/commit` | Stage changes and create a conventional commit with a well-crafted message |
| `/pr` | Create a pull request with a well-structured description, testing steps, and checklist |

## Agents

### git-expert
Autonomous git workflow agent — manages branch strategy, creates conventional commits, resolves merge conflicts, sets up git hooks, handles rebasing and recovery, and configures monorepo workflows

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
