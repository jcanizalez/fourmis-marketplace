# Database Exploration

Expert guidance for exploring, understanding, and querying databases. Activate when the user works with SQLite or PostgreSQL databases.

## When to Activate

Activate when the user:
- Wants to explore or understand a database schema
- Needs help writing SQL queries
- Asks about database structure, relationships, or data
- Mentions "database", "SQL", "schema", "tables", "query"

## Exploration Workflow

### Step 1: Connect
```
db_connect(type: "sqlite", connection: "/path/to/database.db")
db_connect(type: "postgresql", connection: "postgresql://user:pass@host:5432/dbname")
```

### Step 2: Discover
1. `db_list_tables` — See what tables exist
2. `db_stats` — Get row counts and table sizes
3. `db_relationships` — Understand how tables connect

### Step 3: Understand
1. `db_describe_table` — See columns, types, constraints, indexes
2. `db_sample` — Preview actual data
3. `db_schema` — Get full CREATE TABLE statements

### Step 4: Query
1. `db_query` — Run read-only SELECT queries
2. `db_export_csv` — Export results for further analysis

## SQL Query Patterns

### Exploration Queries

| Goal | SQL Pattern |
|------|-------------|
| Row count | `SELECT COUNT(*) FROM table_name` |
| Distinct values | `SELECT DISTINCT column FROM table_name ORDER BY column` |
| Value distribution | `SELECT column, COUNT(*) FROM table_name GROUP BY column ORDER BY COUNT(*) DESC` |
| Null analysis | `SELECT COUNT(*) - COUNT(column) as nulls FROM table_name` |
| Date range | `SELECT MIN(date_col), MAX(date_col) FROM table_name` |
| Recent records | `SELECT * FROM table_name ORDER BY created_at DESC LIMIT 10` |

### Join Patterns

```sql
-- Inner join (matching records only)
SELECT a.*, b.name
FROM orders a
JOIN customers b ON a.customer_id = b.id

-- Left join (all from left, matching from right)
SELECT a.*, b.name
FROM orders a
LEFT JOIN customers b ON a.customer_id = b.id

-- Self join (hierarchical data)
SELECT child.name, parent.name as parent_name
FROM categories child
LEFT JOIN categories parent ON child.parent_id = parent.id
```

### Aggregation Patterns

```sql
-- Summary stats
SELECT
  COUNT(*) as total,
  AVG(amount) as avg_amount,
  SUM(amount) as total_amount,
  MIN(amount) as min_amount,
  MAX(amount) as max_amount
FROM orders

-- Group by with having
SELECT customer_id, COUNT(*) as order_count
FROM orders
GROUP BY customer_id
HAVING COUNT(*) > 5
ORDER BY order_count DESC

-- Window functions (PostgreSQL)
SELECT *,
  ROW_NUMBER() OVER (PARTITION BY category ORDER BY created_at DESC) as rn
FROM products
```

## SQLite vs PostgreSQL Differences

| Feature | SQLite | PostgreSQL |
|---------|--------|------------|
| Types | Dynamic (any type in any column) | Strict type system |
| Booleans | 0/1 integers | true/false |
| Dates | Text (ISO 8601) or Unix timestamp | DATE, TIMESTAMP types |
| JSON | json_extract(), json_each() | ->>, jsonb operators |
| Auto-increment | INTEGER PRIMARY KEY | SERIAL or GENERATED |
| Case sensitivity | Case-insensitive by default | Case-sensitive |
| PRAGMA | Supported (table_info, etc.) | Not available |
| Arrays | Not supported | ARRAY type supported |
| Full-text search | FTS5 extension | tsvector/tsquery |

## Common Tasks

### Understanding a New Database
1. Connect and list tables
2. Check stats for table sizes
3. View relationships to understand the data model
4. Describe key tables (largest, most connected)
5. Sample data from important tables
6. Dump full schema for documentation

### Data Quality Check
```sql
-- Find tables with no rows
-- (check stats output for zero-row tables)

-- Find columns that are always NULL
SELECT 'column_name' as col,
       COUNT(*) - COUNT(column_name) as null_count,
       COUNT(*) as total_count
FROM table_name

-- Find duplicate values
SELECT column, COUNT(*) as cnt
FROM table_name
GROUP BY column
HAVING COUNT(*) > 1
ORDER BY cnt DESC

-- Find orphaned foreign keys
SELECT a.id FROM child_table a
LEFT JOIN parent_table b ON a.parent_id = b.id
WHERE b.id IS NULL
```

### Performance Analysis
```sql
-- SQLite: check indexes
-- Use db_describe_table to see indexes

-- PostgreSQL: query plan
EXPLAIN SELECT * FROM table WHERE column = 'value'

-- SQLite: query plan
EXPLAIN QUERY PLAN SELECT * FROM table WHERE column = 'value'
```

## Safety Notes

- All queries are **read-only** — no INSERT, UPDATE, DELETE, DROP, or ALTER
- SQLite databases are opened in read-only mode
- Results are limited to 500 rows (queries) or 10,000 rows (CSV export)
- Sensitive data (passwords, tokens) may exist in databases — handle with care
