---
name: query
description: Run a read-only SQL query on the connected database and see formatted results
allowed-tools: db_query, db_export_csv, db_connect, db_list_tables
---

# /query — Run SQL Queries

Execute read-only SQL queries on the connected database.

## Usage

```
/query <sql>                        # Run a SELECT query
/query export <sql> <file.csv>      # Export results to CSV
```

## Examples

```
/query SELECT * FROM users LIMIT 20
/query SELECT name, COUNT(*) FROM orders GROUP BY name ORDER BY COUNT(*) DESC
/query SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id
/query export "SELECT * FROM products" ./products.csv
```

## Process

1. **SQL argument**: Execute the query with db_query and display formatted results
   - If no database is connected, prompt the user to connect first with `/db <path>`
   - Only SELECT, WITH (CTE), and EXPLAIN queries are allowed
2. **"export" + SQL + file path**: Run the query and save results as CSV with db_export_csv

## Notes

- All queries are **read-only** — INSERT, UPDATE, DELETE, DROP, ALTER are blocked
- Results limited to 500 rows (queries) or 10,000 rows (CSV export)
- Must be connected to a database first — use `/db <path>` to connect
- Works with both SQLite and PostgreSQL
