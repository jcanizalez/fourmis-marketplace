---
name: api-scaffold
description: Scaffold a RESTful API with best practices — routes, error handling, pagination, rate limiting
arguments:
  - name: resource
    description: "Primary resource name (e.g., users, orders, products)"
    required: true
  - name: framework
    description: "Framework: express (default), fastify, go-http, gin"
    required: false
---

# API Scaffold

Scaffold a production-ready RESTful API with best practices built in.

## Steps

1. **Detect or use specified framework**: Read package.json/go.mod, or use the `framework` argument

2. **Generate resource CRUD** for the specified resource:
   - `GET    /api/v1/{resources}` — List with pagination, filtering, sorting
   - `GET    /api/v1/{resources}/:id` — Get by ID
   - `POST   /api/v1/{resources}` — Create with validation
   - `PUT    /api/v1/{resources}/:id` — Full update
   - `PATCH  /api/v1/{resources}/:id` — Partial update
   - `DELETE /api/v1/{resources}/:id` — Soft or hard delete

3. **Include infrastructure code**:
   - Error classes (NotFound, ValidationFailed, Conflict, Unauthorized)
   - Error handling middleware (catches errors, returns RFC 7807 format)
   - Pagination helper (cursor or offset based)
   - Rate limiting middleware (token bucket or sliding window)
   - Request validation (Zod for TypeScript, struct validation for Go)
   - Response helpers (consistent envelope format)

4. **Generate files**:

   For Express/TypeScript:
   ```
   src/
   ├── routes/{resource}.ts          — Route handlers
   ├── middleware/error-handler.ts    — Centralized error handling
   ├── middleware/rate-limit.ts       — Rate limiting
   ├── middleware/validate.ts         — Request validation
   ├── errors/api-error.ts           — Typed error classes
   ├── utils/pagination.ts           — Pagination helpers
   └── utils/response.ts             — Response envelope helpers
   ```

   For Go:
   ```
   internal/
   ├── handler/{resource}.go         — HTTP handlers
   ├── middleware/error.go            — Error recovery
   ├── middleware/ratelimit.go        — Rate limiting
   ├── apierr/errors.go              — Error types
   └── pagination/pagination.go      — Pagination helpers
   ```

5. **Show integration**: How to register the routes in the main application file

## Quality Criteria

- Every route returns proper status codes
- All errors use the same format
- List endpoints support `?page=`, `?sort=`, `?fields=`
- Rate limit headers on every response
- Input validation on POST/PUT/PATCH
- 404 for missing resources
- Idempotency-Key support on POST
