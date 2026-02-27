# Mocking Patterns

Create mocks, stubs, spies, and fixtures for test isolation. Covers dependency injection, module mocking, and test doubles across frameworks.

## When to Activate

When the user asks to:
- Mock a dependency, module, or external service
- Create test fixtures or test data
- Stub API calls or database queries
- Spy on function calls
- Set up test doubles
- Isolate code under test from dependencies

## Types of Test Doubles

| Type | Purpose | Example |
|------|---------|---------|
| **Stub** | Returns predetermined data | `getUser` always returns `{ id: 1, name: 'Alice' }` |
| **Mock** | Verifies interactions (calls, arguments) | Assert `sendEmail` was called with specific args |
| **Spy** | Wraps real function, records calls | Real `sendEmail` runs but calls are tracked |
| **Fake** | Working lightweight implementation | In-memory database instead of real DB |
| **Fixture** | Reusable test data setup | Pre-built user objects, seeded database |

## Jest / Vitest Mocking

### Function Mocks

```typescript
// Create a mock function
const mockFn = vi.fn(); // Vitest
const mockFn = jest.fn(); // Jest

// Mock with return value
const getUser = vi.fn().mockReturnValue({ id: 1, name: 'Alice' });

// Mock with async return
const fetchData = vi.fn().mockResolvedValue({ data: [1, 2, 3] });

// Mock with implementation
const calculate = vi.fn().mockImplementation((a, b) => a + b);

// Assertions
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockFn).toHaveBeenCalledTimes(3);
```

### Module Mocking

```typescript
// Mock an entire module
vi.mock('./database', () => ({
  query: vi.fn().mockResolvedValue([]),
  connect: vi.fn(),
}));

// Mock with factory
vi.mock('./emailService', () => {
  return {
    sendEmail: vi.fn().mockResolvedValue({ sent: true }),
    EmailClient: vi.fn().mockImplementation(() => ({
      send: vi.fn(),
    })),
  };
});

// Partial mock (keep real implementations, override specific exports)
vi.mock('./utils', async () => {
  const actual = await vi.importActual('./utils');
  return {
    ...actual,
    fetchData: vi.fn().mockResolvedValue({ data: 'mocked' }),
  };
});
```

### Spies

```typescript
// Spy on an object method
const spy = vi.spyOn(console, 'log');
doSomething();
expect(spy).toHaveBeenCalledWith('expected message');
spy.mockRestore(); // restore original

// Spy and override
vi.spyOn(Date, 'now').mockReturnValue(1000000);
```

### Timer Mocking

```typescript
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

it('should debounce calls', () => {
  const fn = vi.fn();
  const debounced = debounce(fn, 300);

  debounced();
  debounced();
  debounced();

  expect(fn).not.toHaveBeenCalled();
  vi.advanceTimersByTime(300);
  expect(fn).toHaveBeenCalledOnce();
});
```

## pytest Mocking

### unittest.mock

```python
from unittest.mock import Mock, patch, MagicMock

# Simple mock
mock_service = Mock()
mock_service.get_user.return_value = {"id": 1, "name": "Alice"}

# Patch decorator
@patch('myapp.services.send_email')
def test_registration(mock_send_email):
    register_user("alice@test.com")
    mock_send_email.assert_called_once_with("alice@test.com", subject="Welcome")

# Patch context manager
def test_with_context_manager():
    with patch('myapp.db.query') as mock_query:
        mock_query.return_value = [{"id": 1}]
        result = get_users()
        assert len(result) == 1

# Async mock
from unittest.mock import AsyncMock

mock_fetch = AsyncMock(return_value={"data": "value"})
```

### pytest Fixtures

```python
import pytest

@pytest.fixture
def sample_user():
    return {"id": 1, "name": "Alice", "email": "alice@test.com"}

@pytest.fixture
def mock_db(mocker):
    """Using pytest-mock for cleaner mocking"""
    db = mocker.patch('myapp.database.get_connection')
    db.return_value.execute.return_value = []
    return db

def test_get_user(sample_user, mock_db):
    mock_db.return_value.execute.return_value = [sample_user]
    user = get_user(1)
    assert user["name"] == "Alice"
```

## Go Mocking

### Interface-Based Mocking

```go
// Define interface for the dependency
type UserRepository interface {
    GetUser(id int) (*User, error)
    SaveUser(user *User) error
}

// Create mock implementation
type MockUserRepo struct {
    GetUserFunc func(id int) (*User, error)
    SaveUserFunc func(user *User) error
}

func (m *MockUserRepo) GetUser(id int) (*User, error) {
    return m.GetUserFunc(id)
}

func (m *MockUserRepo) SaveUser(user *User) error {
    return m.SaveUserFunc(user)
}

// Use in tests
func TestGetUserHandler(t *testing.T) {
    mockRepo := &MockUserRepo{
        GetUserFunc: func(id int) (*User, error) {
            return &User{ID: id, Name: "Alice"}, nil
        },
    }

    handler := NewUserHandler(mockRepo)
    // ... test handler
}
```

### Using testify/mock

```go
import "github.com/stretchr/testify/mock"

type MockUserRepo struct {
    mock.Mock
}

func (m *MockUserRepo) GetUser(id int) (*User, error) {
    args := m.Called(id)
    return args.Get(0).(*User), args.Error(1)
}

func TestService(t *testing.T) {
    mockRepo := new(MockUserRepo)
    mockRepo.On("GetUser", 1).Return(&User{Name: "Alice"}, nil)

    service := NewService(mockRepo)
    user, err := service.GetUser(1)

    assert.NoError(t, err)
    assert.Equal(t, "Alice", user.Name)
    mockRepo.AssertExpectations(t)
}
```

## Fixture Patterns

### Factory Functions

```typescript
// Create test objects with defaults + overrides
function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// Usage
const admin = createUser({ role: 'admin', name: 'Admin' });
const deletedUser = createUser({ deletedAt: new Date() });
```

### Builder Pattern

```typescript
class UserBuilder {
  private user: Partial<User> = {};

  withName(name: string) { this.user.name = name; return this; }
  withRole(role: string) { this.user.role = role; return this; }
  asAdmin() { this.user.role = 'admin'; return this; }
  build(): User { return createUser(this.user); }
}

// Usage
const admin = new UserBuilder().withName('Alice').asAdmin().build();
```

## When to Mock vs When Not To

### Mock These
- External APIs (HTTP calls)
- Email/SMS services
- File system (if complex interactions)
- Time/dates (use fake timers)
- Random number generation
- Environment variables

### Don't Mock These
- The code under test itself
- Simple data transformations
- Value objects and pure functions
- Things that are easy to set up for real (in-memory DB)
