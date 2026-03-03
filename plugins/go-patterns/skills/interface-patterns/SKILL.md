---
description: When the user asks about Go interfaces, implicit interfaces, interface composition, type assertions, type switches, common Go interfaces like io.Reader or io.Writer, dependency injection in Go, or mocking with interfaces
---

# Interface Patterns

## Implicit Interfaces

Go interfaces are satisfied **implicitly** — no `implements` keyword. If a type has the right methods, it satisfies the interface automatically.

```go
// Define the interface
type Writer interface {
    Write(p []byte) (n int, err error)
}

// os.File satisfies Writer — it has a Write method
// bytes.Buffer satisfies Writer — it has a Write method
// No declaration needed. Just implement the methods.

func writeData(w Writer, data []byte) error {
    _, err := w.Write(data)
    return err
}

// Works with any Writer
writeData(os.Stdout, []byte("hello"))
writeData(&bytes.Buffer{}, []byte("hello"))
```

---

## Interface Design Rules

### Accept Interfaces, Return Structs
```go
// ✅ Good — function accepts interface (flexible for callers)
func ProcessData(r io.Reader) error {
    data, err := io.ReadAll(r)
    // ...
}

// ✅ Good — function returns concrete type (callers get full API)
func NewServer(addr string) *Server {
    return &Server{addr: addr}
}

// ❌ Bad — returning interface hides the concrete type
func NewServer(addr string) ServerInterface {
    return &Server{addr: addr}
}
```

### Keep Interfaces Small
```go
// ✅ Good — small, focused interfaces
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

// Compose when needed
type ReadWriter interface {
    Reader
    Writer
}

// ❌ Bad — kitchen-sink interface
type UserService interface {
    GetUser(id string) (*User, error)
    ListUsers() ([]*User, error)
    CreateUser(u *User) error
    UpdateUser(u *User) error
    DeleteUser(id string) error
    GetUserPosts(id string) ([]*Post, error)
    GetUserComments(id string) ([]*Comment, error)
    // ... 20 more methods
}
```

### Define Interfaces Where They're Used (Consumer Side)
```go
// package handler — defines the interface IT needs
type UserGetter interface {
    GetUser(ctx context.Context, id string) (*User, error)
}

type Handler struct {
    users UserGetter // depends on interface, not concrete type
}

// package storage — implements it without knowing about handler
type PostgresStore struct {
    db *sql.DB
}

func (s *PostgresStore) GetUser(ctx context.Context, id string) (*User, error) {
    // ...
}

// PostgresStore satisfies handler.UserGetter implicitly
```

---

## Interface Composition

```go
// Small interfaces compose into larger ones
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Closer interface {
    Close() error
}

type ReadCloser interface {
    Reader
    Closer
}

// Real-world composition
type Repository interface {
    UserReader
    UserWriter
}

type UserReader interface {
    GetUser(ctx context.Context, id string) (*User, error)
    ListUsers(ctx context.Context, opts ListOpts) ([]*User, error)
}

type UserWriter interface {
    CreateUser(ctx context.Context, u *User) error
    UpdateUser(ctx context.Context, u *User) error
    DeleteUser(ctx context.Context, id string) error
}
```

---

## Type Assertions & Type Switches

### Type Assertion
```go
// Assert that interface value holds a specific type
var w io.Writer = os.Stdout

// Two-value form (safe)
f, ok := w.(*os.File)
if ok {
    fmt.Println("is a file:", f.Name())
}

// Single-value form (panics if wrong)
f := w.(*os.File) // panics if w is not *os.File
```

### Type Switch
```go
func describe(i interface{}) string {
    switch v := i.(type) {
    case string:
        return fmt.Sprintf("string of length %d", len(v))
    case int:
        return fmt.Sprintf("integer: %d", v)
    case bool:
        return fmt.Sprintf("boolean: %t", v)
    case error:
        return fmt.Sprintf("error: %s", v.Error())
    case nil:
        return "nil"
    default:
        return fmt.Sprintf("unknown type: %T", v)
    }
}
```

