# Integration Testing

Write integration tests for APIs, databases, and service interactions. Covers HTTP testing, database setup/teardown, and external service integration.

## When to Activate

When the user asks to:
- Write API endpoint tests
- Test database operations end-to-end
- Test service-to-service interactions
- Create integration test suites
- Test middleware or request pipelines

## Integration vs Unit Tests

| Aspect | Unit Test | Integration Test |
|--------|-----------|-----------------|
| Scope | Single function/class | Multiple components together |
| Dependencies | Mocked | Real (or realistic test doubles) |
| Speed | Fast (ms) | Slower (100ms-seconds) |
| Database | Never | Test database or in-memory |
| Network | Never | Local server or test containers |
| Location | Same dir as source | `tests/integration/` or `__tests__/integration/` |

## API Endpoint Testing

### Express/Fastify with Supertest (Jest/Vitest)

```typescript
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/db';

describe('POST /api/users', () => {
  beforeEach(async () => {
    await db.migrate.latest();
    await db.seed.run();
  });

  afterEach(async () => {
    await db.migrate.rollback();
  });

  it('should create a user and return 201', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Alice', email: 'alice@test.com' })
      .expect(201);

    expect(res.body).toMatchObject({
      id: expect.any(Number),
      name: 'Alice',
      email: 'alice@test.com',
    });
  });

  it('should return 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Bob', email: 'not-an-email' })
      .expect(400);

    expect(res.body.error).toContain('email');
  });

  it('should return 409 for duplicate email', async () => {
    // First create
    await request(app)
      .post('/api/users')
      .send({ name: 'Alice', email: 'alice@test.com' });

    // Duplicate
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Alice2', email: 'alice@test.com' })
      .expect(409);

    expect(res.body.error).toContain('already exists');
  });
});
```

### pytest with FastAPI/Flask

```python
import pytest
from httpx import AsyncClient
from app.main import app
from app.db import engine, Base

@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

async def test_create_user(client):
    response = await client.post("/api/users", json={
        "name": "Alice",
        "email": "alice@test.com"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Alice"
    assert "id" in data

async def test_create_user_duplicate_email(client):
    await client.post("/api/users", json={
        "name": "Alice",
        "email": "alice@test.com"
    })
    response = await client.post("/api/users", json={
        "name": "Alice2",
        "email": "alice@test.com"
    })
    assert response.status_code == 409
```

### Go HTTP Testing

```go
func TestCreateUserHandler(t *testing.T) {
    // Setup test database
    db := setupTestDB(t)
    defer db.Close()

    handler := NewUserHandler(db)
    server := httptest.NewServer(handler)
    defer server.Close()

    // Test create
    body := `{"name":"Alice","email":"alice@test.com"}`
    resp, err := http.Post(server.URL+"/api/users", "application/json",
        strings.NewReader(body))
    if err != nil {
        t.Fatal(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusCreated {
        t.Errorf("expected 201, got %d", resp.StatusCode)
    }

    var user User
    json.NewDecoder(resp.Body).Decode(&user)
    if user.Name != "Alice" {
        t.Errorf("expected Alice, got %s", user.Name)
    }
}
```

## Database Testing Patterns

### Test Database Setup

```typescript
// Use a separate test database
const TEST_DB = process.env.TEST_DATABASE_URL || 'sqlite::memory:';

// Or in-memory SQLite for speed
import Database from 'better-sqlite3';
const db = new Database(':memory:');

// Run migrations before tests, rollback after
beforeAll(async () => { await migrate(db); });
afterAll(async () => { await db.close(); });
beforeEach(async () => { await seed(db); });
afterEach(async () => { await truncateAll(db); });
```

### Transaction Rollback Pattern

```typescript
// Wrap each test in a transaction that gets rolled back
beforeEach(async () => {
  await db.query('BEGIN');
});

afterEach(async () => {
  await db.query('ROLLBACK');
});
```

## Integration Test Checklist

For each API endpoint, test:

1. **Success case** — valid input returns expected response
2. **Validation errors** — missing/invalid fields return 400
3. **Not found** — accessing non-existent resources returns 404
4. **Duplicates** — creating duplicates returns 409
5. **Authentication** — unauthenticated requests return 401
6. **Authorization** — unauthorized actions return 403
7. **Idempotency** — repeated identical requests behave correctly
8. **Content type** — wrong content type returns 415
9. **Pagination** — list endpoints handle page/limit correctly
10. **Concurrency** — simultaneous requests don't corrupt data

## Notes

- Always use a separate test database — NEVER test against production
- Clean up test data between tests for isolation
- Use transactions + rollback for speed when possible
- Test with realistic data volumes (not just 1-2 records)
- Include response time assertions for performance-critical endpoints
