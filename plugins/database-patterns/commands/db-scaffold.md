---
name: db-scaffold
description: Scaffold database schema with migrations for a project
arguments:
  - name: orm
    description: "ORM to use: prisma (default), drizzle, raw-sql, gorm"
    required: false
  - name: entities
    description: "Comma-separated entity names (e.g., users,orders,products)"
    required: true
---

# Database Scaffold

Scaffold a production-ready database schema with migrations for the specified entities.

## Steps

1. **Detect or use specified ORM**: Check for existing Prisma schema, Drizzle schema, or Go modules. Use `orm` argument if provided.

2. **Analyze entities**: Parse the entity names and infer relationships:
   - `users,orders` → User has many Orders
   - `products,categories` → Product belongs to Category (or many-to-many)
   - `posts,tags` → Many-to-many via junction table

3. **Generate schema** for each entity with:
   - UUID primary key
   - Appropriate columns based on entity name conventions
   - Foreign keys with proper ON DELETE behavior
   - Created/updated timestamps
   - Soft delete (deleted_at) where appropriate
   - Useful indexes (FK columns, commonly filtered fields)
   - CHECK constraints for valid values
   - Unique constraints where needed

4. **Per-ORM output**:

   **Prisma:**
   - Generate `prisma/schema.prisma` with models, relations, enums
   - Include `@@map()` for snake_case table names
   - Include `@map()` for snake_case column names
   - Generate migration: `npx prisma migrate dev --name init`

   **Drizzle:**
   - Generate `db/schema.ts` with table definitions
   - Generate `db/relations.ts` with relation definitions
   - Include drizzle-kit config
   - Migration: `npx drizzle-kit generate && npx drizzle-kit migrate`

   **Raw SQL:**
   - Generate numbered migration files (`001_create_users.sql`, etc.)
   - Include UP and DOWN migrations
   - Include `updated_at` trigger function
   - Include seed data file

   **GORM (Go):**
   - Generate model structs with proper tags
   - Include AutoMigrate setup
   - Include seed function

5. **Include infrastructure**:
   - Connection pool setup with proper configuration
   - `updated_at` auto-update trigger
   - Environment variable configuration (`DATABASE_URL`)
   - Seed data script

## Quality Criteria

- All tables have UUID primary keys
- All foreign keys have indexes
- All tables have `created_at` and `updated_at`
- Money columns use `NUMERIC(10,2)`, not FLOAT
- Timestamps use `TIMESTAMPTZ`
- Naming follows snake_case convention
- ON DELETE behavior is explicitly set for all FKs
- CHECK constraints for enums/valid values
