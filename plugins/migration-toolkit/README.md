# 🔧 migration-toolkit

> Migration and upgrade toolkit — database schema migrations (SQL, ORM, rollbacks, zero-downtime), dependency updates (semver, changelogs, breaking changes, Dependabot/Renovate), framework upgrades (Next.

**Category:** Development | **6 skills** | **3 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/migration-toolkit
```

## Overview

Migration and upgrade toolkit — database schema migrations (SQL, ORM, rollbacks, zero-downtime), dependency updates (semver, changelogs, breaking changes, Dependabot/Renovate), framework upgrades (Next.js, React, Express, Go, codemods), API versioning (URL/header strategies, deprecation headers, consumer migration), data migrations (ETL, backfills, dual-write, verification), and deprecation management (sunset plans, migration guides, usage tracking). 6 skills, 3 commands, 1 agent. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `api-versioning` | When the user asks about API versioning |
| `data-migrations` | When the user asks about data migrations |
| `database-migrations` | When the user asks about database migrations |
| `dependency-updates` | When the user asks about updating dependencies |
| `deprecation-management` | When the user asks about deprecating code |
| `framework-upgrades` | When the user asks about upgrading frameworks |

## Commands

| Command | Description |
|---------|-------------|
| `/deprecate` | Plan and manage deprecations — create sunset plans, find deprecated usage in codebase, generate migration guides, and track deprecation timelines |
| `/migrate` | Run database migrations, generate migration files, check migration status, and manage schema changes with rollback safety |
| `/upgrade` | Upgrade frameworks and dependencies — analyze breaking changes, generate codemods, create incremental upgrade plans, and verify compatibility |

## Agents

### migration-engineer
Autonomous migration and upgrade agent — plans database migrations, upgrades frameworks and dependencies, manages API versioning, executes data migrations, and handles deprecation lifecycles

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
