---
description: When the user asks to review tests, assess test quality, check test coverage, evaluate test reliability, find missing test cases, review unit tests, integration tests, or E2E tests, or asks about test anti-patterns and test code smells
---

# Test Review

Review test quality — coverage gaps, test reliability, anti-patterns, and missing edge cases. Covers unit, integration, and E2E test review across JavaScript/TypeScript, Python, and Go.

## Test Review Process

When reviewing tests, follow this order:

1. **Coverage gaps** — what isn't tested that should be?
2. **Structural quality** — are tests well-organized and maintainable?
3. **Reliability** — will these tests pass consistently?
4. **Mock hygiene** — are mocks appropriate and realistic?
5. **Missing edge cases** — what will break in production that tests don't catch?

## Test Anti-Patterns (with Fixes)

### The Giant — One Test Checking Everything

```typescript
// ❌ Tests 5 behaviors in one block — fails and you don't know which broke
test('user registration', async () => {
  const user = await register({ name: 'Jane', email: 'jane@test.com', password: 'Str0ng!' });
  expect(user.id).toBeDefined();
  expect(user.email).toBe('jane@test.com');
  expect(user.passwordHash).not.toBe('Str0ng!');
  const found = await db.users.findById(user.id);
  expect(found).toBeDefined();
  const token = await login({ email: 'jane@test.com', password: 'Str0ng!' });
  expect(token).toBeDefined();
  const profile = await getProfile(token);
  expect(profile.name).toBe('Jane');
});

// ✅ Split into focused tests — each tests one behavior
describe('user registration', () => {
  it('should create user with generated ID', async () => {
    const user = await register({ name: 'Jane', email: 'jane@test.com', password: 'Str0ng!' });
    expect(user.id).toBeDefined();
    expect(user.email).toBe('jane@test.com');
  });

  it('should hash password before storing', async () => {
    const user = await register({ name: 'Jane', email: 'jane@test.com', password: 'Str0ng!' });
    expect(user.passwordHash).not.toBe('Str0ng!');
  });

  it('should persist user to database', async () => {
    const user = await register({ name: 'Jane', email: 'jane@test.com', password: 'Str0ng!' });
    const found = await db.users.findById(user.id);
    expect(found?.email).toBe('jane@test.com');
  });
});
```

### The Mockery — Mocking the Thing You're Testing

```typescript
// ❌ Mocking OrderService while testing OrderService — tests nothing
jest.mock('./orderService');
test('checkout processes order', async () => {
  const result = await orderService.checkout(cart);
  expect(result).toBeDefined();  // You're testing your mock, not real code
});

// ✅ Mock only external dependencies, test real logic
test('checkout charges payment and creates order', async () => {
  const mockPayment = { charge: jest.fn().mockResolvedValue({ id: 'ch_1', status: 'paid' }) };
  const mockInventory = { reserve: jest.fn().mockResolvedValue(true) };

  const service = new OrderService(mockPayment, mockInventory);
  const result = await service.checkout(cart);

  expect(mockPayment.charge).toHaveBeenCalledWith({ amount: 2999, currency: 'usd' });
  expect(mockInventory.reserve).toHaveBeenCalledWith(cart.items);
  expect(result.status).toBe('confirmed');
});
```

### The Inspector — Testing Implementation, Not Behavior

```typescript
// ❌ Tests internal state and method calls — breaks on refactor
test('addItem updates internal array', () => {
  const cart = new Cart();
  cart.addItem({ id: '1', price: 10 });
  expect(cart._items.length).toBe(1);           // Accessing private state
  expect(cart._recalculate).toHaveBeenCalled();  // Spying on internals
});

// ✅ Tests observable behavior — survives refactoring
test('addItem increases total and item count', () => {
  const cart = new Cart();
  cart.addItem({ id: '1', price: 10 });
  expect(cart.itemCount).toBe(1);
  expect(cart.total).toBe(10);
});
```

### The Flaky — Non-Deterministic Tests

