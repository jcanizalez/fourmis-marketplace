---
name: query-explain
description: Analyze and optimize a slow SQL query using EXPLAIN ANALYZE
arguments:
  - name: query
    description: The SQL query to analyze (or paste it when prompted)
    required: false
---

# Query Explain & Optimize

Analyze a slow SQL query and provide optimization recommendations.

## Steps

1. **Get the query**: Use the provided query argument, or ask the user to paste their slow SQL query

2. **Analyze the EXPLAIN output** (if available):
   - Check for sequential scans on large tables
   - Look for estimated vs actual row count mismatches
   - Identify sort operations using external disk
   - Find nested loops with large row counts
   - Check buffer hit ratio (shared hit vs read)

3. **If no EXPLAIN output**, analyze the query structure:
   - Check for missing WHERE clause indexes
   - Look for JOIN conditions without indexes
   - Identify ORDER BY columns without indexes
   - Find OFFSET-based pagination on large tables
   - Check for functions in WHERE clauses preventing index use
   - Look for OR conditions that could use UNION
   - Identify N+1 patterns in subqueries

4. **Recommend optimizations** in priority order:
   - Create missing indexes (with exact CREATE INDEX statement)
   - Rewrite query for better execution plan
   - Add covering indexes to enable index-only scans
   - Use partial indexes for common filters
   - Suggest materialized views for expensive aggregations
   - Recommend keyset pagination over OFFSET
   - Suggest configuration tuning (work_mem, random_page_cost)

5. **Provide the optimized query** with explanation of changes

## Output Format

```
## Query Analysis

### Original Query
(formatted and annotated)

### Issues Found
1. 🔴 Sequential scan on `orders` (1M rows) — missing index on `user_id`
2. 🟡 Sort using external disk — increase work_mem or add index
3. 🟡 Row estimate 10, actual 50,000 — run ANALYZE

### Recommended Indexes
CREATE INDEX idx_orders_user_id ON orders (user_id);
CREATE INDEX idx_orders_status_created ON orders (status, created_at DESC);

### Optimized Query
(rewritten query with explanation)

### Expected Improvement
Before: Seq Scan, ~500ms
After: Index Scan, ~5ms (estimated 100x faster)
```

Reference the query-optimization skill for detailed patterns.
