---
description: When the user asks about SQL query optimization, EXPLAIN ANALYZE, database indexes, slow queries, B-tree indexes, GIN indexes, composite indexes, covering indexes, query performance, CTEs, window functions, or materialized views
---

# Query Optimization Patterns

Diagnose and fix slow SQL queries. Covers EXPLAIN ANALYZE interpretation, index strategies, query rewriting, CTEs, window functions, and materialized views for PostgreSQL.

## EXPLAIN ANALYZE — Your Best Tool

```sql
-- Always use EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) for real execution stats
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.*, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at > '2026-01-01'
GROUP BY u.id
ORDER BY order_count DESC
LIMIT 20;
```

### Reading EXPLAIN Output

```
Sort  (cost=1234.56..1234.78 rows=20 width=250) (actual time=45.123..45.130 rows=20 loops=1)
  Sort Key: (count(o.id)) DESC
  Sort Method: top-N heapsort  Memory: 30kB
  ->  HashAggregate  (cost=1200.00..1210.00 rows=1000 width=250) (actual time=40.500..42.100 rows=1000 loops=1)
        Group Key: u.id
        ->  Hash Left Join  (cost=100.00..900.00 rows=5000 width=200) (actual time=5.000..30.000 rows=5000 loops=1)
              Hash Cond: (o.user_id = u.id)
              ->  Seq Scan on orders o  (cost=0.00..500.00 rows=10000 width=16) (actual time=0.010..10.000 rows=10000 loops=1)
              ->  Hash  (cost=80.00..80.00 rows=1000 width=200) (actual time=4.000..4.000 rows=1000 loops=1)
                    ->  Index Scan using idx_users_created_at on users u  (cost=0.42..80.00 rows=1000 width=200) (actual time=0.050..3.000 rows=1000 loops=1)
                          Index Cond: (created_at > '2026-01-01'::timestamptz)
```

### Key Metrics

| Metric | What It Tells You |
|--------|-------------------|
| `cost` | Planner's estimated cost (startup..total) |
| `actual time` | Real execution time in ms (startup..total) |
| `rows` | Expected vs actual row count |
| `loops` | How many times this node executed |
| `Seq Scan` | 🔴 Full table scan — needs index? |
| `Index Scan` | ✅ Using an index |
| `Index Only Scan` | ✅✅ Covered by index (best) |
| `Bitmap Index Scan` | ✅ Index used for filtering, then heap access |
| `Nested Loop` | Good for small result sets |
| `Hash Join` | Good for medium datasets |
| `Merge Join` | Good for large sorted datasets |
| `Sort` | External sort = slow (check `work_mem`) |
| `Buffers: shared hit` | Pages from cache (fast) |
| `Buffers: shared read` | Pages from disk (slow) |

### Red Flags

```sql
-- 🔴 Seq Scan on large table
Seq Scan on users (rows=1000000)
-- Fix: Add index on filtered/joined columns

-- 🔴 Estimated vs actual rows wildly different
(rows=10) (actual rows=100000)
-- Fix: ANALYZE table to update statistics
ANALYZE users;

-- 🔴 Nested Loop with large outer table
Nested Loop (actual rows=1000000 loops=1)
-- Fix: May need better index or different join strategy

-- 🔴 Sort with external disk
Sort Method: external merge Disk: 50MB
-- Fix: Increase work_mem or add index for sort
SET work_mem = '256MB';
```

## Index Strategies

### B-Tree (Default — Most Common)

```sql
-- Single column index
CREATE INDEX idx_users_email ON users (email);

-- Composite index (column order matters!)
-- Supports: WHERE status = 'active' AND created_at > '2026-01-01'
-- Supports: WHERE status = 'active' (leftmost prefix)
-- Does NOT support: WHERE created_at > '2026-01-01' alone
CREATE INDEX idx_orders_status_created ON orders (status, created_at);

-- Rule: put equality columns first, range columns last
-- WHERE status = 'active' AND created_at > X AND total > Y
CREATE INDEX idx_orders_status_created_total ON orders (status, created_at, total);
```

