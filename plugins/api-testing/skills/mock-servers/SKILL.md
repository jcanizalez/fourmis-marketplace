# Mock Servers & API Mocking

Create mock API servers for development, testing, and prototyping. Covers MSW (Mock Service Worker), in-memory mock servers, fixture-based responses, and API simulation.

## Mock Service Worker (MSW)

MSW intercepts requests at the network level — works in both browser and Node.js tests.

### Setup

```bash
npm install -D msw
```

### Define Handlers

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from 'msw';

// In-memory data store
let users = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
];
let nextId = 3;

export const handlers = [
  // GET /api/users
  http.get('/api/users', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || '1');
    const limit = Number(url.searchParams.get('limit') || '20');
    const start = (page - 1) * limit;

    return HttpResponse.json({
      data: users.slice(start, start + limit),
      meta: { total: users.length, page, limit },
    });
  }),

  // GET /api/users/:id
  http.get('/api/users/:id', ({ params }) => {
    const user = users.find(u => u.id === params.id);
    if (!user) {
      return HttpResponse.json(
        { error: { message: 'User not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }
    return HttpResponse.json(user);
  }),

  // POST /api/users
  http.post('/api/users', async ({ request }) => {
    const body = await request.json() as { name: string; email: string };

    if (!body.name || !body.email) {
      return HttpResponse.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    const newUser = { id: String(nextId++), ...body };
    users.push(newUser);
    return HttpResponse.json(newUser, { status: 201 });
  }),

  // DELETE /api/users/:id
  http.delete('/api/users/:id', ({ params }) => {
    users = users.filter(u => u.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
```

### Use in Tests (Vitest)

```typescript
// mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// tests/setup.ts
import { beforeAll, afterAll, afterEach } from 'vitest';
import { server } from '../mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],
  },
});
```

```typescript
// tests/api-client.test.ts
import { describe, it, expect } from 'vitest';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

describe('API client', () => {
  it('fetches users', async () => {
    const response = await fetch('/api/users');
    const data = await response.json();
    expect(data.data).toHaveLength(2);
  });

  it('handles server errors', async () => {
    // Override handler for this test only
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json(
          { error: { message: 'Internal error' } },
          { status: 500 }
        );
      })
    );

    const response = await fetch('/api/users');
    expect(response.status).toBe(500);
  });

  it('handles network errors', async () => {
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.error(); // Simulates network failure
      })
    );

    await expect(fetch('/api/users')).rejects.toThrow();
  });
});
```

### Use in Browser (Development)

```typescript
// mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

// src/main.tsx — start MSW in development
async function enableMocking() {
  if (process.env.NODE_ENV !== 'development') return;
  const { worker } = await import('../mocks/browser');
  return worker.start({ onUnhandledRequest: 'bypass' });
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
});
```

## Fixture-Based Mock Server

For quick prototyping with static JSON responses:

```typescript
// mock-server.ts — standalone Express mock server
import express from 'express';
import { readFileSync } from 'fs';

const app = express();
app.use(express.json());

// Load fixtures from JSON files
function fixture(name: string) {
  return JSON.parse(readFileSync(`./fixtures/${name}.json`, 'utf-8'));
}

// Routes
app.get('/api/users', (req, res) => res.json(fixture('users')));
app.get('/api/users/:id', (req, res) => {
  const users = fixture('users').data;
  const user = users.find((u: any) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: { message: 'Not found' } });
  res.json(user);
});
app.post('/api/users', (req, res) => {
  res.status(201).json({ id: crypto.randomUUID(), ...req.body });
});

app.listen(4000, () => console.log('Mock server on :4000'));
```

```json
// fixtures/users.json
{
  "data": [
    { "id": "1", "name": "Alice", "email": "alice@example.com" },
    { "id": "2", "name": "Bob", "email": "bob@example.com" }
  ],
  "meta": { "total": 2, "page": 1, "limit": 20 }
}
```

## Simulating Latency & Errors

```typescript
// MSW — add realistic latency
import { delay, http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', async () => {
    await delay(200); // 200ms latency
    return HttpResponse.json({ data: users });
  }),

  // Simulate intermittent failures (20% error rate)
  http.post('/api/orders', async () => {
    await delay(300);
    if (Math.random() < 0.2) {
      return HttpResponse.json(
        { error: { message: 'Service temporarily unavailable' } },
        { status: 503 }
      );
    }
    return HttpResponse.json({ id: crypto.randomUUID(), status: 'created' }, { status: 201 });
  }),
];
```

## Hurl — HTTP File-Based Testing

```hurl
# tests/users.hurl — declarative API tests

# List users
GET http://localhost:3000/api/users
HTTP 200
[Asserts]
jsonpath "$.data" count > 0
jsonpath "$.meta.total" isInteger
jsonpath "$.meta.page" == 1

# Create user
POST http://localhost:3000/api/users
Content-Type: application/json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
HTTP 201
[Captures]
user_id: jsonpath "$.id"
[Asserts]
jsonpath "$.name" == "Jane Doe"
jsonpath "$.email" == "jane@example.com"

# Get created user
GET http://localhost:3000/api/users/{{user_id}}
HTTP 200
[Asserts]
jsonpath "$.id" == "{{user_id}}"
jsonpath "$.name" == "Jane Doe"

# Delete user
DELETE http://localhost:3000/api/users/{{user_id}}
HTTP 204

# Verify deletion
GET http://localhost:3000/api/users/{{user_id}}
HTTP 404
```

Run with:
```bash
hurl --test tests/users.hurl
```

## Mock Server Patterns

### Reset Between Tests
Always reset mock state between tests to prevent test pollution:
```typescript
afterEach(() => {
  server.resetHandlers(); // MSW
  users = [...initialUsers]; // Reset in-memory data
});
```

### Record & Replay
Record real API responses and replay them in tests:
```bash
# Record responses
curl -s https://api.example.com/users | jq . > fixtures/users.json

# Use recorded fixture in tests
```

### Environment-Based Mocking
```typescript
// Use real API in CI, mocks in local dev
const baseUrl = process.env.CI
  ? 'https://staging-api.example.com'
  : 'http://localhost:4000'; // Mock server
```
