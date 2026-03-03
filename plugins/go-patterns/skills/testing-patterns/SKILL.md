---
description: When the user asks about Go testing, table-driven tests, subtests, testify, httptest, benchmarks, fuzzing, golden files, test fixtures, mocking in Go, or how to write tests in Go
---

# Testing Patterns

## Table-Driven Tests

The idiomatic Go testing pattern — define inputs and expected outputs as a slice of structs.

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name string
        a, b int
        want int
    }{
        {"positive numbers", 2, 3, 5},
        {"negative numbers", -1, -2, -3},
        {"zero", 0, 0, 0},
        {"mixed", -1, 3, 2},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := Add(tt.a, tt.b)
            if got != tt.want {
                t.Errorf("Add(%d, %d) = %d, want %d", tt.a, tt.b, got, tt.want)
            }
        })
    }
}
```

### Error Cases in Table Tests
```go
func TestParseAge(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    int
        wantErr bool
    }{
        {"valid", "25", 25, false},
        {"zero", "0", 0, false},
        {"negative", "-1", 0, true},
        {"not a number", "abc", 0, true},
        {"too large", "200", 0, true},
        {"empty", "", 0, true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ParseAge(tt.input)
            if (err != nil) != tt.wantErr {
                t.Fatalf("ParseAge(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
            }
            if got != tt.want {
                t.Errorf("ParseAge(%q) = %d, want %d", tt.input, got, tt.want)
            }
        })
    }
}
```

---

## Testify Assertions

```go
import (
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestUser(t *testing.T) {
    user, err := GetUser("123")

    // require — stops test on failure (use for preconditions)
    require.NoError(t, err)
    require.NotNil(t, user)

    // assert — continues test on failure (use for checks)
    assert.Equal(t, "Alice", user.Name)
    assert.Equal(t, "alice@example.com", user.Email)
    assert.True(t, user.Active)
    assert.Len(t, user.Roles, 2)
    assert.Contains(t, user.Roles, "admin")
    assert.WithinDuration(t, time.Now(), user.CreatedAt, time.Minute)
}
```

### Common Assertions
```go
assert.Equal(t, expected, actual)         // deep equality
assert.NotEqual(t, a, b)                  // not equal
assert.Nil(t, value)                      // nil check
assert.NotNil(t, value)                   // not nil
assert.True(t, condition)                 // boolean
assert.NoError(t, err)                    // err == nil
assert.Error(t, err)                      // err != nil
assert.ErrorIs(t, err, ErrNotFound)       // errors.Is check
assert.ErrorAs(t, err, &target)           // errors.As check
assert.Contains(t, "hello world", "world") // substring
assert.Len(t, slice, 3)                   // length check
assert.Empty(t, slice)                    // empty check
assert.JSONEq(t, expected, actual)        // JSON equality (ignoring order)
```

---

## HTTP Testing with httptest

### Testing Handlers
```go
func TestGetUser(t *testing.T) {
    // Create mock store
    store := &mockUserStore{
        users: map[string]*User{
            "123": {ID: "123", Name: "Alice"},
        },
    }

    handler := NewUserHandler(store)

    // Create test request
    req := httptest.NewRequest(http.MethodGet, "/api/users/123", nil)
    req.SetPathValue("id", "123") // Go 1.22+

    // Record the response
    rec := httptest.NewRecorder()

    handler.ServeHTTP(rec, req)

    // Check response
    assert.Equal(t, http.StatusOK, rec.Code)

    var user User
    err := json.NewDecoder(rec.Body).Decode(&user)
    require.NoError(t, err)
    assert.Equal(t, "Alice", user.Name)
}
```

### Testing HTTP Client Code
```go
func TestFetchUser(t *testing.T) {
    // Create a test server
    srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        assert.Equal(t, "/api/users/123", r.URL.Path)
        assert.Equal(t, "application/json", r.Header.Get("Accept"))

        json.NewEncoder(w).Encode(User{ID: "123", Name: "Alice"})
    }))
    defer srv.Close()

    // Use test server URL
    client := NewAPIClient(srv.URL)
    user, err := client.GetUser(context.Background(), "123")

    require.NoError(t, err)
    assert.Equal(t, "Alice", user.Name)
}
```

---

## Mocking with Interfaces

```go
// Define interface at usage site
type EmailSender interface {
    Send(to, subject, body string) error
}

// Production implementation
type SMTPSender struct { /* ... */ }

func (s *SMTPSender) Send(to, subject, body string) error {
    // real SMTP logic
}

// Mock for tests
type mockEmailSender struct {
    calls []struct {
        to, subject, body string
    }
    err error
}

func (m *mockEmailSender) Send(to, subject, body string) error {
    m.calls = append(m.calls, struct{ to, subject, body string }{to, subject, body})
    return m.err
}

