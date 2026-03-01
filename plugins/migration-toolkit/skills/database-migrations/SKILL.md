---
description: When the user asks about database migrations, schema changes, ALTER TABLE, adding columns, creating tables, migration rollbacks, ORM migrations (Drizzle, Prisma, TypeORM, Alembic, Goose), or managing database schema evolution safely
---

# Database Migrations

Safe, reversible database schema changes. Covers SQL migrations, ORM tooling, zero-downtime strategies, and rollback patterns for PostgreSQL, MySQL, and SQLite.

## Migration File Structure

### Timestamp-Based Naming

```
migrations/
  20260301_001_create_users_table.sql
  20260301_002_add_email_index.sql
  20260315_001_add_subscription_tier.sql
  20260315_002_drop_is_premium_column.sql
```

### Up/Down Pattern

```sql
-- migrations/20260301_001_create_users_table.sql

-- Up
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_created_at ON users (created_at);

-- Down
DROP TABLE IF EXISTS users;
```

## Common Migration Patterns

### Add a Column (Safe)

```sql
-- Up: Add nullable column first (no lock on reads)
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- Down
ALTER TABLE users DROP COLUMN avatar_url;
```

### Add a NOT NULL Column (Safe Pattern)

**Never** add a NOT NULL column without a default in one step on a large table.

```sql
-- Step 1: Add nullable column
ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(20);

-- Step 2: Backfill existing rows
UPDATE users SET subscription_tier = 'free' WHERE subscription_tier IS NULL;

-- Step 3: Add NOT NULL constraint (after backfill is complete)
ALTER TABLE users ALTER COLUMN subscription_tier SET NOT NULL;
ALTER TABLE users ALTER COLUMN subscription_tier SET DEFAULT 'free';
```

### Rename a Column (Zero-Downtime)

**Don't** rename directly — old code still references the old name.

```sql
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN full_name VARCHAR(255);

-- Step 2: Dual-write (application code writes to both columns)
-- Step 3: Backfill
UPDATE users SET full_name = name WHERE full_name IS NULL;

-- Step 4: Switch reads to new column (deploy code change)
-- Step 5: Drop old column (after all code uses the new name)
ALTER TABLE users DROP COLUMN name;
```

### Add an Index (Non-Blocking)

```sql
-- PostgreSQL: CONCURRENTLY prevents table lock
CREATE INDEX CONCURRENTLY idx_users_subscription ON users (subscription_tier);

-- MySQL: ALGORITHM=INPLACE for online DDL
ALTER TABLE users ADD INDEX idx_subscription (subscription_tier), ALGORITHM=INPLACE, LOCK=NONE;
```

### Change Column Type

```sql
-- Safe: VARCHAR(100) → VARCHAR(255) (widening is safe)
ALTER TABLE users ALTER COLUMN name TYPE VARCHAR(255);

-- Unsafe: VARCHAR(255) → VARCHAR(100) (data may be truncated)
-- Use the add-column-then-migrate pattern instead
```

## ORM Migration Tools

### Drizzle ORM (TypeScript)

```typescript
// drizzle/schema.ts
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  subscriptionTier: varchar('subscription_tier', { length: 20 }).default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

```bash
# Generate migration from schema diff
npx drizzle-kit generate
# Apply migrations
npx drizzle-kit migrate
# Push schema directly (dev only)
npx drizzle-kit push
```

### Prisma (TypeScript)

```prisma
// prisma/schema.prisma
model User {
  id               String   @id @default(uuid())
  email            String   @unique
  name             String
  subscriptionTier String?  @default("free") @map("subscription_tier")
  createdAt        DateTime @default(now()) @map("created_at")

  @@map("users")
}
```

```bash
# Generate migration
npx prisma migrate dev --name add_subscription_tier
# Apply in production
npx prisma migrate deploy
# Reset (dev only)
npx prisma migrate reset
```

### Alembic (Python / SQLAlchemy)

```python
# alembic/versions/20260301_add_subscription.py
def upgrade():
    op.add_column('users', sa.Column('subscription_tier', sa.String(20), nullable=True))
    op.execute("UPDATE users SET subscription_tier = 'free' WHERE subscription_tier IS NULL")
    op.alter_column('users', 'subscription_tier', nullable=False, server_default='free')

def downgrade():
    op.drop_column('users', 'subscription_tier')
```

### Goose (Go)

```sql
-- migrations/20260301_add_subscription.sql

-- +goose Up
ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free';

-- +goose Down
ALTER TABLE users DROP COLUMN subscription_tier;
```

```bash
goose -dir migrations postgres "postgres://..." up
goose -dir migrations postgres "postgres://..." down
```

## Zero-Downtime Migration Strategy

```
1. Deploy code that handles BOTH old and new schema
2. Run migration (add column, create table, add index)
3. Backfill data if needed
4. Deploy code that uses ONLY the new schema
5. Run cleanup migration (drop old columns, remove dual-writes)
```

### Expand-Contract Pattern

| Phase | Schema | Code | Safe? |
|-------|--------|------|-------|
| **Expand** | Add new column/table | Write to both old and new | ✅ |
| **Migrate** | Backfill data | Read from new, write to both | ✅ |
| **Contract** | Drop old column/table | Read/write new only | ✅ |

## Rollback Strategy

| Scenario | Rollback Approach |
|----------|-------------------|
| Added a column | `ALTER TABLE DROP COLUMN` (fast) |
| Dropped a column | ❌ Cannot recover data — use soft delete first |
| Changed data | Restore from backup or run reverse UPDATE |
| Created an index | `DROP INDEX` (fast) |
| Large data migration | Keep old column until verified, then drop |

### Migration with Rollback Script

```sql
-- migrate.sql
BEGIN;
ALTER TABLE orders ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
UPDATE orders SET status = CASE
  WHEN completed_at IS NOT NULL THEN 'completed'
  WHEN cancelled_at IS NOT NULL THEN 'cancelled'
  ELSE 'pending'
END;
COMMIT;

-- rollback.sql
BEGIN;
ALTER TABLE orders DROP COLUMN status;
COMMIT;
```

## Pre-Migration Checklist

- [ ] Migration tested on a copy of production data
- [ ] Rollback script written and tested
- [ ] Migration runs in under 30 seconds (or uses batched approach)
- [ ] No table locks that block reads on large tables
- [ ] Indexes created with `CONCURRENTLY` (PostgreSQL) or `LOCK=NONE` (MySQL)
- [ ] Backfill runs in batches (not a single UPDATE on millions of rows)
- [ ] Application code handles both old and new schema during deploy
- [ ] Monitoring alerts set for slow queries after migration
- [ ] Backup taken before running in production
