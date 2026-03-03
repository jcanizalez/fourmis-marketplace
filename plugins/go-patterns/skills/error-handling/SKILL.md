---
description: When the user asks about Go error handling, error wrapping, fmt.Errorf with %w, custom error types, errors.Is, errors.As, sentinel errors, multi-error patterns, or best practices for handling errors in Go
---

# Error Handling

## The Basics

Go has no exceptions. Errors are values — returned as the last value from functions.

```go
// Always check errors — never ignore them
result, err := doSomething()
if err != nil {
    return fmt.Errorf("doSomething failed: %w", err)
}
```

### The if err != nil Pattern
```go
func readConfig(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("read config %s: %w", path, err)
    }

    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return nil, fmt.Errorf("parse config %s: %w", path, err)
    }

    if err := cfg.Validate(); err != nil {
        return nil, fmt.Errorf("validate config: %w", err)
    }

    return &cfg, nil
}
```

---

## Error Wrapping

### fmt.Errorf with %w
```go
// %w wraps the error — preserves the chain for errors.Is/As
func getUser(id string) (*User, error) {
    row := db.QueryRow("SELECT * FROM users WHERE id = $1", id)

    var u User
    if err := row.Scan(&u.ID, &u.Name, &u.Email); err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, fmt.Errorf("user %s not found: %w", id, ErrNotFound)
        }
        return nil, fmt.Errorf("query user %s: %w", id, err)
    }
    return &u, nil
}

// %v (without w) creates a NEW error — breaks the chain
// Use this only when you intentionally want to hide the underlying error
```

### Add Context at Each Layer
```go
// ❌ Bad — no context, unhelpful
if err != nil {
    return err
}

// ❌ Bad — redundant "error" or "failed to"
return fmt.Errorf("error: failed to read file: %w", err)

// ✅ Good — concise context: what + why
return fmt.Errorf("read config %s: %w", path, err)
return fmt.Errorf("connect to database: %w", err)
return fmt.Errorf("create user %q: %w", name, err)
```

---

## Sentinel Errors

Package-level error values for known conditions.

```go
package storage

import "errors"

// Sentinel errors — exported, named ErrXxx
var (
    ErrNotFound     = errors.New("not found")
    ErrConflict     = errors.New("already exists")
    ErrUnauthorized = errors.New("unauthorized")
    ErrForbidden    = errors.New("forbidden")
)

// Check with errors.Is (works through wrapping chain)
func handleErr(err error) {
    if errors.Is(err, ErrNotFound) {
        // handle not found
    } else if errors.Is(err, ErrConflict) {
        // handle conflict
    }
}
```

---

## Custom Error Types

### Error with Fields
```go
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation error: %s: %s", e.Field, e.Message)
}

func validateAge(age int) error {
    if age < 0 || age > 150 {
        return &ValidationError{
            Field:   "age",
            Message: fmt.Sprintf("must be 0-150, got %d", age),
        }
    }
    return nil
}

// Check with errors.As — extracts the typed error
func handleErr(err error) {
    var valErr *ValidationError
    if errors.As(err, &valErr) {
        fmt.Printf("field %s: %s\n", valErr.Field, valErr.Message)
    }
}
```

### HTTP Error Type
```go
type HTTPError struct {
    Code    int
    Message string
    Err     error // underlying error
}

func (e *HTTPError) Error() string {
    if e.Err != nil {
        return fmt.Sprintf("HTTP %d: %s: %v", e.Code, e.Message, e.Err)
    }
    return fmt.Sprintf("HTTP %d: %s", e.Code, e.Message)
}

func (e *HTTPError) Unwrap() error {
    return e.Err // allows errors.Is/As to check the chain
}

// Constructors
func NewNotFoundError(resource string) *HTTPError {
    return &HTTPError{Code: 404, Message: resource + " not found"}
}

func NewInternalError(err error) *HTTPError {
    return &HTTPError{Code: 500, Message: "internal server error", Err: err}
}
```

### Error with Stack (via Unwrap)
```go
// errors.Is walks the Unwrap chain
err := fmt.Errorf("save user: %w",
    fmt.Errorf("insert row: %w",
        fmt.Errorf("connect to db: %w", pgErr)))

errors.Is(err, pgErr)  // true — finds it in the chain
```

---

## errors.Is vs errors.As

```go
// errors.Is — check if ANY error in the chain matches a VALUE
if errors.Is(err, sql.ErrNoRows) {
    // handle not found
}

if errors.Is(err, context.DeadlineExceeded) {
    // handle timeout
}

// errors.As — extract a specific error TYPE from the chain
var pgErr *pgconn.PgError
if errors.As(err, &pgErr) {
    fmt.Println("PG code:", pgErr.Code) // e.g., "23505" for unique violation
}

var httpErr *HTTPError
if errors.As(err, &httpErr) {
    w.WriteHeader(httpErr.Code)
}
```

---

## Multi-Error (Go 1.20+)

### errors.Join
```go
func validateUser(u User) error {
    var errs []error

    if u.Name == "" {
        errs = append(errs, &ValidationError{Field: "name", Message: "required"})
    }
    if u.Email == "" {
        errs = append(errs, &ValidationError{Field: "email", Message: "required"})
    }
    if u.Age < 0 {
        errs = append(errs, &ValidationError{Field: "age", Message: "must be positive"})
    }

    return errors.Join(errs...) // returns nil if errs is empty
}

// errors.Is works on joined errors — checks ALL of them
err := validateUser(user)
if errors.Is(err, someSpecificErr) {
    // found in the joined set
}
```

---

## Error Handling in Goroutines

### Don't Let Goroutine Errors Disappear
```go
// ❌ Bad — error is silently lost
go func() {
    if err := process(); err != nil {
        log.Println(err) // logged but caller never knows
    }
}()

// ✅ Good — send error back via channel
errCh := make(chan error, 1)
go func() {
    errCh <- process()
}()

if err := <-errCh; err != nil {
    return fmt.Errorf("process: %w", err)
}

// ✅ Best — use errgroup
g, ctx := errgroup.WithContext(ctx)
g.Go(func() error {
    return process(ctx)
})
if err := g.Wait(); err != nil {
    return err
}
```

---

## Panic and Recover

### When to Panic
```go
// Panic for programmer errors — things that should NEVER happen
func MustCompileRegex(pattern string) *regexp.Regexp {
    re, err := regexp.Compile(pattern)
    if err != nil {
        panic(fmt.Sprintf("invalid regex %q: %v", pattern, err))
    }
    return re
}

var emailRegex = MustCompileRegex(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

// ❌ Never panic for runtime errors (network, disk, user input)
```

### Recover in HTTP Handlers
```go
func recoveryMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if rec := recover(); rec != nil {
                log.Printf("panic recovered: %v\n%s", rec, debug.Stack())
                http.Error(w, "internal server error", http.StatusInternalServerError)
            }
        }()
        next.ServeHTTP(w, r)
    })
}
```

---

## Best Practices

| Rule | Example |
|------|---------|
| Always handle errors | `if err != nil { return ..., err }` |
| Add context with %w | `fmt.Errorf("create user: %w", err)` |
| Use sentinel errors for known conditions | `var ErrNotFound = errors.New("not found")` |
| Use custom types for rich errors | `*ValidationError` with fields |
| Check with Is/As, not == | `errors.Is(err, ErrNotFound)` |
| Don't log AND return | Pick one — logging + returning = duplicate noise |
| Return early on error | Keep the happy path left-aligned |
| Panic only for programmer bugs | Init-time config, impossible states |
| Use errgroup for goroutine errors | Never lose goroutine errors |
