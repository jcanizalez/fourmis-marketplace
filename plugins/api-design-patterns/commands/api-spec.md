---
name: api-spec
description: Generate an OpenAPI 3.1 specification from route handlers
arguments:
  - name: path
    description: Path to the routes/controllers directory
    required: false
  - name: format
    description: "Output format: yaml (default) or json"
    required: false
---

# API Spec Generator

Scan the project's route handlers and generate an OpenAPI 3.1 specification.

## Steps

1. **Detect framework**: Identify Express, Fastify, Go net/http, Gin, or other framework

2. **Scan routes**: Find all route definitions and extract:
   - HTTP method and path
   - Path parameters (`:id`, `{id}`)
   - Query parameters (from validation schemas if available)
   - Request body type (from Zod schemas, TypeScript types, or Go structs)
   - Response type and status codes
   - Authentication requirements (from middleware)

3. **Generate OpenAPI spec** with:
   - Info block (title, version, description)
   - Server URLs (from environment or defaults)
   - Paths with operations
   - Request/response schemas derived from code
   - Security schemes (Bearer token, API key)
   - Common components (pagination, error responses)

4. **Include standard components**:
   - Error response schema (RFC 7807 format)
   - Pagination parameters and response
   - Rate limit headers
   - Authentication security scheme

5. **Output**: Write the spec to `openapi.yaml` (or `openapi.json`) at the project root

## Example Output

```yaml
openapi: "3.1.0"
info:
  title: "My API"
  version: "1.0.0"
paths:
  /api/v1/users:
    get:
      summary: List users
      parameters:
        - name: page
          in: query
          schema: { type: integer, default: 1 }
        - name: perPage
          in: query
          schema: { type: integer, default: 20, maximum: 100 }
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UserListResponse"
```

After generating, suggest running an OpenAPI validator to check for issues.