### Covering Index (Index-Only Scan)

```sql
-- Include columns in the index so PostgreSQL never touches the table
-- Query: SELECT id, name, email FROM users WHERE email = 'jane@example.com'
CREATE INDEX idx_users_email_covering ON users (email) INCLUDE (id, name);
-- ✅ Index Only Scan — all data comes from the index
```

### Partial Index (Filtered)

```sql
-- Only index rows that match a condition — smaller, faster index
CREATE INDEX idx_orders_pending ON orders (created_at)
WHERE status = 'pending';
-- Perfect for: SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at

-- Unique on active records only (soft delete compatible)
CREATE UNIQUE INDEX uq_users_email_active ON users (email)
WHERE deleted_at IS NULL;
```

### GIN Index (Full-Text Search, JSONB, Arrays)

```sql
-- Full-text search
CREATE INDEX idx_products_search ON products
USING GIN (to_tsvector('english', name || ' ' || description));

-- Query
SELECT * FROM products
WHERE to_tsvector('english', name || ' ' || description) @@ plainto_tsquery('english', 'wireless headphones');

-- JSONB index (index all keys and values)
CREATE INDEX idx_users_metadata ON users USING GIN (metadata);

-- Query JSONB
SELECT * FROM users WHERE metadata @> '{"plan": "pro"}';

-- Array containment
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);
SELECT * FROM posts WHERE tags @> ARRAY['javascript', 'react'];
```

### Expression Index

```sql
-- Index on computed expression
CREATE INDEX idx_users_lower_email ON users (lower(email));
-- Supports: WHERE lower(email) = 'jane@example.com'

-- Index on date part
CREATE INDEX idx_orders_month ON orders (date_trunc('month', created_at));
-- Supports: WHERE date_trunc('month', created_at) = '2026-03-01'

-- Index on JSONB field
CREATE INDEX idx_users_plan ON users ((metadata->>'plan'));
-- Supports: WHERE metadata->>'plan' = 'pro'
```

## Common Query Patterns (Optimized)

### Pagination (Keyset — Fastest)

```sql
-- ❌ SLOW: OFFSET on large tables
SELECT * FROM products ORDER BY created_at DESC LIMIT 20 OFFSET 10000;
-- Scans 10,020 rows, discards 10,000

-- ✅ FAST: Keyset pagination
SELECT * FROM products
WHERE (created_at, id) < ($1, $2)  -- cursor from previous page
ORDER BY created_at DESC, id DESC
LIMIT 20;
-- Uses index, scans only 20 rows

-- Index to support this
CREATE INDEX idx_products_created_id ON products (created_at DESC, id DESC);
```

### Count with Filter

```sql
-- ❌ SLOW: COUNT(*) scans entire table
SELECT COUNT(*) FROM orders WHERE status = 'pending';

-- ✅ Approximate count (fast, good enough for UI)
SELECT reltuples::bigint AS estimate
FROM pg_class WHERE relname = 'orders';

-- ✅ Exact count with partial index
-- Create: CREATE INDEX idx_orders_pending ON orders (id) WHERE status = 'pending';
SELECT COUNT(*) FROM orders WHERE status = 'pending';
-- Uses index-only scan on the partial index
```

### Batch Updates

```sql
-- ❌ SLOW: Update row by row
UPDATE products SET price = price * 1.1 WHERE category_id = $1;

-- ✅ FAST: Batch with RETURNING
UPDATE products
SET price = price * 1.1, updated_at = now()
WHERE category_id = $1
RETURNING id, name, price;
```

### CTEs (Common Table Expressions)