### Error Type Switch
```go
func handleError(err error) int {
    switch {
    case errors.Is(err, ErrNotFound):
        return http.StatusNotFound
    case errors.Is(err, ErrUnauthorized):
        return http.StatusUnauthorized
    case errors.Is(err, ErrForbidden):
        return http.StatusForbidden
    default:
        return http.StatusInternalServerError
    }
}
```

---

## Common Standard Library Interfaces

| Interface | Method(s) | Used By |
|-----------|-----------|---------|
| `io.Reader` | `Read([]byte) (int, error)` | Files, HTTP bodies, buffers |
| `io.Writer` | `Write([]byte) (int, error)` | Files, HTTP responses, buffers |
| `io.Closer` | `Close() error` | Files, connections, HTTP bodies |
| `io.ReadWriter` | Read + Write | Pipes, buffers |
| `io.ReadCloser` | Read + Close | HTTP response body |
| `fmt.Stringer` | `String() string` | fmt.Println, %s formatting |
| `error` | `Error() string` | All error values |
| `sort.Interface` | `Len()`, `Less()`, `Swap()` | Sorting slices |
| `http.Handler` | `ServeHTTP(w, r)` | HTTP handlers |
| `json.Marshaler` | `MarshalJSON() ([]byte, error)` | Custom JSON encoding |
| `json.Unmarshaler` | `UnmarshalJSON([]byte) error` | Custom JSON decoding |
| `context.Context` | `Deadline()`, `Done()`, `Err()`, `Value()` | Request scoping |

### Implementing Stringer
```go
type Status int

const (
    StatusActive Status = iota
    StatusInactive
    StatusBanned
)

func (s Status) String() string {
    switch s {
    case StatusActive:
        return "active"
    case StatusInactive:
        return "inactive"
    case StatusBanned:
        return "banned"
    default:
        return fmt.Sprintf("Status(%d)", s)
    }
}

fmt.Println(StatusActive) // "active" (not "0")
```

---

## Dependency Injection

### Constructor Injection
```go
type UserHandler struct {
    store  UserStore
    logger *slog.Logger
}

type UserStore interface {
    GetUser(ctx context.Context, id string) (*User, error)
    CreateUser(ctx context.Context, u *User) error
}

func NewUserHandler(store UserStore, logger *slog.Logger) *UserHandler {
    return &UserHandler{
        store:  store,
        logger: logger,
    }
}

// In main.go — wire up concrete implementations
func main() {
    db := connectDB()
    store := postgres.NewUserStore(db)
    logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

    handler := NewUserHandler(store, logger)
    // ...
}
```

---

## Mocking with Interfaces

```go
// In tests, create a mock that satisfies the interface
type mockUserStore struct {
    users map[string]*User
    err   error
}

func (m *mockUserStore) GetUser(_ context.Context, id string) (*User, error) {
    if m.err != nil {
        return nil, m.err
    }
    u, ok := m.users[id]
    if !ok {
        return nil, ErrNotFound
    }
    return u, nil
}

func (m *mockUserStore) CreateUser(_ context.Context, u *User) error {
    if m.err != nil {
        return m.err
    }
    m.users[u.ID] = u
    return nil
}

// Test
func TestGetUser(t *testing.T) {
    store := &mockUserStore{
        users: map[string]*User{
            "123": {ID: "123", Name: "Alice"},
        },
    }

    handler := NewUserHandler(store, slog.Default())
    // test handler methods...
}
```

---

## The Empty Interface

```go
// any (alias for interface{}) accepts any value
func printAnything(v any) {
    fmt.Printf("type=%T value=%v\n", v, v)
}

// ⚠️ Use sparingly — you lose type safety
// Prefer specific interfaces or generics (Go 1.18+)
```

## When to Use What

| Need | Approach |
|------|----------|
| Decouple packages | Interface at consumer side |
| Multiple implementations | Interface with small method set |
| Testing / mocking | Interface for external dependencies |
| JSON custom encoding | Implement `json.Marshaler` |
| Flexible I/O | Accept `io.Reader`/`io.Writer` |
| Type-safe containers | Generics (Go 1.18+), not `interface{}` |
