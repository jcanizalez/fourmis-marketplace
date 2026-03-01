---
description: When the user asks to review tests, assess test quality, check test coverage, evaluate test reliability, find missing test cases, review unit tests, integration tests, or E2E tests, or asks about test anti-patterns and test code smells
---

# Test Review

Review test quality — coverage gaps, test reliability, anti-patterns, and missing edge cases. Covers unit, integration, and E2E test review across JavaScript/TypeScript, Python, and Go.

## Test Review Checklist

### Coverage
- [ ] Happy path tested (main success scenario)
- [ ] Error cases tested (invalid input, failures, exceptions)
- [ ] Edge cases tested (empty, null, boundary values, large inputs)
- [ ] Security-relevant paths tested (auth, authorization, input validation)
- [ ] New code has corresponding new tests
- [ ] Modified code has updated tests

### Quality
- [ ] Each test has a single, clear assertion focus
- [ ] Test names describe the behavior being verified
- [ ] Tests are independent (no ordering dependencies)
- [ ] No logic in tests (no if/else, loops, try/catch)
- [ ] Mocks/stubs are appropriate (not mocking everything)
- [ ] Fixtures are realistic (not trivial placeholder data)
- [ ] Cleanup happens in afterEach/teardown (no test pollution)

### Reliability
- [ ] No flaky indicators (timing-dependent, network calls, random data)
- [ ] Async tests properly awaited
- [ ] No shared mutable state between tests
- [ ] Deterministic — same result every run

## Test Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| **The Giant** | One test checking 10 things | Split into focused tests |
| **The Mockery** | Mocks everything including the thing being tested | Mock only external dependencies |
| **The Inspector** | Tests implementation details, not behavior | Test public API and outcomes |
| **The Flaky** | Passes sometimes, fails other times | Remove timing/network/random deps |
| **The Slow Poke** | Takes seconds per test (real DB, network) | Use in-memory doubles, mock HTTP |
| **The Freeloader** | No assertions — just runs without checking | Add meaningful assertions |
| **The Copy-Paste** | Duplicate setup across tests | Use beforeEach, test helpers, fixtures |
| **The Secret Catcher** | Catches exceptions to hide failures | Let exceptions propagate |
| **The Dead Tree** | Tests that are skipped/commented out | Delete or fix them |
| **The Liar** | Test name doesn't match what it tests | Rename to describe actual behavior |

## Test Naming Convention

Good test names describe **what** is being tested, **under what conditions**, and **what the expected result** is:

```typescript
// ❌ BAD — vague names
test('createUser', () => { ... });
test('test1', () => { ... });
test('it works', () => { ... });

// ✅ GOOD — behavior-describing names
test('createUser returns the new user with an ID', () => { ... });
test('createUser throws ValidationError when email is missing', () => { ... });
test('createUser hashes the password before storing', () => { ... });
```

### Pattern: `should <expected behavior> when <condition>`

```typescript
describe('OrderService.calculateTotal', () => {
  it('should return 0 when cart is empty', () => { ... });
  it('should apply percentage discount to subtotal', () => { ... });
  it('should not apply expired coupons', () => { ... });
  it('should add tax after discount', () => { ... });
  it('should throw when quantity is negative', () => { ... });
});
```

## What to Check by Test Type

### Unit Tests
- Tests a single function/method in isolation
- External dependencies mocked (DB, APIs, file system)
- Fast execution (<50ms per test)
- Covers: happy path, error handling, edge cases

```typescript
// ✅ Good unit test — isolated, focused, clear
describe('formatCurrency', () => {
  it('should format whole dollars without decimals', () => {
    expect(formatCurrency(100)).toBe('$100');
  });

  it('should format cents with 2 decimal places', () => {
    expect(formatCurrency(19.9)).toBe('$19.90');
  });

  it('should return $0 for zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('should handle negative amounts with minus sign', () => {
    expect(formatCurrency(-50)).toBe('-$50');
  });
});
```

### Integration Tests
- Tests interaction between components (API + DB, service + service)
- Real dependencies where practical (test DB), mocked where expensive (external APIs)
- Moderate execution time (<2s per test)
- Covers: data flow, error propagation, transaction handling

```typescript
// ✅ Good integration test — real DB, tests full flow
describe('POST /api/users', () => {
  beforeEach(async () => {
    await db.migrate.latest();
    await db.seed.run();
  });

  afterEach(async () => {
    await db.rollback();
  });

  it('should create a user and return 201', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Jane', email: 'jane@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();

    // Verify actually persisted
    const user = await db('users').where({ email: 'jane@example.com' }).first();
    expect(user).toBeDefined();
  });

  it('should return 409 when email already exists', async () => {
    // Seed already has john@example.com
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'John', email: 'john@example.com' });

    expect(res.status).toBe(409);
  });
});
```

### E2E Tests
- Tests the full system from user perspective
- Real browser/client, real server, real database
- Slow execution (acceptable: <30s per test)
- Covers: critical user flows, cross-cutting concerns

**Review flags:**
- Are only critical paths tested E2E? (login, checkout, signup)
- Are they isolated from each other (clean state)?
- Do they use stable selectors (`data-testid`, not CSS classes)?
- Is there retry logic for flaky DOM operations?

## Mock Review

### Good Mocking

```typescript
// ✅ Mock external service, test real logic
const mockPaymentGateway = {
  charge: jest.fn().mockResolvedValue({ id: 'ch_123', status: 'succeeded' }),
};

const service = new OrderService(mockPaymentGateway);
const result = await service.checkout(cart);

expect(mockPaymentGateway.charge).toHaveBeenCalledWith({
  amount: 2999,
  currency: 'usd',
});
expect(result.status).toBe('paid');
```

### Bad Mocking

```typescript
// ❌ Mocking the thing you're testing
jest.mock('./orderService');
const result = await orderService.checkout(cart);
// This tests nothing — you mocked the implementation
```

### Mock Audit Questions
- Is the mock necessary? (Could use a real lightweight implementation?)
- Does the mock match the real interface? (Mock drift is a real bug source)
- Are mock return values realistic? (Not just `true` or `{}`)
- Is `mockReset()` / `mockClear()` called between tests?

## Coverage Review

### Coverage Numbers Aren't Everything

```
Lines:     95% ← looks great
Branches:  60% ← error paths untested
Functions: 80% ← some public API untested
```

**Focus on:**
1. **Branch coverage** over line coverage — are error paths tested?
2. **Critical path coverage** — are auth, payments, data mutations tested?
3. **Meaningful coverage** — tests that actually assert things, not just run code

### Red Flags in Coverage Reports
- 100% line coverage but low branch coverage → missing error paths
- High coverage but all mocked → not testing real behavior
- Coverage only from E2E tests → fragile, slow test suite
- Uncovered files in critical paths (auth, payments, security)

## Review Output

When reviewing tests, provide:

```markdown
## Test Review: [file or test suite]

### Coverage Assessment
- Happy path: ✅/❌
- Error cases: ✅/❌
- Edge cases: ✅/❌
- Missing scenarios: [list]

### Quality Issues
- [anti-pattern found] — [suggested fix]

### Recommendations
- [actionable improvements]
```
