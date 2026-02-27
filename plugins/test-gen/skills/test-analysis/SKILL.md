# Test Analysis

Analyze test coverage, find testing gaps, assess test quality, and prioritize what to test next.

## When to Activate

When the user asks to:
- Analyze test coverage or coverage reports
- Find untested code or functions
- Assess test quality or test suite health
- Identify what to test next
- Improve existing tests
- Understand coverage metrics

## Coverage Metrics Explained

| Metric | What it Measures | Target |
|--------|-----------------|--------|
| **Line coverage** | % of code lines executed by tests | 80%+ |
| **Branch coverage** | % of if/else/switch branches tested | 75%+ |
| **Function coverage** | % of functions called by tests | 90%+ |
| **Statement coverage** | % of statements executed (similar to line) | 80%+ |

### Reading Coverage Reports

```
----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------|---------|----------|---------|---------|-------------------
auth.ts   |   85.71 |    66.67 |     100 |   85.71 | 23-25,41
users.ts  |   45.00 |    20.00 |   33.33 |   45.00 | 12-30,45-67,80-95
utils.ts  |  100.00 |   100.00 |  100.00 |  100.00 |
----------|---------|----------|---------|---------|-------------------
```

**Priority**: Focus on `users.ts` — lowest coverage, most uncovered lines.

## Finding Testing Gaps

### Step 1: Identify Untested Files

Look for files with:
- 0% coverage (completely untested)
- No corresponding test file
- Complex logic but low branch coverage

### Step 2: Risk-Based Prioritization

Test critical paths first:

| Priority | Code Area | Why |
|----------|-----------|-----|
| 🔴 Critical | Auth, payments, data mutation | Security and data integrity |
| 🟠 High | API endpoints, business logic | User-facing functionality |
| 🟡 Medium | Utilities, helpers, formatters | Shared code, wide blast radius |
| 🔵 Low | Config, constants, types | Rarely changes, low risk |

### Step 3: Coverage Gap Analysis

For each file, check:
- **Untested error paths** — catch blocks, error returns
- **Untested branches** — else clauses, switch defaults, early returns
- **Untested edge cases** — null inputs, empty arrays, boundary values
- **Dead code** — unreachable code that shows as uncovered

## Test Quality Assessment

High coverage ≠ good tests. Assess quality by checking:

### 1. Assertion Density
```typescript
// BAD — test with no meaningful assertion
it('should work', () => {
  const result = doSomething();
  expect(result).toBeDefined(); // too vague
});

// GOOD — specific assertion
it('should calculate total with tax', () => {
  const result = calculateTotal([10, 20], 0.1);
  expect(result).toBe(33);
});
```

### 2. Test Independence
```typescript
// BAD — tests depend on each other
it('creates user', () => { userId = createUser(); });
it('gets user', () => { getUser(userId); }); // depends on previous test

// GOOD — each test is self-contained
it('creates user', () => {
  const userId = createUser();
  expect(userId).toBeDefined();
});
it('gets user', () => {
  const userId = createUser(); // setup in THIS test
  const user = getUser(userId);
  expect(user).toBeDefined();
});
```

### 3. Behavioral Testing
```typescript
// BAD — testing implementation
it('should call db.save', () => {
  createUser('Alice');
  expect(db.save).toHaveBeenCalledWith({ name: 'Alice' });
});

// GOOD — testing behavior
it('should persist user', () => {
  createUser('Alice');
  const user = getUser('Alice');
  expect(user.name).toBe('Alice');
});
```

### 4. Flaky Test Detection

Flaky tests fail intermittently. Common causes:
- **Timing**: `setTimeout`, race conditions, async operations without proper awaiting
- **Order dependency**: Tests pass only in specific order
- **Shared state**: Global variables modified between tests
- **External services**: Network calls, file system timing
- **Time-sensitive**: Tests checking `new Date()` or timestamps

## Running Coverage Commands

| Framework | Command |
|-----------|---------|
| Jest | `npx jest --coverage` |
| Vitest | `npx vitest run --coverage` |
| pytest | `pytest --cov=src --cov-report=html` |
| Go | `go test -coverprofile=coverage.out ./...` then `go tool cover -html=coverage.out` |
| Istanbul/nyc | `npx nyc npm test` |

## Coverage Strategy

### When 0% Coverage
1. Start with integration tests for the main happy path
2. Add unit tests for complex business logic
3. Add error case tests
4. Gradually increase coverage sprint by sprint

### When 60-80% Coverage
1. Run coverage report, find uncovered lines
2. Focus on untested branches and error paths
3. Add edge case tests for complex functions
4. Consider property-based testing for algorithmic code

### When 80%+ Coverage
1. Focus on test quality over quantity
2. Add mutation testing to verify test effectiveness
3. Review for flaky tests and fix
4. Add performance tests for critical paths
