# Unit Testing

Generate and write unit tests for functions, classes, and modules. Covers Jest, Vitest, pytest, Go testing, and general patterns.

## When to Activate

When the user asks to:
- Write unit tests for a function or module
- Test a specific piece of code
- Add tests to an untested file
- Generate test cases for edge cases
- Set up a test file structure

## Test File Naming Conventions

| Framework | Convention | Example |
|-----------|-----------|---------|
| Jest/Vitest | `*.test.ts`, `*.spec.ts` | `auth.test.ts` |
| pytest | `test_*.py`, `*_test.py` | `test_auth.py` |
| Go | `*_test.go` (same package) | `auth_test.go` |

## Unit Test Structure (AAA Pattern)

Every unit test follows **Arrange → Act → Assert**:

```typescript
// Jest / Vitest
describe('calculateTotal', () => {
  it('should sum items with tax', () => {
    // Arrange
    const items = [{ price: 10 }, { price: 20 }];
    const taxRate = 0.1;

    // Act
    const result = calculateTotal(items, taxRate);

    // Assert
    expect(result).toBe(33);
  });
});
```

```python
# pytest
def test_calculate_total_with_tax():
    # Arrange
    items = [{"price": 10}, {"price": 20}]
    tax_rate = 0.1

    # Act
    result = calculate_total(items, tax_rate)

    # Assert
    assert result == 33
```

```go
// Go
func TestCalculateTotal(t *testing.T) {
    // Arrange
    items := []Item{{Price: 10}, {Price: 20}}
    taxRate := 0.1

    // Act
    result := CalculateTotal(items, taxRate)

    // Assert
    if result != 33 {
        t.Errorf("expected 33, got %f", result)
    }
}
```

## What to Test

### Always Test
- **Happy path** — normal inputs, expected outputs
- **Edge cases** — empty inputs, zero values, nil/undefined/None
- **Boundary values** — min/max limits, off-by-one
- **Error cases** — invalid inputs, thrown exceptions, error returns
- **Type coercion** — strings vs numbers, null vs undefined (JS/TS)

### Skip Testing
- Third-party library internals
- Simple getters/setters with no logic
- Framework boilerplate (React component rendering without logic)
- Private methods (test through public API)

## Test Case Generation Checklist

Given a function, generate tests for:

1. **Normal input** — typical use case
2. **Empty input** — `[]`, `""`, `{}`, `None`, `nil`
3. **Single element** — array with 1 item, string with 1 char
4. **Large input** — performance edge (if applicable)
5. **Invalid type** — wrong argument type (if not type-checked)
6. **Null/undefined** — explicit null handling
7. **Boundary** — max int, min int, float precision
8. **Duplicate data** — repeated values in collections
9. **Error paths** — inputs that should throw/return errors
10. **Async behavior** — promises, callbacks, goroutines (if applicable)

## Framework-Specific Patterns

### Jest / Vitest

```typescript
// Group related tests
describe('UserService', () => {
  // Setup/teardown
  beforeEach(() => { /* reset state */ });
  afterEach(() => { /* cleanup */ });

  // Test naming: "should [expected behavior] when [condition]"
  it('should return user when id exists', async () => {
    const user = await getUser(1);
    expect(user).toEqual({ id: 1, name: 'Alice' });
  });

  it('should throw NotFoundError when id is invalid', async () => {
    await expect(getUser(-1)).rejects.toThrow(NotFoundError);
  });

  // Parameterized tests
  it.each([
    [1, 1, 2],
    [0, 0, 0],
    [-1, 1, 0],
  ])('add(%i, %i) should return %i', (a, b, expected) => {
    expect(add(a, b)).toBe(expected);
  });
});
```

### pytest

```python
import pytest

class TestUserService:
    # Fixtures for setup
    @pytest.fixture
    def service(self):
        return UserService(db=MockDB())

    def test_get_user_returns_user(self, service):
        user = service.get_user(1)
        assert user.name == "Alice"

    def test_get_user_raises_on_invalid_id(self, service):
        with pytest.raises(NotFoundError):
            service.get_user(-1)

    # Parameterized tests
    @pytest.mark.parametrize("a,b,expected", [
        (1, 1, 2),
        (0, 0, 0),
        (-1, 1, 0),
    ])
    def test_add(self, a, b, expected):
        assert add(a, b) == expected
```

### Go Table-Driven Tests

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive numbers", 1, 1, 2},
        {"zeros", 0, 0, 0},
        {"negative and positive", -1, 1, 0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := Add(tt.a, tt.b)
            if got != tt.expected {
                t.Errorf("Add(%d, %d) = %d, want %d", tt.a, tt.b, got, tt.expected)
            }
        })
    }
}
```

## Test Naming Best Practices

| Pattern | Example |
|---------|---------|
| `should [behavior] when [condition]` | `should return 404 when user not found` |
| `[method] returns [result] for [input]` | `getUser returns null for invalid id` |
| `test_[function]_[scenario]` (Python) | `test_calculate_total_with_empty_cart` |
| `Test[Function][Scenario]` (Go) | `TestCalculateTotalEmptyCart` |
