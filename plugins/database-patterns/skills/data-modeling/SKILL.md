---
description: When the user asks about data modeling, database relationships, one-to-many, many-to-many, junction tables, polymorphic associations, self-referential tables, JSON columns, audit logs, multi-tenancy, or database entity design
---

# Data Modeling Patterns

Model real-world relationships in your database. Covers one-to-many, many-to-many, polymorphic associations, self-referential structures, JSON columns, audit logs, and multi-tenancy patterns.

## One-to-Many

```sql
-- A user has many orders
CREATE TABLE users (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
);

CREATE TABLE orders (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    total      NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user_id ON orders (user_id);

-- Query: all orders for a user
SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC;
```

## Many-to-Many (Junction Table)

```sql
-- A user can have many roles, a role can belong to many users
CREATE TABLE users (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
);

CREATE TABLE roles (
    id   TEXT PRIMARY KEY,    -- 'admin', 'editor', 'viewer'
    name TEXT NOT NULL
);

-- Junction table (join table, link table)
CREATE TABLE user_roles (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id    TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by UUID REFERENCES users(id),

    PRIMARY KEY (user_id, role_id)
);

-- Query: all roles for a user
SELECT r.* FROM roles r
JOIN user_roles ur ON ur.role_id = r.id
WHERE ur.user_id = $1;

-- Query: all users with a specific role
SELECT u.* FROM users u
JOIN user_roles ur ON ur.user_id = u.id
WHERE ur.role_id = 'admin';
```

### Many-to-Many with Extra Data

```sql
-- Products and categories with display order
CREATE TABLE product_categories (
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_primary  BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (product_id, category_id)
);

-- Tags (simpler — using arrays)
ALTER TABLE posts ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);

-- Query: posts with any of these tags
SELECT * FROM posts WHERE tags && ARRAY['javascript', 'react'];

-- Query: posts with ALL of these tags
SELECT * FROM posts WHERE tags @> ARRAY['javascript', 'react'];
```

## Self-Referential (Trees and Graphs)

### Adjacency List (Simple Parent-Child)

```sql
-- Categories with parent-child hierarchy
CREATE TABLE categories (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name      TEXT NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_categories_parent ON categories (parent_id);

-- Get direct children
SELECT * FROM categories WHERE parent_id = $1 ORDER BY sort_order;

-- Get root categories
SELECT * FROM categories WHERE parent_id IS NULL ORDER BY sort_order;
```

### Recursive CTE (Query Full Tree)

```sql
-- Get full category tree from root
WITH RECURSIVE category_tree AS (
    -- Base case: root node
    SELECT id, name, parent_id, 0 AS depth, name::text AS path
    FROM categories
    WHERE id = $1  -- Start from specific root

    UNION ALL

    -- Recursive: children
    SELECT c.id, c.name, c.parent_id, ct.depth + 1, ct.path || ' > ' || c.name
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT * FROM category_tree ORDER BY path;

-- Get ancestors (breadcrumb)
WITH RECURSIVE ancestors AS (
    SELECT id, name, parent_id, 0 AS depth
    FROM categories
    WHERE id = $1  -- Start from leaf

    UNION ALL

    SELECT c.id, c.name, c.parent_id, a.depth + 1
    FROM categories c
    JOIN ancestors a ON c.id = a.parent_id
)
SELECT * FROM ancestors ORDER BY depth DESC;
```

### Materialized Path (Fast Reads)

```sql
-- Store the full path as a string
CREATE TABLE categories (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name      TEXT NOT NULL,
    parent_id UUID REFERENCES categories(id),
    path      TEXT NOT NULL  -- '/root/electronics/phones/smartphones'
);

CREATE INDEX idx_categories_path ON categories (path);

-- Get all descendants
SELECT * FROM categories WHERE path LIKE '/root/electronics/%';

-- Get depth
SELECT *, (length(path) - length(replace(path, '/', ''))) - 1 AS depth
FROM categories;
```

