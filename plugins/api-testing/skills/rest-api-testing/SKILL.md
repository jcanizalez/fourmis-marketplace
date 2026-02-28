# REST API Testing

Write comprehensive API tests covering all HTTP methods, status codes, request/response validation, authentication, pagination, and error handling.

## Testing Frameworks by Language

| Language | Library | Type |
|----------|---------|------|
| Node.js | Supertest + Vitest/Jest | Integration |
| Python | httpx + pytest | Integration |
| Go | net/http/httptest | Integration |
| Any | Bruno / Hurl / curl | Manual / CI |

## Node.js — Supertest + Vitest

### Setup

```typescript
// tests/helpers/app.ts — Create a test app instance
import { createApp } from '../../src/app';

export function createTestApp() {
  return createApp(); // Returns Express/Fastify app without listening
}
```

```typescript
// tests/helpers/request.ts — Supertest helper
import supertest from 'supertest';
import { createTestApp } from './app';

export function request() {
  return supertest(createTestApp());
}
```

### CRUD Tests

```typescript
// tests/routes/users.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { request } from '../helpers/request';

describe('GET /api/users', () => {
  it('returns a list of users', async () => {
    const res = await request()
      .get('/api/users')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(res.body).toEqual({
      data: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          email: expect.any(String),
        }),
      ]),
      meta: { total: expect.any(Number), page: 1, limit: 20 },
    });
  });

  it('supports pagination', async () => {
    const res = await request()
      .get('/api/users?page=2&limit=5')
      .expect(200);

    expect(res.body.meta).toEqual({ total: expect.any(Number), page: 2, limit: 5 });
    expect(res.body.data.length).toBeLessThanOrEqual(5);
  });

  it('supports filtering', async () => {
    const res = await request()
      .get('/api/users?role=admin')
      .expect(200);

    res.body.data.forEach((user: any) => {
      expect(user.role).toBe('admin');
    });
  });
});

describe('POST /api/users', () => {
  it('creates a new user', async () => {
    const userData = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'user',
    };

    const res = await request()
      .post('/api/users')
      .send(userData)
      .expect(201)
      .expect('Content-Type', /json/);

    expect(res.body).toMatchObject({
      id: expect.any(String),
      ...userData,
      createdAt: expect.any(String),
    });
  });

  it('rejects invalid email', async () => {
    const res = await request()
      .post('/api/users')
      .send({ name: 'Jane', email: 'not-an-email', role: 'user' })
      .expect(400);

    expect(res.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: expect.arrayContaining([
        expect.objectContaining({ path: 'email' }),
      ]),
    });
  });

  it('rejects duplicate email', async () => {
    // Create first user
    await request().post('/api/users').send({
      name: 'Jane', email: 'jane@example.com', role: 'user'
    });

    // Try to create duplicate
    const res = await request()
      .post('/api/users')
      .send({ name: 'Jane 2', email: 'jane@example.com', role: 'user' })
      .expect(409);

    expect(res.body.error.code).toBe('CONFLICT');
  });
});

describe('GET /api/users/:id', () => {
  it('returns a single user', async () => {
    // Create a user first
    const created = await request().post('/api/users').send({
      name: 'Jane', email: 'jane@test.com', role: 'user'
    });

    const res = await request()
      .get(`/api/users/${created.body.id}`)
      .expect(200);

    expect(res.body.id).toBe(created.body.id);
  });

  it('returns 404 for non-existent user', async () => {
    await request()
      .get('/api/users/non-existent-id')
      .expect(404);
  });
});

describe('PUT /api/users/:id', () => {
  it('updates a user', async () => {
    const created = await request().post('/api/users').send({
      name: 'Jane', email: 'jane@update.com', role: 'user'
    });

    const res = await request()
      .put(`/api/users/${created.body.id}`)
      .send({ name: 'Jane Updated' })
      .expect(200);

    expect(res.body.name).toBe('Jane Updated');
    expect(res.body.email).toBe('jane@update.com'); // Unchanged fields preserved
  });
});

describe('DELETE /api/users/:id', () => {
  it('deletes a user', async () => {
    const created = await request().post('/api/users').send({
      name: 'Jane', email: 'jane@delete.com', role: 'user'
    });

    await request()
      .delete(`/api/users/${created.body.id}`)
      .expect(204);

    // Verify deletion
    await request()
      .get(`/api/users/${created.body.id}`)
      .expect(404);
  });
});
```

## Python — httpx + pytest

```python
# tests/conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from my_api.main import app

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

# tests/test_users.py
import pytest

@pytest.mark.asyncio
async def test_list_users(client):
    response = await client.get("/api/users")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert "meta" in data

@pytest.mark.asyncio
async def test_create_user(client):
    response = await client.post("/api/users", json={
        "name": "Jane Doe",
        "email": "jane@example.com",
    })
    assert response.status_code == 201
    user = response.json()
    assert user["name"] == "Jane Doe"
    assert "id" in user

@pytest.mark.asyncio
async def test_create_user_validation(client):
    response = await client.post("/api/users", json={
        "name": "",  # Empty name
        "email": "not-an-email",
    })
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
```

## Go — httptest

```go
// handlers/users_test.go
package handlers_test

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "my-service/internal/handler"
)

func TestListUsers(t *testing.T) {
    h := handler.New(slog.Default())
    srv := httptest.NewServer(h.Routes())
    defer srv.Close()

    resp, err := http.Get(srv.URL + "/api/users")
    if err != nil {
        t.Fatal(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        t.Errorf("expected 200, got %d", resp.StatusCode)
    }

    var result struct {
        Data []map[string]any `json:"data"`
        Meta map[string]any   `json:"meta"`
    }
    json.NewDecoder(resp.Body).Decode(&result)

    if result.Data == nil {
        t.Error("expected data array")
    }
}

func TestCreateUser(t *testing.T) {
    h := handler.New(slog.Default())
    srv := httptest.NewServer(h.Routes())
    defer srv.Close()

    body, _ := json.Marshal(map[string]string{
        "name":  "Jane Doe",
        "email": "jane@example.com",
    })

    resp, err := http.Post(srv.URL+"/api/users", "application/json", bytes.NewReader(body))
    if err != nil {
        t.Fatal(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusCreated {
        t.Errorf("expected 201, got %d", resp.StatusCode)
    }
}
```

## Testing Checklist

### For Every Endpoint
1. [ ] Happy path — correct request returns expected response
2. [ ] Validation — missing/invalid fields return 400 with details
3. [ ] Not found — non-existent resources return 404
4. [ ] Conflict — duplicate unique fields return 409
5. [ ] Auth — unauthenticated requests return 401
6. [ ] Authz — unauthorized requests return 403
7. [ ] Method not allowed — wrong HTTP method returns 405
8. [ ] Content-Type — response has correct Content-Type header
9. [ ] Pagination — page, limit, total work correctly
10. [ ] Idempotency — repeated PUT/DELETE don't cause side effects

### Response Structure
```json
// Success (single)
{ "id": "...", "name": "...", "createdAt": "..." }

// Success (list)
{ "data": [...], "meta": { "total": 100, "page": 1, "limit": 20 } }

// Error
{ "error": { "message": "...", "code": "VALIDATION_ERROR", "details": [...] } }
```
