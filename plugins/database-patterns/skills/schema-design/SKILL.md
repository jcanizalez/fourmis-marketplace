---
description: When the user asks about database schema design, table design, normalization, naming conventions, data types, foreign keys, constraints, soft deletes, timestamps, UUIDs, or database column design
---

# Schema Design Patterns

Design clean, maintainable database schemas. Covers naming conventions, data types, primary keys, constraints, normalization, soft deletes, and timestamp patterns for PostgreSQL.

## Naming Conventions

```sql
-- ✅ GOOD: snake_case, plural tables, singular columns
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name  TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    role        TEXT NOT NULL DEFAULT 'user',
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES orders(id),
    product_id  UUID NOT NULL REFERENCES products(id),
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    unit_price  NUMERIC(10, 2) NOT NULL
);

-- ❌ BAD: camelCase, inconsistent, abbreviated
CREATE TABLE User (
    UserID      INT PRIMARY KEY,
    fname       VARCHAR(50),
    e_mail      VARCHAR(100),
    dt_created  DATETIME
);
```

### Naming Rules

| Element | Convention | Example |
|---------|-----------|---------|
| Tables | snake_case, plural | `users`, `order_items` |
| Columns | snake_case, singular | `first_name`, `email` |
| Primary keys | `id` | `id UUID` |
| Foreign keys | `{singular_table}_id` | `user_id`, `order_id` |
| Booleans | `is_` or `has_` prefix | `is_active`, `has_verified` |
| Timestamps | `_at` suffix | `created_at`, `deleted_at` |
| Counts | `_count` suffix | `order_count`, `login_count` |
| Indexes | `idx_{table}_{columns}` | `idx_users_email` |
| Constraints | `chk_{table}_{rule}` | `chk_orders_positive_total` |

## Primary Keys

### UUID vs Auto-Increment

```sql
-- UUID (recommended for most applications)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
-- ✅ No sequential guessing (security)
-- ✅ Generate client-side (offline-first)
-- ✅ Safe for distributed systems (no coordination)
-- ❌ 16 bytes vs 4 bytes (INT) — larger indexes
-- ❌ Random insertion → index fragmentation (mitigated by UUIDv7)

-- Auto-increment (fine for internal/simple apps)
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY
);
-- ✅ Small, fast indexes
-- ✅ Natural ordering
-- ❌ Sequential → enumerable (security risk in URLs)
-- ❌ Problematic in distributed systems

-- UUIDv7 (best of both worlds — time-ordered UUID)
-- Available in PostgreSQL 17+ or via extension
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuidv7()
);
-- ✅ Time-sorted (good index locality)
-- ✅ Globally unique
-- ✅ No coordination needed
```

### Prefixed IDs (Application Layer)

```typescript
// Generate human-readable prefixed IDs
// usr_01H5V6YXRK3PKBZQN8V9MKJ7FW
import { ulid } from "ulid";

function generateId(prefix: string): string {
  return `${prefix}_${ulid().toLowerCase()}`;
}

const userId = generateId("usr");    // usr_01h5v6yxrk...
const orderId = generateId("ord");   // ord_01h5v7abcd...
const invoiceId = generateId("inv"); // inv_01h5v7efgh...

// Store as TEXT in database, map prefix to table
```

## Data Types

```sql
-- Strings
name        TEXT NOT NULL                    -- Variable length, no limit needed
email       TEXT NOT NULL                    -- TEXT is faster than VARCHAR in PostgreSQL
slug        TEXT NOT NULL UNIQUE             -- URL-safe identifier
bio         TEXT                             -- Nullable long text
status      TEXT NOT NULL DEFAULT 'draft'    -- Enum-like (see enum section below)

-- ❌ Avoid VARCHAR(n) in PostgreSQL — TEXT is equivalent performance
-- VARCHAR(255) is a MySQL-ism; PostgreSQL doesn't optimize by length

-- Numbers
quantity    INTEGER NOT NULL CHECK (quantity >= 0)
price       NUMERIC(10, 2) NOT NULL          -- Exact decimal for money
rating      NUMERIC(3, 2) CHECK (rating BETWEEN 0 AND 5.00)
latitude    DOUBLE PRECISION                 -- For coordinates
percentage  NUMERIC(5, 2) CHECK (percentage BETWEEN 0 AND 100)

-- ❌ NEVER use FLOAT/REAL for money — rounding errors
-- 0.1 + 0.2 = 0.30000000000000004 in floating point

-- Boolean
is_active   BOOLEAN NOT NULL DEFAULT true
has_premium BOOLEAN NOT NULL DEFAULT false

-- Timestamps
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()    -- Always use TIMESTAMPTZ (with timezone)
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
deleted_at  TIMESTAMPTZ                            -- Soft delete (nullable)
expires_at  TIMESTAMPTZ                            -- TTL
published_at TIMESTAMPTZ                           -- Nullable = not yet published

-- ❌ Avoid TIMESTAMP WITHOUT TIME ZONE — causes timezone bugs

-- JSON
metadata    JSONB NOT NULL DEFAULT '{}'::jsonb     -- Flexible schema-less data
settings    JSONB NOT NULL DEFAULT '{}'::jsonb
tags        JSONB NOT NULL DEFAULT '[]'::jsonb     -- Array of strings

-- JSONB > JSON (binary storage, indexable, faster queries)

-- Arrays (PostgreSQL-specific)
tags        TEXT[] NOT NULL DEFAULT '{}'            -- Array of text
permissions TEXT[] NOT NULL DEFAULT '{}'
```