// Test
func TestSignup(t *testing.T) {
    mailer := &mockEmailSender{}
    svc := NewAuthService(mailer)

    err := svc.Signup("alice@example.com", "password123")
    require.NoError(t, err)

    require.Len(t, mailer.calls, 1)
    assert.Equal(t, "alice@example.com", mailer.calls[0].to)
    assert.Contains(t, mailer.calls[0].subject, "Welcome")
}
```

---

## Test Fixtures & Helpers

### testdata Directory
```
mypackage/
├── handler.go
├── handler_test.go
└── testdata/              # Go ignores this directory in builds
    ├── valid_config.json
    ├── invalid_config.json
    └── golden/
        └── user_response.json
```

```go
func TestParseConfig(t *testing.T) {
    data, err := os.ReadFile("testdata/valid_config.json")
    require.NoError(t, err)

    cfg, err := ParseConfig(data)
    require.NoError(t, err)
    assert.Equal(t, "production", cfg.Environment)
}
```

### Test Helper Functions
```go
// t.Helper() marks the function as a helper — errors point to the caller
func createTestUser(t *testing.T, store UserStore) *User {
    t.Helper()

    user := &User{
        ID:    uuid.NewString(),
        Name:  "Test User",
        Email: fmt.Sprintf("test-%s@example.com", uuid.NewString()[:8]),
    }

    err := store.CreateUser(context.Background(), user)
    require.NoError(t, err)

    return user
}

// Cleanup with t.Cleanup
func setupTestDB(t *testing.T) *sql.DB {
    t.Helper()

    db, err := sql.Open("postgres", testDSN)
    require.NoError(t, err)

    t.Cleanup(func() {
        db.Close()
    })

    return db
}
```

---

## Golden File Testing

Compare output against saved "golden" files.

```go
var update = flag.Bool("update", false, "update golden files")

func TestRenderTemplate(t *testing.T) {
    got := renderTemplate(testData)

    golden := filepath.Join("testdata", "golden", t.Name()+".html")

    if *update {
        os.MkdirAll(filepath.Dir(golden), 0o755)
        os.WriteFile(golden, []byte(got), 0o644)
        return
    }

    want, err := os.ReadFile(golden)
    require.NoError(t, err)
    assert.Equal(t, string(want), got)
}

// Update golden files: go test -run TestRenderTemplate -update
```

---

## Benchmarks

```go
func BenchmarkFibonacci(b *testing.B) {
    for i := 0; i < b.N; i++ {
        Fibonacci(30)
    }
}

// Sub-benchmarks
func BenchmarkSort(b *testing.B) {
    sizes := []int{100, 1000, 10000}

    for _, size := range sizes {
        b.Run(fmt.Sprintf("size-%d", size), func(b *testing.B) {
            data := generateSlice(size)
            b.ResetTimer() // exclude setup time

            for i := 0; i < b.N; i++ {
                sort.Ints(append([]int{}, data...)) // copy to avoid sorting sorted data
            }
        })
    }
}

// Run: go test -bench=. -benchmem
// Output:
// BenchmarkSort/size-100     500000   2340 ns/op   896 B/op   1 allocs/op
// BenchmarkSort/size-1000     50000  28400 ns/op  8192 B/op   1 allocs/op
```

---

## Fuzzing (Go 1.18+)

```go
func FuzzParseEmail(f *testing.F) {
    // Seed corpus
    f.Add("alice@example.com")
    f.Add("bob@test.co.uk")
    f.Add("")
    f.Add("not-an-email")

    f.Fuzz(func(t *testing.T, input string) {
        result, err := ParseEmail(input)
        if err != nil {
            return // invalid input is fine
        }
        // If parsing succeeds, result must be valid
        if result.Local == "" || result.Domain == "" {
            t.Errorf("ParseEmail(%q) returned empty fields: %+v", input, result)
        }
    })
}

// Run: go test -fuzz=FuzzParseEmail -fuzztime=30s
```

---

## Integration Tests with Build Tags

```go
//go:build integration

package store_test

import (
    "testing"
    "database/sql"
)

func TestPostgresUserStore(t *testing.T) {
    db, err := sql.Open("postgres", os.Getenv("TEST_DATABASE_URL"))
    require.NoError(t, err)
    defer db.Close()

    store := NewPostgresUserStore(db)
    // ... test real database operations
}

// Run: go test -tags=integration ./...
```

---

## Quick Reference

| Pattern | When |
|---------|------|
| Table-driven tests | Every test with multiple cases |
| `t.Run()` subtests | Named cases, parallel, targeted runs |
| `testify/assert` | Readable assertions |
| `testify/require` | Must-pass preconditions (stop on fail) |
| `httptest.NewRecorder()` | Test HTTP handlers |
| `httptest.NewServer()` | Test HTTP client code |
| Interface mocking | Isolate dependencies |
| `testdata/` directory | Test fixtures (JSON, configs, golden files) |
| `t.Helper()` | Custom test helper functions |
| `t.Cleanup()` | Teardown (DB, temp files) |
| Benchmarks (`b.N`) | Performance measurement |
| Fuzzing (`f.Fuzz`) | Find edge cases automatically |
| Build tags | Separate integration tests |