```sql
-- Readable subqueries with WITH
WITH monthly_revenue AS (
    SELECT
        date_trunc('month', created_at) AS month,
        SUM(total) AS revenue,
        COUNT(*) AS order_count
    FROM orders
    WHERE status = 'delivered'
    GROUP BY date_trunc('month', created_at)
),
monthly_growth AS (
    SELECT
        month,
        revenue,
        order_count,
        LAG(revenue) OVER (ORDER BY month) AS prev_revenue,
        ROUND(
            (revenue - LAG(revenue) OVER (ORDER BY month))
            / NULLIF(LAG(revenue) OVER (ORDER BY month), 0) * 100,
            2
        ) AS growth_pct
    FROM monthly_revenue
)
SELECT * FROM monthly_growth ORDER BY month DESC;
```

### Window Functions

```sql
-- Rank users by order count
SELECT
    u.id,
    u.name,
    COUNT(o.id) AS order_count,
    RANK() OVER (ORDER BY COUNT(o.id) DESC) AS rank,
    DENSE_RANK() OVER (ORDER BY COUNT(o.id) DESC) AS dense_rank,
    PERCENT_RANK() OVER (ORDER BY COUNT(o.id) DESC) AS percentile
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name;

-- Running total
SELECT
    id,
    created_at,
    total,
    SUM(total) OVER (ORDER BY created_at) AS running_total,
    AVG(total) OVER (ORDER BY created_at ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS moving_avg_7
FROM orders;

-- First/last value per group
SELECT DISTINCT ON (user_id)
    user_id, id AS latest_order_id, total, created_at
FROM orders
ORDER BY user_id, created_at DESC;
```

### Materialized Views

```sql
-- Pre-computed query results for expensive aggregations
CREATE MATERIALIZED VIEW mv_product_stats AS
SELECT
    p.id,
    p.name,
    p.category_id,
    COUNT(oi.id) AS times_ordered,
    SUM(oi.quantity) AS total_units_sold,
    AVG(oi.unit_price) AS avg_price,
    SUM(oi.quantity * oi.unit_price) AS total_revenue
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.id
LEFT JOIN orders o ON o.id = oi.order_id AND o.status = 'delivered'
GROUP BY p.id, p.name, p.category_id;

-- Index the materialized view
CREATE UNIQUE INDEX idx_mv_product_stats_id ON mv_product_stats (id);
CREATE INDEX idx_mv_product_stats_revenue ON mv_product_stats (total_revenue DESC);

-- Refresh (run periodically via cron or after bulk operations)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_stats;
-- CONCURRENTLY allows reads during refresh (requires unique index)
```

## Index Monitoring

```sql
-- Find unused indexes (bloat, slow writes)
SELECT
    schemaname || '.' || relname AS table,
    indexrelname AS index,
    idx_scan AS scans,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelname NOT LIKE 'uq_%'  -- Keep unique constraints
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find missing indexes (sequential scans on large tables)
SELECT
    schemaname || '.' || relname AS table,
    seq_scan,
    seq_tup_read,
    idx_scan,
    pg_size_pretty(pg_relation_size(relid)) AS size
FROM pg_stat_user_tables
WHERE seq_scan > 100
AND pg_relation_size(relid) > 10000000  -- > 10MB
ORDER BY seq_tup_read DESC;

-- Table + index sizes
SELECT
    relname AS table,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_size_pretty(pg_relation_size(relid)) AS table_size,
    pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

## Configuration Tuning

```sql
-- Key PostgreSQL settings for query performance
-- (set in postgresql.conf or ALTER SYSTEM)

-- Memory
shared_buffers = '4GB'          -- 25% of system RAM
work_mem = '64MB'               -- Per-operation sort/hash memory
effective_cache_size = '12GB'   -- 75% of system RAM (hint for planner)
maintenance_work_mem = '512MB'  -- For VACUUM, CREATE INDEX, etc.

-- Parallelism
max_parallel_workers_per_gather = 4
max_parallel_workers = 8

-- Planner
random_page_cost = 1.1          -- SSD (default 4.0 is for spinning disk)
effective_io_concurrency = 200  -- SSD

-- Statistics
default_statistics_target = 200 -- More stats = better plans (default 100)
```