## Constraints

```sql
CREATE TABLE products (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL,
    sku         TEXT NOT NULL,
    price       NUMERIC(10, 2) NOT NULL,
    stock       INTEGER NOT NULL DEFAULT 0,
    category_id UUID NOT NULL REFERENCES categories(id),
    status      TEXT NOT NULL DEFAULT 'draft',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unique constraints
    CONSTRAINT uq_products_slug UNIQUE (slug),
    CONSTRAINT uq_products_sku UNIQUE (sku),

    -- Check constraints
    CONSTRAINT chk_products_positive_price CHECK (price >= 0),
    CONSTRAINT chk_products_non_negative_stock CHECK (stock >= 0),
    CONSTRAINT chk_products_valid_status CHECK (status IN ('draft', 'active', 'archived')),

    -- Composite unique (slug unique per category)
    -- CONSTRAINT uq_products_category_slug UNIQUE (category_id, slug)
);

-- Foreign key with ON DELETE behavior
ALTER TABLE order_items
    ADD CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE;  -- Delete items when order is deleted

ALTER TABLE orders
    ADD CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT;  -- Prevent deleting user with orders
```

### ON DELETE Options

| Action | Behavior |
|--------|----------|
| `CASCADE` | Delete child rows when parent is deleted |
| `RESTRICT` | Prevent deletion if children exist (default) |
| `SET NULL` | Set FK to NULL when parent is deleted |
| `SET DEFAULT` | Set FK to default value |
| `NO ACTION` | Like RESTRICT but checked at end of transaction |

## Normalization Quick Guide

```sql
-- 1NF: Atomic values (no arrays, no comma-separated strings)
-- ❌ BAD
CREATE TABLE users (
    id INT,
    phones TEXT  -- "555-0100,555-0101"
);

-- ✅ 1NF
CREATE TABLE user_phones (
    user_id UUID REFERENCES users(id),
    phone TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'mobile',
    PRIMARY KEY (user_id, phone)
);

-- 2NF: No partial dependencies (every non-key column depends on the FULL key)
-- 3NF: No transitive dependencies (non-key columns don't depend on each other)

-- Practical guideline: normalize until it hurts, then denormalize where needed
```

## Soft Deletes

```sql
-- Soft delete pattern
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;

-- Index for fast filtering
CREATE INDEX idx_users_not_deleted ON users (id) WHERE deleted_at IS NULL;

-- Unique constraint that ignores soft-deleted records
CREATE UNIQUE INDEX uq_users_email_active ON users (email) WHERE deleted_at IS NULL;
```

```typescript
// Application layer — always filter soft-deleted records
const activeUsers = await db.query(
  "SELECT * FROM users WHERE deleted_at IS NULL"
);

// Soft delete
await db.query(
  "UPDATE users SET deleted_at = now() WHERE id = $1",
  [userId]
);

// Hard delete (when needed — GDPR)
await db.query("DELETE FROM users WHERE id = $1", [userId]);
```

## Timestamps — Auto-Update

```sql
-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Apply to any table
CREATE TRIGGER trigger_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

## Enum Patterns

```sql
-- Option 1: CHECK constraint (simple, no migration needed for value changes)
status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'archived'))

-- Option 2: PostgreSQL ENUM type (stricter, but migration needed to add values)
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
ALTER TABLE orders ADD COLUMN status order_status NOT NULL DEFAULT 'pending';
-- Adding values: ALTER TYPE order_status ADD VALUE 'refunded' AFTER 'cancelled';
-- ⚠️ Cannot remove values from PostgreSQL enums

-- Option 3: Reference table (most flexible, good for admin-managed values)
CREATE TABLE statuses (
    id TEXT PRIMARY KEY,   -- 'draft', 'active', etc.
    label TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE products ADD COLUMN status_id TEXT REFERENCES statuses(id);

-- Recommendation: CHECK constraint for small fixed sets, reference table for dynamic sets
```

## Schema Template

```sql
-- Standard table template
CREATE TABLE {table_name} (
    -- Primary key
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Business columns
    -- ...

    -- Foreign keys
    -- {related}_id UUID NOT NULL REFERENCES {related_table}(id),

    -- Metadata
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ          -- Only if soft deletes needed
);

-- Auto-update trigger
CREATE TRIGGER trigger_{table_name}_updated_at
    BEFORE UPDATE ON {table_name}
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Indexes (add based on query patterns)
CREATE INDEX idx_{table_name}_{column} ON {table_name} ({column});
```