```typescript
// ❌ Depends on timing — fails intermittently
test('debounced search fires after delay', async () => {
  fireEvent.change(input, { target: { value: 'hello' } });
  await new Promise(r => setTimeout(r, 300));  // Race condition
  expect(mockSearch).toHaveBeenCalledWith('hello');
});

// ✅ Use fake timers — deterministic
test('debounced search fires after delay', () => {
  jest.useFakeTimers();
  fireEvent.change(input, { target: { value: 'hello' } });
  jest.advanceTimersByTime(300);
  expect(mockSearch).toHaveBeenCalledWith('hello');
  jest.useRealTimers();
});
```

```go
// ❌ Depends on map iteration order — fails randomly in Go
func TestGetKeys(t *testing.T) {
    m := map[string]int{"a": 1, "b": 2, "c": 3}
    keys := GetKeys(m)
    expected := []string{"a", "b", "c"}  // Map order is random in Go!
    assert.Equal(t, expected, keys)
}

// ✅ Sort before comparing or use ElementsMatch
func TestGetKeys(t *testing.T) {
    m := map[string]int{"a": 1, "b": 2, "c": 3}
    keys := GetKeys(m)
    sort.Strings(keys)
    assert.Equal(t, []string{"a", "b", "c"}, keys)
}
```

### The Copy-Paste — Duplicated Setup

```typescript
// ❌ Same setup in every test
test('admin can delete user', async () => {
  const admin = await createUser({ role: 'admin' });
  const token = await login(admin);
  const target = await createUser({ role: 'user' });
  const res = await request(app).delete(`/users/${target.id}`).set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
});

test('admin can update user', async () => {
  const admin = await createUser({ role: 'admin' });    // Same setup!
  const token = await login(admin);                      // Same setup!
  const target = await createUser({ role: 'user' });     // Same setup!
  const res = await request(app).patch(`/users/${target.id}`).set('Authorization', `Bearer ${token}`).send({ name: 'New' });
  expect(res.status).toBe(200);
});

// ✅ Extract shared setup
describe('admin user operations', () => {
  let adminToken: string;
  let targetUser: User;

  beforeEach(async () => {
    const admin = await createUser({ role: 'admin' });
    adminToken = await login(admin);
    targetUser = await createUser({ role: 'user' });
  });

  it('can delete users', async () => {
    const res = await request(app).delete(`/users/${targetUser.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('can update users', async () => {
    const res = await request(app).patch(`/users/${targetUser.id}`).set('Authorization', `Bearer ${adminToken}`).send({ name: 'New' });
    expect(res.status).toBe(200);
  });
});
```

## Test Naming Convention

Good test names describe **what** is being tested, **under what conditions**, and the **expected result**:

```typescript
// ❌ Vague — what does "works" mean?
test('createUser works', () => { ... });
test('test1', () => { ... });
test('edge case', () => { ... });

