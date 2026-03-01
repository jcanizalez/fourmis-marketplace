---
name: migrate
description: Run database migrations, generate migration files, check migration status, and manage schema changes with rollback safety
allowed-tools: Read, Write, Glob, Grep, Bash
---

# /migrate — Database Migration Management

Manage database schema migrations for your project.

## Usage

```
/migrate                                    # Check migration status and pending changes
/migrate generate <name>                    # Generate a new migration file
/migrate up                                 # Run all pending migrations
/migrate down                               # Rollback last migration
/migrate check                              # Verify migration safety (breaking changes, locks)
```

## Workflow

### Status Mode (default)

1. **Detect ORM/tool**: Scan for drizzle, prisma, knex, alembic, goose, or raw SQL migrations
2. **List migrations**: Show applied, pending, and failed migrations
3. **Check schema drift**: Compare migration state to actual database schema
4. **Report**: Migration status with recommendations

### Generate Mode

1. **Analyze change**: Understand what schema change is needed
2. **Generate SQL**: Create up + down migration files
3. **Safety check**: Flag potential issues (data loss, long locks, breaking changes)
4. **Output**: Migration file(s) ready to review and apply

### Check Mode

1. **Parse migration SQL**: Read pending migration files
2. **Flag risks**: Table locks, data loss, NOT NULL without default, index on large table
3. **Suggest alternatives**: Safe patterns (expand-contract, backfill, concurrent index)
4. **Output**: Safety report with recommendations

## Output

```markdown
## Migration Status

### Current State
- Tool: [Drizzle/Prisma/raw SQL]
- Applied: [N] migrations
- Pending: [N] migrations
- Last applied: [migration name] ([date])

### Pending Migrations
| # | Name | Risk | Notes |
|---|------|------|-------|
| 1 | add-user-avatar | ✅ Low | New nullable column |
| 2 | rename-email-column | ⚠️ High | Column rename — needs expand-contract |

### Recommendations
- [Actionable suggestions based on analysis]
```

## Important

- Always generate both UP and DOWN migrations for rollback safety
- Flag ALTER TABLE operations that acquire exclusive locks on large tables
- Recommend expand-contract pattern for breaking schema changes
- Verify NOT NULL columns have defaults before adding
- Check for data-dependent migrations that need backfill scripts
