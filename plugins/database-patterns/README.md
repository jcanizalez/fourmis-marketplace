# 🔧 database-patterns

> Production database patterns — schema design (naming, types, constraints, UUIDs, soft deletes, enums, normalization), query optimization (EXPLAIN ANALYZE, B-tree/GIN/partial/covering/composite indexes, CTEs, window functions, materialized views), ORM patterns (Prisma schema/queries/transactions, Drizzle ORM, GORM, SQLx, raw SQL), transactions and locking (ACID, isolation levels, optimistic locking with version columns, pessimistic locking with SELECT FOR UPDATE, advisory locks, deadlock prevention, SKIP LOCKED job queues), connection pooling (pg Pool, pgxpool, pool sizing formulas, PgBouncer, monitoring, graceful shutdown), and data modeling (one-to-many, many-to-many, polymorphic associations, self-referential trees with ltree, JSONB columns, audit logs with triggers, multi-tenancy with RLS).

**Category:** Development | **6 skills** | **3 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/database-patterns
```

## Overview

Production database patterns — schema design (naming, types, constraints, UUIDs, soft deletes, enums, normalization), query optimization (EXPLAIN ANALYZE, B-tree/GIN/partial/covering/composite indexes, CTEs, window functions, materialized views), ORM patterns (Prisma schema/queries/transactions, Drizzle ORM, GORM, SQLx, raw SQL), transactions and locking (ACID, isolation levels, optimistic locking with version columns, pessimistic locking with SELECT FOR UPDATE, advisory locks, deadlock prevention, SKIP LOCKED job queues), connection pooling (pg Pool, pgxpool, pool sizing formulas, PgBouncer, monitoring, graceful shutdown), and data modeling (one-to-many, many-to-many, polymorphic associations, self-referential trees with ltree, JSONB columns, audit logs with triggers, multi-tenancy with RLS). 6 skills, 3 commands, 1 agent. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `connection-pooling` | When the user asks about database connection pooling |
| `data-modeling` | When the user asks about data modeling |
| `orm-patterns` | When the user asks about ORM, Prisma |
| `query-optimization` | When the user asks about SQL query optimization |
| `schema-design` | When the user asks about database schema design |
| `transactions` | When the user asks about database transactions |

## Commands

| Command | Description |
|---------|-------------|
| `/db-scaffold` | Scaffold database schema with migrations for a project |
| `/query-explain` | Analyze and optimize a slow SQL query using EXPLAIN ANALYZE |
| `/schema-review` | Review database schema for design issues — naming, types, constraints, indexes, relationships |

## Agents

### database-expert
Database design and optimization expert — schema design, query optimization, ORMs (Prisma, Drizzle, GORM), transactions, connection pooling, and data modeling for PostgreSQL

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
