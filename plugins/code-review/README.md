# 🔧 code-review

> Comprehensive code review toolkit — review patterns (TypeScript, Python, Go), PR review workflow (gh CLI, size guidelines, verdict framework), review checklists (API, React, migration, auth, performance, config), code quality assessment (SOLID, code smells, cyclomatic/cognitive complexity), test review (coverage gaps, anti-patterns, mock audit), and effective review comments (categorization, tone, volume guidelines).

**Category:** Development | **6 skills** | **3 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/code-review
```

## Overview

Comprehensive code review toolkit — review patterns (TypeScript, Python, Go), PR review workflow (gh CLI, size guidelines, verdict framework), review checklists (API, React, migration, auth, performance, config), code quality assessment (SOLID, code smells, cyclomatic/cognitive complexity), test review (coverage gaps, anti-patterns, mock audit), and effective review comments (categorization, tone, volume guidelines). 6 skills, 3 commands, 1 agent. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `code-quality` | When the user asks about code quality |
| `pr-review` | When the user asks to review a pull request |
| `review-checklist` | When the user asks for a code review checklist |
| `review-comments` | When the user asks about writing code review comments |
| `review-patterns` | When the user asks to review code |
| `test-review` | When the user asks to review tests |

## Commands

| Command | Description |
|---------|-------------|
| `/checklist` | Generate a review checklist tailored to the type of code being changed |
| `/pr-review` | Review a pull request — checks code, tests, and provides a structured review |
| `/review` | Review a file or code changes for bugs, security issues, and quality improvements |

## Agents

### code-reviewer
Autonomous code review agent — systematically reviews files and PRs for bugs, security issues, code quality, and test coverage. Provides structured feedback with categorized findings and actionable recommendations.

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
