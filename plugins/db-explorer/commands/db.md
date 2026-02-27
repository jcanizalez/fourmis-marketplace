---
name: db
description: Quick database exploration — connect, list tables, describe schema, and preview data
allowed-tools: db_connect, db_disconnect, db_list_tables, db_describe_table, db_schema, db_sample, db_stats, db_relationships
---

# /db — Quick Database Exploration

Connect to a database and explore its structure in one command.

## Usage

```
/db <path-or-connection-string>     # Connect and show overview
/db tables                          # List all tables
/db describe <table>                # Show table structure
/db sample <table>                  # Preview data from a table
/db schema                          # Full schema dump
/db stats                           # Table sizes and row counts
/db relationships                   # Foreign key map
/db disconnect                      # Close connection
```

## Examples

```
/db ./my-app.db
/db ~/data/production.sqlite
/db postgresql://user:pass@localhost:5432/mydb
/db tables
/db describe users
/db sample orders
/db schema
/db stats
```

## Process

1. **Path/URL argument**: Auto-detect SQLite (file path) vs PostgreSQL (postgresql://...) and connect with db_connect. Then show table list and stats overview.
2. **"tables"**: List all tables and views with db_list_tables
3. **"describe" + table name**: Show columns, indexes, and foreign keys with db_describe_table
4. **"sample" + table name**: Preview 10 rows of data with db_sample
5. **"schema"**: Dump full CREATE TABLE statements with db_schema
6. **"stats"**: Show row counts and column counts with db_stats
7. **"relationships"**: Show foreign key map with db_relationships
8. **"disconnect"**: Close connection with db_disconnect

## Notes

- SQLite databases are opened in **read-only mode** — no writes possible
- Only one database connection at a time
- Auto-detects database type from the connection argument
- For PostgreSQL, use a full connection string: `postgresql://user:pass@host:port/dbname`
