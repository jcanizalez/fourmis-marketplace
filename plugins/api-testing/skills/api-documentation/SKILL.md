# API Documentation & Validation

Generate, validate, and maintain API documentation. Covers OpenAPI spec generation, documentation from code, SDK generation, and documentation testing.

## OpenAPI Spec Generation from Code

### Express.js — express-openapi-validator

```typescript
// Generate OpenAPI spec from route definitions
// Option 1: Code-first with JSDoc annotations

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: List users
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: User list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserList'
 */
app.get('/api/users', listUsers);
```

### FastAPI — Auto-Generated

```python
# FastAPI generates OpenAPI spec automatically from type hints
from fastapi import FastAPI, Query
from pydantic import BaseModel

class User(BaseModel):
    id: str
    name: str
    email: str

class UserList(BaseModel):
    data: list[User]
    meta: dict

@app.get("/api/users", response_model=UserList)
async def list_users(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
):
    """List all users with pagination."""
    ...

# OpenAPI spec auto-available at /openapi.json
# Swagger UI at /docs
# ReDoc at /redoc
```

### Go — swag

```go
// Generate OpenAPI with swag annotations

// @Summary List users
// @Description Get paginated list of users
// @Tags users
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {object} UserListResponse
// @Router /api/users [get]
func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
    // ...
}
```

## OpenAPI Spec Best Practices

### Complete Spec Structure

```yaml
openapi: 3.1.0
info:
  title: My API
  version: 1.0.0
  description: |
    Complete API documentation with examples.

    ## Authentication
    All endpoints require a Bearer token in the Authorization header.
    Obtain tokens via POST /api/auth/login.

    ## Rate Limits
    - 100 requests per minute per API key
    - 429 Too Many Requests when exceeded
  contact:
    email: api@example.com
  license:
    name: MIT

servers:
  - url: https://api.example.com
    description: Production
  - url: https://staging-api.example.com
    description: Staging
  - url: http://localhost:3000
    description: Local development

security:
  - bearerAuth: []

paths:
  /api/users:
    get:
      operationId: listUsers
      summary: List users
      description: Returns paginated list of users. Supports filtering by role.
      tags: [Users]
      parameters:
        - $ref: '#/components/parameters/Page'
        - $ref: '#/components/parameters/Limit'
        - name: role
          in: query
          description: Filter by user role
          schema:
            type: string
            enum: [user, admin]
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserListResponse'
              example:
                data:
                  - id: "550e8400-e29b-41d4-a716-446655440000"
                    name: "Alice Johnson"
                    email: "alice@example.com"
                    role: "admin"
                    createdAt: "2025-01-15T10:30:00Z"
                meta:
                  total: 42
                  page: 1
                  limit: 20
        '401':
          $ref: '#/components/responses/Unauthorized'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  parameters:
    Page:
      name: page
      in: query
      description: Page number (1-indexed)
      schema: { type: integer, default: 1, minimum: 1 }
    Limit:
      name: limit
      in: query
      description: Items per page
      schema: { type: integer, default: 20, minimum: 1, maximum: 100 }

  responses:
    Unauthorized:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error:
              message: "Authentication required"
              code: "UNAUTHORIZED"

  schemas:
    # Reusable schemas defined here
    Error:
      type: object
      required: [error]
      properties:
        error:
          type: object
          required: [message, code]
          properties:
            message: { type: string }
            code: { type: string }
```

## Spec Validation & Linting

### Redocly CLI

```bash
# Install
npm install -g @redocly/cli

# Lint OpenAPI spec
redocly lint openapi.yaml

# Preview documentation
redocly preview-docs openapi.yaml

# Bundle split specs into one file
redocly bundle openapi.yaml -o dist/openapi.yaml
```

### Spectral (Stoplight)

```bash
# Install
npm install -g @stoplight/spectral-cli

# Lint with built-in rules
spectral lint openapi.yaml

# Custom rules
# .spectral.yml
extends: spectral:oas
rules:
  operation-operationId: error
  operation-description: warn
  oas3-valid-media-example: error
  no-$ref-siblings: error
```

### CI Integration

```yaml
# .github/workflows/api-docs.yml
name: API Docs
on:
  pull_request:
    paths: ['openapi.yaml', 'src/routes/**']

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx @redocly/cli lint openapi.yaml
      - run: npx @stoplight/spectral-cli lint openapi.yaml
```

## Documentation from Code (Zod → OpenAPI)

```typescript
// zod-to-openapi — generate OpenAPI from Zod schemas
import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

// Register schemas
const UserSchema = registry.register('User', z.object({
  id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
  name: z.string().min(1).openapi({ example: 'Alice Johnson' }),
  email: z.string().email().openapi({ example: 'alice@example.com' }),
  createdAt: z.string().datetime(),
}));

// Register endpoints
registry.registerPath({
  method: 'get',
  path: '/api/users',
  summary: 'List users',
  request: {
    query: z.object({
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().max(100).default(20),
    }),
  },
  responses: {
    200: {
      description: 'User list',
      content: {
        'application/json': {
          schema: z.object({ data: z.array(UserSchema), meta: PaginationSchema }),
        },
      },
    },
  },
});

// Generate spec
const generator = new OpenApiGeneratorV31(registry.definitions);
const spec = generator.generateDocument({
  openapi: '3.1.0',
  info: { title: 'My API', version: '1.0.0' },
});

// Write to file
import { writeFileSync } from 'fs';
writeFileSync('openapi.json', JSON.stringify(spec, null, 2));
```

## cURL Documentation

Always include curl examples in API docs for quick testing:

```bash
# List users
curl -s https://api.example.com/api/users \
  -H "Authorization: Bearer $TOKEN" \
  | jq .

# Create user
curl -s https://api.example.com/api/users \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Doe", "email": "jane@example.com"}' \
  | jq .

# Update user
curl -s https://api.example.com/api/users/123 \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Updated"}' \
  | jq .

# Delete user
curl -s https://api.example.com/api/users/123 \
  -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  -w "\n%{http_code}\n"
```

## API Documentation Checklist

1. [ ] OpenAPI spec exists and is validated (Redocly or Spectral)
2. [ ] Every endpoint has summary, description, and examples
3. [ ] All request parameters are documented (path, query, body)
4. [ ] All response codes are documented (200, 400, 401, 403, 404, 500)
5. [ ] Authentication method is documented
6. [ ] Rate limits are documented
7. [ ] Error response format is consistent and documented
8. [ ] curl examples are provided for all endpoints
9. [ ] Spec is auto-generated from code or validated against code
10. [ ] CI validates spec changes on every PR
