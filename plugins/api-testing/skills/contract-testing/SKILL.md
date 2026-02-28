# Contract Testing

Validate that API producers and consumers agree on the API contract. Covers schema validation, OpenAPI-based testing, and consumer-driven contract testing.

## What Is Contract Testing?

Contract testing ensures the API producer (server) and consumer (client) agree on:
- Request format (method, path, headers, body shape)
- Response format (status codes, body shape, data types)
- Error format (error codes, message structure)

```
         Contract (OpenAPI/JSON Schema)
              ↙                ↘
    Producer tests:         Consumer tests:
    "I return what I         "I send what the
     promised"                server expects"
```

## OpenAPI Schema Validation

### Validate Responses Against OpenAPI Spec

```typescript
// tests/helpers/schema-validator.ts
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

let schemas: Record<string, any> = {};

export async function loadSpec(path: string) {
  const api = await SwaggerParser.dereference(path);
  schemas = api.components?.schemas || {};
  return api;
}

export function validateResponse(schemaName: string, data: unknown): { valid: boolean; errors: any[] } {
  const schema = schemas[schemaName];
  if (!schema) throw new Error(`Schema "${schemaName}" not found`);

  const validate = ajv.compile(schema);
  const valid = validate(data);
  return { valid: !!valid, errors: validate.errors || [] };
}
```

```typescript
// tests/contract.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { request } from './helpers/request';
import { loadSpec, validateResponse } from './helpers/schema-validator';

beforeAll(async () => {
  await loadSpec('./openapi.yaml');
});

describe('Contract: GET /api/users', () => {
  it('response matches User[] schema', async () => {
    const res = await request().get('/api/users').expect(200);

    res.body.data.forEach((user: any) => {
      const { valid, errors } = validateResponse('User', user);
      expect(errors).toEqual([]);
      expect(valid).toBe(true);
    });
  });
});

describe('Contract: POST /api/users', () => {
  it('response matches User schema', async () => {
    const res = await request()
      .post('/api/users')
      .send({ name: 'Jane', email: 'jane@test.com' })
      .expect(201);

    const { valid, errors } = validateResponse('User', res.body);
    expect(errors).toEqual([]);
    expect(valid).toBe(true);
  });

  it('error response matches Error schema', async () => {
    const res = await request()
      .post('/api/users')
      .send({})
      .expect(400);

    const { valid, errors } = validateResponse('Error', res.body);
    expect(errors).toEqual([]);
    expect(valid).toBe(true);
  });
});
```

## OpenAPI Spec Example

```yaml
# openapi.yaml
openapi: 3.1.0
info:
  title: My API
  version: 1.0.0

paths:
  /api/users:
    get:
      summary: List users
      parameters:
        - name: page
          in: query
          schema: { type: integer, default: 1 }
        - name: limit
          in: query
          schema: { type: integer, default: 20, maximum: 100 }
      responses:
        '200':
          description: User list
          content:
            application/json:
              schema:
                type: object
                required: [data, meta]
                properties:
                  data:
                    type: array
                    items: { $ref: '#/components/schemas/User' }
                  meta:
                    $ref: '#/components/schemas/Pagination'

    post:
      summary: Create user
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateUser' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/User' }
        '400':
          description: Validation error
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Error' }

components:
  schemas:
    User:
      type: object
      required: [id, name, email, createdAt]
      properties:
        id: { type: string, format: uuid }
        name: { type: string, minLength: 1 }
        email: { type: string, format: email }
        role: { type: string, enum: [user, admin] }
        createdAt: { type: string, format: date-time }

    CreateUser:
      type: object
      required: [name, email]
      properties:
        name: { type: string, minLength: 1, maxLength: 100 }
        email: { type: string, format: email }
        role: { type: string, enum: [user, admin], default: user }

    Pagination:
      type: object
      required: [total, page, limit]
      properties:
        total: { type: integer, minimum: 0 }
        page: { type: integer, minimum: 1 }
        limit: { type: integer, minimum: 1, maximum: 100 }

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
            details:
              type: array
              items:
                type: object
                properties:
                  path: { type: string }
                  message: { type: string }
```

## Zod Schema as Contract

Use Zod schemas as the shared contract between API and client:

```typescript
// shared/schemas.ts — shared between server and client
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(['user', 'admin']).default('user'),
  createdAt: z.string().datetime(),
});

export const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(['user', 'admin']).optional(),
});

export const PaginatedResponse = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    data: z.array(schema),
    meta: z.object({
      total: z.number().int().nonnegative(),
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
    }),
  });

export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
```

```typescript
// Server-side: validate requests
app.post('/api/users', (req, res) => {
  const result = CreateUserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: result.error.issues } });
  }
  // ... create user
});

// Client-side: validate responses
const response = await fetch('/api/users');
const json = await response.json();
const result = PaginatedResponse(UserSchema).safeParse(json);
if (!result.success) {
  throw new Error(`API contract violation: ${result.error.message}`);
}
```

## Contract Testing in CI

```yaml
# .github/workflows/contract.yml
name: Contract Tests
on:
  pull_request:
    paths:
      - 'openapi.yaml'
      - 'src/routes/**'
      - 'shared/schemas/**'

jobs:
  contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run test:contract
      - name: Validate OpenAPI spec
        run: npx @redocly/cli lint openapi.yaml
```

## Breaking Change Detection

```bash
# Use openapi-diff to detect breaking changes
npx openapi-diff openapi.yaml openapi-new.yaml

# Common breaking changes:
# - Removing an endpoint
# - Removing a required response field
# - Adding a required request field
# - Changing a field's type
# - Narrowing an enum (removing values)
```

## Contract Testing Checklist

1. [ ] OpenAPI spec exists and is up to date
2. [ ] All response schemas are validated in tests
3. [ ] All request schemas are validated in tests
4. [ ] Error responses follow a consistent schema
5. [ ] CI validates spec on changes to routes or schemas
6. [ ] Breaking changes are detected automatically
7. [ ] Shared types/schemas between server and client