// ✅ Behavior-describing names
test('createUser returns the new user with a generated UUID', () => { ... });
test('createUser throws ValidationError when email format is invalid', () => { ... });
test('createUser hashes the password before storing to database', () => { ... });
```

**Go convention** — `Test<Function>_<scenario>`:

```go
func TestCalculateTotal_EmptyCart(t *testing.T) { ... }
func TestCalculateTotal_WithPercentageDiscount(t *testing.T) { ... }
func TestCalculateTotal_NegativeQuantity_ReturnsError(t *testing.T) { ... }
```

**Python convention** — `test_<function>_<scenario>`:

```python
def test_calculate_total_empty_cart(): ...
def test_calculate_total_with_percentage_discount(): ...
def test_calculate_total_negative_quantity_raises_value_error(): ...
```

## What to Check by Test Type

### Unit Tests

Tests a single function/method in isolation. External dependencies mocked.

**Quality bar:**
- Execution: <50ms per test
- Each test covers one behavior
- Happy path, error cases, edge cases all covered
- Assertions are specific (not just `toBeDefined()`)

```typescript
// ✅ Complete unit test coverage for a function
describe('parseAmount', () => {
  // Happy path
  it('parses integer strings', () => {
    expect(parseAmount('100')).toBe(100);
  });

  it('parses decimal strings to cents', () => {
    expect(parseAmount('19.99')).toBe(1999);
  });

  // Edge cases
  it('handles zero', () => {
    expect(parseAmount('0')).toBe(0);
  });

  it('rounds to nearest cent for >2 decimals', () => {
    expect(parseAmount('10.999')).toBe(1100);
  });

  // Error cases
  it('throws on non-numeric input', () => {
    expect(() => parseAmount('abc')).toThrow('Invalid amount');
  });

  it('throws on negative values', () => {
    expect(() => parseAmount('-5')).toThrow('Amount must be positive');
  });

  it('throws on empty string', () => {
    expect(() => parseAmount('')).toThrow('Invalid amount');
  });
});
```

### Integration Tests

Tests interaction between components — API + DB, service + service.

**Quality bar:**
- Execution: <2s per test
- Uses real dependencies where practical (test DB), mocks expensive ones (payment APIs)
- Tests data flow end-to-end through the integration boundary
- Verifies side effects (DB writes, queue messages, cache updates)

```typescript
// ✅ Good integration test — real DB, verifies side effects
describe('POST /api/orders', () => {
  beforeEach(async () => {
    await db.migrate.latest();
    await db.seed.run();
  });

  afterEach(async () => {
    await db('orders').truncate();
  });

  it('creates order, deducts inventory, and sends confirmation email', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ items: [{ sku: 'WIDGET-1', quantity: 2 }] });

    expect(res.status).toBe(201);
    expect(res.body.orderId).toBeDefined();

    // Verify inventory was deducted (side effect)
    const product = await db('products').where({ sku: 'WIDGET-1' }).first();
    expect(product.stock).toBe(8); // Was 10, ordered 2

    // Verify email was queued (side effect)
    expect(mockEmailQueue.add).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'order-confirmation', orderId: res.body.orderId })
    );
  });

  it('returns 409 when insufficient stock', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ items: [{ sku: 'WIDGET-1', quantity: 999 }] });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Insufficient stock');

    // Verify no order was created (rollback worked)
    const orders = await db('orders').where({ userId: testUser.id });
    expect(orders).toHaveLength(0);
  });
});
```

```go
// ✅ Go integration test with test database
func TestCreateOrder_Integration(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping integration test")
    }

    db := testutil.SetupTestDB(t)
    repo := postgres.NewOrderRepo(db)
    svc := order.NewService(repo, &mockPayment{})

    t.Run("creates order and persists to DB", func(t *testing.T) {
        ord, err := svc.Create(ctx, order.CreateInput{
            UserID: "user-1",
            Items:  []order.Item{{SKU: "W-1", Qty: 2, Price: 1500}},
        })

        require.NoError(t, err)
        assert.NotEmpty(t, ord.ID)

        // Verify persisted
        found, err := repo.GetByID(ctx, ord.ID)
        require.NoError(t, err)
        assert.Equal(t, "user-1", found.UserID)
        assert.Equal(t, 3000, found.Total)
    })
}
```

### E2E Tests

Tests the full system from the user's perspective.

**Quality bar:**
- Only critical paths (login, checkout, signup, core workflows)
- Clean state between tests (seed, truncate, or isolated accounts)
- Stable selectors (`data-testid`, not CSS classes or text content)
- Retry logic for DOM operations (network, rendering delays)

**Review flags:**
- More than 20 E2E tests? → Too many. Move non-critical flows to integration tests
- Tests sharing state (user accounts, data)? → Will break in parallel
- Using `sleep()` or `waitForTimeout()`? → Use `waitForSelector()` or assertions instead
- Testing API responses in E2E? → That's an integration test

```typescript
// ✅ E2E test — critical flow, stable selectors, clean state
test('user can complete checkout flow', async ({ page }) => {
  await page.goto('/products');

  // Add item to cart
  await page.getByTestId('product-widget-1').getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');

  // Go to checkout
  await page.getByTestId('cart-icon').click();
  await page.getByRole('button', { name: 'Checkout' }).click();

  // Fill payment (using test card)
  await page.getByLabel('Card number').fill('4242424242424242');
  await page.getByLabel('Expiry').fill('12/30');
  await page.getByLabel('CVC').fill('123');

  // Complete order
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page.getByTestId('order-confirmation')).toBeVisible();
  await expect(page.getByTestId('order-id')).not.toBeEmpty();
});
```

## Mock Hygiene

### When to Mock

| Dependency | Mock it? | Why |
|-----------|----------|-----|
| External APIs (Stripe, SendGrid) | **Yes** | Slow, costs money, unreliable in CI |
| Database (unit tests) | **Yes** | Keep unit tests fast |
| Database (integration tests) | **No** | Use a real test database |
| File system | **Usually yes** | Use `memfs` or temp dirs |
| Time/dates | **Yes** | `jest.useFakeTimers()` or `time.Now` injection |
| Sibling services (same team) | **Depends** | Mock for unit, real for integration |
| The module under test | **Never** | You're testing your mock, not your code |

### Mock Drift — The Silent Bug

Mocks that don't match the real interface cause tests to pass but production to break:

```typescript
// ❌ Mock returns string, but real API returns { data: string }
const mockApi = { getUser: jest.fn().mockResolvedValue('Jane') };