### ltree Extension (PostgreSQL)

```sql
-- Install ltree extension
CREATE EXTENSION IF NOT EXISTS ltree;

CREATE TABLE categories (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    path ltree NOT NULL
);

CREATE INDEX idx_categories_ltree ON categories USING GIST (path);

-- Data
INSERT INTO categories VALUES (gen_random_uuid(), 'Electronics', 'root.electronics');
INSERT INTO categories VALUES (gen_random_uuid(), 'Phones', 'root.electronics.phones');
INSERT INTO categories VALUES (gen_random_uuid(), 'Smartphones', 'root.electronics.phones.smartphones');

-- Get all descendants of electronics
SELECT * FROM categories WHERE path <@ 'root.electronics';

-- Get direct children
SELECT * FROM categories WHERE path ~ 'root.electronics.*{1}';

-- Get ancestors
SELECT * FROM categories WHERE path @> 'root.electronics.phones.smartphones';
```

## Polymorphic Associations

When multiple tables need to reference the same entity (comments on posts, products, articles).

### Option 1: Separate Foreign Keys

```sql
-- Simple and type-safe, but NULL columns
CREATE TABLE comments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    body       TEXT NOT NULL,
    author_id  UUID NOT NULL REFERENCES users(id),

    -- One FK per commentable type
    post_id    UUID REFERENCES posts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Exactly one must be set
    CONSTRAINT chk_single_parent CHECK (
        (post_id IS NOT NULL)::int +
        (product_id IS NOT NULL)::int +
        (article_id IS NOT NULL)::int = 1
    )
);

-- ✅ Pros: Real FKs, referential integrity, JOIN-friendly
-- ❌ Cons: NULL columns, need ALTER TABLE for new types
```

### Option 2: Discriminated Type + ID

```sql
-- Flexible, but no FK constraint
CREATE TABLE comments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    body          TEXT NOT NULL,
    author_id     UUID NOT NULL REFERENCES users(id),

    -- Polymorphic reference
    commentable_type TEXT NOT NULL,  -- 'post', 'product', 'article'
    commentable_id   UUID NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_valid_type CHECK (commentable_type IN ('post', 'product', 'article'))
);

CREATE INDEX idx_comments_commentable ON comments (commentable_type, commentable_id);

-- Query comments for a post
SELECT * FROM comments WHERE commentable_type = 'post' AND commentable_id = $1;

-- ✅ Pros: No NULL columns, easy to add new types
-- ❌ Cons: No FK constraint (application must enforce integrity)
```

### Option 3: Separate Tables (Cleanest)

```sql
-- One comment table per parent type
CREATE TABLE post_comments (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id   UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    body      TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_reviews (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    author_id  UUID NOT NULL REFERENCES users(id),
    body       TEXT NOT NULL,
    rating     INTEGER CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ✅ Pros: Real FKs, type-specific columns (rating for products)
-- ❌ Cons: More tables, union queries for "all comments by user"
```

## JSON Columns

```sql
-- Flexible metadata without schema changes
CREATE TABLE users (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name     TEXT NOT NULL,
    email    TEXT NOT NULL UNIQUE,
    -- Semi-structured data
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Store anything in metadata
UPDATE users SET metadata = jsonb_build_object(
    'plan', 'pro',
    'company', 'Acme Corp',
    'signup_source', 'referral',
    'features', jsonb_build_array('dark-mode', 'beta-features')
) WHERE id = $1;

-- Query JSONB
SELECT * FROM users WHERE metadata->>'plan' = 'pro';
SELECT * FROM users WHERE metadata @> '{"plan": "pro"}';
SELECT * FROM users WHERE metadata->'features' ? 'dark-mode';

-- Update nested JSONB
UPDATE users SET metadata = jsonb_set(metadata, '{plan}', '"enterprise"') WHERE id = $1;

-- Index for fast JSONB queries
CREATE INDEX idx_users_metadata ON users USING GIN (metadata);
-- OR index specific path
CREATE INDEX idx_users_plan ON users ((metadata->>'plan'));
```

