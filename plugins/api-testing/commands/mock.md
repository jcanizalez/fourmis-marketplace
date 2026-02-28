---
name: mock
description: Set up mock API servers for development and testing — MSW handlers, fixture-based mocks, and API simulation with realistic delays and errors
allowed-tools: Read, Write, Glob, Grep, Bash
---

# /mock — Mock Server Setup

Set up mock API servers for frontend development, integration testing, and API simulation.

## Usage

```
/mock                               # Detect API calls and generate MSW handlers
/mock src/api/                      # Generate mocks for API client files
/mock --openapi openapi.yaml        # Generate mocks from OpenAPI spec
/mock --fixture                     # Create fixture-based mock data
```

## Workflow

1. **Scan codebase**: Find all `fetch`, `axios`, or HTTP client calls
2. **Extract endpoints**: Build list of all API endpoints the app calls
3. **Generate handlers**: Create MSW handlers or fixture server for each endpoint
4. **Set up infrastructure**: Install MSW, create setup files, add npm scripts
5. **Add realistic data**: Generate fixture data matching expected response shapes

## What Gets Generated

### MSW Setup (Browser + Node)

```
src/mocks/
  handlers/
    users.ts          # GET/POST/PUT/DELETE /api/users handlers
    auth.ts           # Login, logout, refresh token handlers
    products.ts       # Product CRUD handlers
  fixtures/
    users.json        # Realistic mock data
    products.json     # Realistic mock data
  browser.ts          # Service worker setup for dev
  server.ts           # Node server setup for tests
  index.ts            # Handler aggregation
```

### Fixture Data

Generated fixtures include:
- Realistic names, emails, dates (no "test123" or "foo bar")
- Proper UUIDs, ISO timestamps, enum values
- Paginated response wrappers with metadata
- Error response shapes matching API contract

### Mock Scenarios

| Scenario | How It Works |
|----------|--------------|
| **Happy path** | Returns fixture data with 200 |
| **Loading state** | Adds configurable delay (default 500ms) |
| **Error state** | Returns 500 with error body |
| **Empty state** | Returns empty arrays/null |
| **Auth expired** | Returns 401 on specific requests |
| **Network error** | MSW `NetworkError` for offline testing |

## Output

```
## Mock Server Setup Complete

### Handlers Created
| Endpoint | Methods | Fixture Records |
|----------|---------|-----------------|
| /api/users | GET, POST, PUT, DELETE | 10 users |
| /api/auth/login | POST | 1 valid credential |
| /api/products | GET, POST | 25 products |

### Files Created
- src/mocks/handlers/users.ts (4 handlers)
- src/mocks/handlers/auth.ts (3 handlers)
- src/mocks/handlers/products.ts (2 handlers)
- src/mocks/fixtures/users.json
- src/mocks/fixtures/products.json
- src/mocks/browser.ts
- src/mocks/server.ts

### Usage
- Dev: MSW auto-starts in development mode
- Tests: Import `server` from src/mocks/server.ts in test setup
- Scenarios: Use `mockScenario('error')` to switch states
```

## Important

- MSW 2.x is used (modern API with `http.get()` syntax)
- Handlers match the actual API client calls found in your code
- Fixture data shapes match TypeScript types when available
- Mock server does NOT replace integration/E2E tests against real APIs
