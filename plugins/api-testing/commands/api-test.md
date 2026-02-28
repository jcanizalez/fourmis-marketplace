---
name: api-test
description: Run API tests against your endpoints — validates responses, status codes, headers, and schemas. Supports REST, GraphQL, and WebSocket APIs
allowed-tools: Read, Glob, Grep, Bash
---

# /api-test — API Test Runner

Run and generate API tests for your project's endpoints.

## Usage

```
/api-test                           # Detect framework and run existing API tests
/api-test --generate                # Generate test suite for discovered endpoints
/api-test src/routes/users.ts       # Generate tests for specific route file
/api-test --coverage                # Run tests and report endpoint coverage
```

## Workflow

1. **Detect stack**: Read `package.json`, `go.mod`, `requirements.txt` to identify framework
2. **Discover endpoints**: Scan route files, controllers, OpenAPI specs for all API endpoints
3. **Check existing tests**: Find test files and map which endpoints are already tested
4. **Generate or run**:
   - If `--generate`: Create test files for untested endpoints
   - If `--coverage`: Run tests and report which endpoints lack coverage
   - Default: Run existing test suite and report results

## Test Generation

For each endpoint, generates tests covering:

| Category | Tests Generated |
|----------|----------------|
| **Happy path** | Valid request → expected response body and status |
| **Validation** | Missing required fields → 400 with error details |
| **Auth** | No token → 401, invalid token → 401, wrong role → 403 |
| **Not found** | Invalid ID → 404 |
| **Edge cases** | Empty body, extra fields, boundary values |

### Framework Detection

| Framework | Test Runner | HTTP Client |
|-----------|-------------|-------------|
| Express / Fastify | Vitest | Supertest |
| Next.js API routes | Vitest | Supertest or fetch |
| FastAPI | pytest | httpx |
| Go net/http | go test | net/http/httptest |
| Django / Flask | pytest | test client |

## Output Format

```
## API Test Report

### Endpoint Coverage
| Method | Path | Tests | Status |
|--------|------|-------|--------|
| GET | /api/users | 5 | ✅ passing |
| POST | /api/users | 4 | ✅ passing |
| GET | /api/users/:id | 3 | ⚠️ 1 failing |
| DELETE | /api/users/:id | 0 | ❌ no tests |

### Coverage: 75% (3/4 endpoints tested)

### Failures
- GET /api/users/:id — "should return 404 for non-existent user"
  Expected: 404, Received: 500
  File: src/__tests__/users.test.ts:42

### Missing Coverage
- DELETE /api/users/:id — no test file found
  → Generated: src/__tests__/users-delete.test.ts
```

## Important

- Tests are generated using the project's existing test framework and patterns
- Generated tests use the same database/fixture setup found in existing tests
- Always review generated tests before committing — adjust fixtures and expectations
- For authenticated endpoints, tests assume a test user/token helper exists