// ✅ Mock matches real API shape — use the actual type
const mockApi: UserApi = { getUser: jest.fn().mockResolvedValue({ data: { name: 'Jane', id: '1' } }) };
```

**Prevention:** Type your mocks. Use `jest.Mocked<typeof RealService>` or Go interfaces.

### Mock Cleanup

```typescript
// ❌ Mock state leaks between tests
const mockDb = { query: jest.fn().mockResolvedValue([]) };

// ✅ Reset between tests
afterEach(() => {
  jest.resetAllMocks();  // Clears call history AND implementations
});
```

## Coverage Review

### Coverage Numbers Aren't Everything

```
Lines:     95% ← looks great
Branches:  60% ← error paths untested
Functions: 80% ← some public API untested
```

**Branch coverage is the one that matters.** A function can have 95% line coverage but 0% error-path coverage if only the happy path runs.

### Red Flags in Coverage Reports

| Signal | Problem |
|--------|---------|
| 100% lines, low branches | Error paths not tested |
| High coverage, all mocked | Not testing real behavior |
| Coverage only from E2E | Fragile, slow suite |
| Uncovered auth/payment code | Security-critical paths unprotected |
| Sudden coverage drop in PR | New code added without tests |

### What to Actually Cover

**Must have 90%+ branch coverage:**
- Authentication and authorization
- Payment processing and financial calculations
- Data validation and sanitization
- State transitions (order status, user lifecycle)

**80%+ is fine:**
- CRUD operations
- API request/response mapping
- UI component rendering

**Skip (or test lightly):**
- Generated code (Prisma client, protobuf stubs, GraphQL types)
- Pure config files
- Type definitions (interfaces, types)

## Review Output Template

When reviewing tests, structure your findings:

```markdown
## Test Review: [file or module]

### Coverage Assessment
- Happy path: ✅/❌
- Error cases: ✅/❌ — [which ones missing]
- Edge cases: ✅/❌ — [which ones missing]
- Security paths: ✅/❌/N/A

### Anti-Patterns Found
1. [Pattern name] (line N) — [one-sentence fix]

### Missing Tests
- [ ] [Scenario that should be tested]
- [ ] [Another scenario]

### Mock Quality
- Typed mocks: ✅/❌
- Cleanup: ✅/❌
- Realistic values: ✅/❌

### Verdict
[PASS / NEEDS WORK / BLOCKING] — [one-sentence summary]
```
