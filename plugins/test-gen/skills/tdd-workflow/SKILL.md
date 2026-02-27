# TDD Workflow

Guide test-driven development — write tests first, implement to pass, then refactor. Covers the Red-Green-Refactor cycle across all major testing frameworks.

## When to Activate

When the user asks to:
- Do test-driven development (TDD)
- Write tests before implementation
- Follow Red-Green-Refactor
- Build a feature using TDD
- Learn or practice TDD methodology

## The Red-Green-Refactor Cycle

```
    ┌─────────┐
    │  RED    │ ← Write a failing test
    └────┬────┘
         ↓
    ┌─────────┐
    │  GREEN  │ ← Write minimal code to pass
    └────┬────┘
         ↓
    ┌──────────┐
    │ REFACTOR │ ← Improve code, tests still pass
    └────┬─────┘
         ↓
    (repeat)
```

### Step 1: RED — Write a Failing Test

```typescript
// Start with the simplest possible test
describe('EmailValidator', () => {
  it('should accept valid email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });
});
```

Run test → **FAILS** (function doesn't exist yet). Good.

### Step 2: GREEN — Make It Pass

```typescript
// Write the MINIMUM code to pass
function isValidEmail(email: string): boolean {
  return email.includes('@');
}
```

Run test → **PASSES**. Good. But the implementation is naive.

### Step 3: REFACTOR — Improve

Don't add features. Improve the code quality:
- Remove duplication
- Improve naming
- Extract constants
- Simplify logic

Tests must still pass after refactoring.

### Step 4: Next RED — Add Another Test

```typescript
it('should reject email without domain', () => {
  expect(isValidEmail('user@')).toBe(false);
});
```

Run → **FAILS**. Improve implementation. Repeat.

## TDD Rules

1. **Write a test before writing code** — never write production code without a failing test
2. **Write only enough test to fail** — don't write 10 tests at once
3. **Write only enough code to pass** — resist adding "bonus" features
4. **Refactor after green** — clean code while tests protect you
5. **Run tests after every change** — fast feedback loop

## TDD Applied to a Feature

### Example: Building a URL Shortener

**Iteration 1**: Basic shortening
```typescript
// RED
it('should generate a short code for a URL', () => {
  const result = shortenUrl('https://example.com/very/long/path');
  expect(result.code).toHaveLength(6);
  expect(result.originalUrl).toBe('https://example.com/very/long/path');
});

// GREEN
function shortenUrl(url: string) {
  const code = Math.random().toString(36).slice(2, 8);
  return { code, originalUrl: url };
}
```

**Iteration 2**: Lookup
```typescript
// RED
it('should retrieve original URL by short code', () => {
  const { code } = shortenUrl('https://example.com');
  const original = lookupUrl(code);
  expect(original).toBe('https://example.com');
});

// GREEN — add storage
const store = new Map<string, string>();
function shortenUrl(url: string) {
  const code = Math.random().toString(36).slice(2, 8);
  store.set(code, url);
  return { code, originalUrl: url };
}
function lookupUrl(code: string): string | null {
  return store.get(code) ?? null;
}
```

**Iteration 3**: Validation
```typescript
// RED
it('should reject invalid URLs', () => {
  expect(() => shortenUrl('not-a-url')).toThrow('Invalid URL');
});

// GREEN — add validation
function shortenUrl(url: string) {
  try { new URL(url); } catch { throw new Error('Invalid URL'); }
  // ... rest
}
```

## When TDD Works Best

| Scenario | TDD Value |
|----------|-----------|
| Business logic with clear rules | ⭐⭐⭐ Excellent |
| Data transformations | ⭐⭐⭐ Excellent |
| API endpoint handlers | ⭐⭐ Good |
| Algorithm implementation | ⭐⭐⭐ Excellent |
| Bug fixes (write test that reproduces bug first) | ⭐⭐⭐ Excellent |
| Exploratory/prototyping | ⭐ Low (write tests after) |
| UI components | ⭐ Low (hard to test-drive visual design) |
| Infrastructure/config | ⭐ Low (integration tests better) |

## TDD Anti-Patterns to Avoid

1. **Writing too many tests before coding** — write one test at a time
2. **Testing implementation details** — test behavior, not internals
3. **Skipping refactor step** — accumulates technical debt
4. **Making test pass with hardcoded values** — the Fake It pattern is temporary, keep iterating
5. **Not running tests between changes** — defeats the purpose of fast feedback

## Watch Mode for TDD

```bash
# Jest
npx jest --watch

# Vitest
npx vitest

# pytest
ptw          # pytest-watch
pytest-xdist # parallel

# Go
# Use tools like `air` or `watchexec`
watchexec -e go "go test ./..."
```
