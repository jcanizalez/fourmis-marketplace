---
name: schema-review
description: Review database schema for design issues — naming, types, constraints, indexes, relationships
arguments:
  - name: path
    description: Path to schema files (migrations, Prisma schema, Drizzle schema, or SQL files)
    required: false
---

# Schema Review

Review this project's database schema against design best practices.

## Review Steps

1. **Find schema definition**: Look for Prisma schema (`prisma/schema.prisma`), Drizzle schema (`db/schema.ts`), migration files (`migrations/`), or raw SQL files

2. **Naming audit**:
   - Tables: plural, snake_case (`users`, not `User`)
   - Columns: snake_case, descriptive (`first_name`, not `fname`)
   - Foreign keys: `{table_singular}_id` pattern
   - Booleans: `is_` or `has_` prefix
   - Timestamps: `_at` suffix
   - Indexes: `idx_{table}_{columns}` pattern

3. **Data type audit**:
   - Money: `NUMERIC(10,2)` not `FLOAT`
   - Strings: `TEXT` preferred over `VARCHAR(n)` in PostgreSQL
   - Timestamps: `TIMESTAMPTZ` not `TIMESTAMP` (timezone-aware)
   - Primary keys: UUID or BIGSERIAL (consistent choice)
   - JSONB over JSON (indexable, faster)

4. **Constraint audit**:
   - NOT NULL on required columns
   - CHECK constraints for valid ranges/values
   - UNIQUE constraints where needed
   - Foreign key ON DELETE behavior (CASCADE, RESTRICT, SET NULL)
   - Default values for columns with sensible defaults

5. **Relationship audit**:
   - All foreign keys have indexes
   - Many-to-many uses junction tables (not arrays of IDs)
   - ON DELETE behavior is intentional

6. **Index audit**:
   - Foreign key columns are indexed
   - Frequently filtered columns have indexes
   - Composite indexes follow left-prefix rule
   - No duplicate/redundant indexes

7. **Missing patterns**:
   - `created_at` and `updated_at` on all tables
   - Auto-update trigger for `updated_at`
   - Soft delete (`deleted_at`) if applicable

## Output Format

```
## Schema Review

### Tables Found
| Table | Columns | Indexes | FKs | Issues |
|-------|---------|---------|-----|--------|

### Scorecard
| Category | Score | Issues |
|----------|-------|--------|
| Naming | 8/10 | ✅ |
| Data Types | 6/10 | ⚠️ Using FLOAT for money |
| Constraints | 5/10 | ⚠️ Missing NOT NULL |
| Indexes | 3/10 | ❌ FK columns not indexed |
| Relationships | 9/10 | ✅ |

### Recommendations (Priority Order)
1. [Critical] ...
```