### When to Use JSON vs Columns

| Use JSON | Use Columns |
|----------|-------------|
| Data varies per row | Data is consistent across rows |
| Schema changes frequently | Schema is stable |
| You don't filter/sort by this data | You filter/sort by this data often |
| User-defined fields (settings, metadata) | Business-critical fields (email, status) |
| External API responses | Internal domain data |

## Audit Log

```sql
-- Track all changes to important tables
CREATE TABLE audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name  TEXT NOT NULL,
    record_id   UUID NOT NULL,
    action      TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data    JSONB,
    new_data    JSONB,
    changed_by  UUID REFERENCES users(id),
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address  INET,
    user_agent  TEXT
);

CREATE INDEX idx_audit_table_record ON audit_log (table_name, record_id);
CREATE INDEX idx_audit_changed_at ON audit_log (changed_at);

-- Trigger-based audit (automatic)
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, action, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_data)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD));
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply to any table
CREATE TRIGGER audit_orders
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

## Multi-Tenancy

### Row-Level Security (RLS)

```sql
-- All tenants share the same tables with a tenant_id column
ALTER TABLE orders ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id);
CREATE INDEX idx_orders_tenant ON orders (tenant_id);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: tenants can only see their own data
CREATE POLICY tenant_isolation ON orders
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Set tenant context per request
SET app.tenant_id = 'tenant-uuid-here';
SELECT * FROM orders; -- Only sees this tenant's orders
```

```typescript
// Middleware: set tenant context on each request
app.use(async (req, res, next) => {
  const tenantId = req.headers["x-tenant-id"] || req.user?.tenantId;
  if (!tenantId) return res.status(400).json({ error: "Missing tenant" });

  // Set for this database session
  await pool.query("SET app.tenant_id = $1", [tenantId]);
  next();
});
```

### Schema-Per-Tenant

```sql
-- Each tenant gets their own schema
CREATE SCHEMA tenant_acme;
CREATE TABLE tenant_acme.orders (...);
CREATE TABLE tenant_acme.users (...);

-- Set search path per request
SET search_path TO tenant_acme, public;
SELECT * FROM orders; -- Uses tenant_acme.orders
```

### Comparison

| Approach | Isolation | Complexity | Scalability |
|----------|-----------|------------|-------------|
| **Row-Level (RLS)** | Logical | Low | High (thousands of tenants) |
| **Schema-per-tenant** | Stronger | Medium | Medium (hundreds of tenants) |
| **Database-per-tenant** | Strongest | High | Low (dozens of tenants) |

## Enum + Status Machine

```sql
-- Order status transitions as a state machine
CREATE TABLE order_status_transitions (
    from_status TEXT NOT NULL,
    to_status   TEXT NOT NULL,
    PRIMARY KEY (from_status, to_status)
);

INSERT INTO order_status_transitions VALUES
    ('pending', 'processing'),
    ('processing', 'shipped'),
    ('processing', 'cancelled'),
    ('shipped', 'delivered'),
    ('shipped', 'cancelled'),
    ('delivered', 'refunded');

-- Validate transitions in application
async function updateOrderStatus(orderId: string, newStatus: string) {
  const order = await db.query("SELECT status FROM orders WHERE id = $1", [orderId]);
  const currentStatus = order.rows[0].status;

  const valid = await db.query(
    "SELECT 1 FROM order_status_transitions WHERE from_status = $1 AND to_status = $2",
    [currentStatus, newStatus]
  );

  if (valid.rowCount === 0) {
    throw new Error(`Cannot transition from '${currentStatus}' to '${newStatus}'`);
  }

  await db.query("UPDATE orders SET status = $1 WHERE id = $2", [newStatus, orderId]);
}
```
