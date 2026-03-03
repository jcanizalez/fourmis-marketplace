---
description: When the user asks about Go HTTP servers, net/http, HTTP handlers, middleware in Go, JSON APIs in Go, graceful shutdown, Go 1.22 routing, or building REST APIs with Go standard library
---

# HTTP Patterns

## HTTP Server (net/http)

### Basic Server
```go
package main

import (
    "encoding/json"
    "log"
    "net/http"
)

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("GET /healthz", handleHealth)
    mux.HandleFunc("GET /api/users/{id}", handleGetUser)
    mux.HandleFunc("POST /api/users", handleCreateUser)

    log.Println("listening on :8080")
    log.Fatal(http.ListenAndServe(":8080", mux))
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("ok"))
}
```

### Go 1.22+ Enhanced Routing
```go
mux := http.NewServeMux()

// Method + path pattern
mux.HandleFunc("GET /api/users", listUsers)
mux.HandleFunc("GET /api/users/{id}", getUser)
mux.HandleFunc("POST /api/users", createUser)
mux.HandleFunc("PUT /api/users/{id}", updateUser)
mux.HandleFunc("DELETE /api/users/{id}", deleteUser)

// Path parameters
func getUser(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id") // Go 1.22+
    // ...
}

// Wildcard — matches /files/any/nested/path
mux.HandleFunc("GET /files/{path...}", serveFile)

func serveFile(w http.ResponseWriter, r *http.Request) {
    path := r.PathValue("path") // "any/nested/path"
    // ...
}
```

---

## JSON Request/Response

### JSON Response Helper
```go
func writeJSON(w http.ResponseWriter, status int, data any) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    if err := json.NewEncoder(w).Encode(data); err != nil {
        log.Printf("write JSON: %v", err)
    }
}

func writeError(w http.ResponseWriter, status int, message string) {
    writeJSON(w, status, map[string]string{"error": message})
}
```

### JSON Request Decoding
```go
func decodeJSON[T any](r *http.Request) (T, error) {
    var v T
    decoder := json.NewDecoder(r.Body)
    decoder.DisallowUnknownFields() // reject extra fields
    if err := decoder.Decode(&v); err != nil {
        return v, fmt.Errorf("decode JSON: %w", err)
    }
    return v, nil
}

// Usage
func handleCreateUser(w http.ResponseWriter, r *http.Request) {
    type CreateUserRequest struct {
        Name  string `json:"name"`
        Email string `json:"email"`
    }

    req, err := decodeJSON[CreateUserRequest](r)
    if err != nil {
        writeError(w, http.StatusBadRequest, "invalid JSON")
        return
    }

    if req.Name == "" || req.Email == "" {
        writeError(w, http.StatusBadRequest, "name and email required")
        return
    }

    user, err := store.CreateUser(r.Context(), req.Name, req.Email)
    if err != nil {
        writeError(w, http.StatusInternalServerError, "failed to create user")
        return
    }

    writeJSON(w, http.StatusCreated, user)
}
```

### Struct Tags for JSON
```go
type User struct {
    ID        string    `json:"id"`
    Name      string    `json:"name"`
    Email     string    `json:"email"`
    Password  string    `json:"-"`                  // never include in JSON
    Age       int       `json:"age,omitempty"`       // omit if zero value
    CreatedAt time.Time `json:"created_at"`
}
```

---

## Middleware

### Middleware Pattern
```go
// Middleware is a function that wraps an http.Handler
type Middleware func(http.Handler) http.Handler

// Logging middleware
func logging(logger *slog.Logger) Middleware {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            start := time.Now()

            // Wrap ResponseWriter to capture status code
            wrapped := &statusWriter{ResponseWriter: w, status: http.StatusOK}

            next.ServeHTTP(wrapped, r)

            logger.Info("request",
                "method", r.Method,
                "path", r.URL.Path,
                "status", wrapped.status,
                "duration", time.Since(start),
            )
        })
    }
}

type statusWriter struct {
    http.ResponseWriter
    status int
}

func (w *statusWriter) WriteHeader(code int) {
    w.status = code
    w.ResponseWriter.WriteHeader(code)
}
```

### Recovery Middleware
```go
func recovery() Middleware {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            defer func() {
                if rec := recover(); rec != nil {
                    slog.Error("panic recovered",
                        "error", rec,
                        "stack", string(debug.Stack()),
                    )
                    writeError(w, http.StatusInternalServerError, "internal server error")
                }
            }()
            next.ServeHTTP(w, r)
        })
    }
}
```

### CORS Middleware
```go
func cors(origin string) Middleware {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            w.Header().Set("Access-Control-Allow-Origin", origin)
            w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

            if r.Method == http.MethodOptions {
                w.WriteHeader(http.StatusNoContent)
                return
            }

            next.ServeHTTP(w, r)
        })
    }
}
```

### Chaining Middleware
```go
func chain(handler http.Handler, middlewares ...Middleware) http.Handler {
    // Apply in reverse so first middleware is outermost
    for i := len(middlewares) - 1; i >= 0; i-- {
        handler = middlewares[i](handler)
    }
    return handler
}

// Usage
func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("GET /api/users", listUsers)

    handler := chain(mux,
        recovery(),
        logging(slog.Default()),
        cors("*"),
    )

    http.ListenAndServe(":8080", handler)
}
```

---

## HTTP Client

### Production-Grade Client
```go
func newHTTPClient() *http.Client {
    return &http.Client{
        Timeout: 10 * time.Second,
        Transport: &http.Transport{
            MaxIdleConns:        100,
            MaxIdleConnsPerHost: 10,
            IdleConnTimeout:     90 * time.Second,
        },
    }
}

// Always pass context for cancellation
func fetchJSON[T any](ctx context.Context, client *http.Client, url string) (T, error) {
    var result T

    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return result, fmt.Errorf("create request: %w", err)
    }
    req.Header.Set("Accept", "application/json")

    resp, err := client.Do(req)
    if err != nil {
        return result, fmt.Errorf("execute request: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        body, _ := io.ReadAll(resp.Body)
        return result, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
    }

    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return result, fmt.Errorf("decode response: %w", err)
    }

    return result, nil
}
```

---

## Graceful Shutdown

```go
func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("GET /healthz", handleHealth)

    srv := &http.Server{
        Addr:         ":8080",
        Handler:      mux,
        ReadTimeout:  5 * time.Second,
        WriteTimeout: 10 * time.Second,
        IdleTimeout:  120 * time.Second,
    }

    // Start server in goroutine
    go func() {
        slog.Info("server starting", "addr", srv.Addr)
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            slog.Error("server error", "error", err)
            os.Exit(1)
        }
    }()

    // Wait for interrupt signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    slog.Info("shutting down gracefully...")

    // Give active connections 30 seconds to finish
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        slog.Error("forced shutdown", "error", err)
    }

    slog.Info("server stopped")
}
```

---

## Structured API Response

```go
type APIResponse[T any] struct {
    Data  T      `json:"data,omitempty"`
    Error string `json:"error,omitempty"`
    Meta  *Meta  `json:"meta,omitempty"`
}

type Meta struct {
    Total int `json:"total,omitempty"`
    Page  int `json:"page,omitempty"`
    Limit int `json:"limit,omitempty"`
}

func respondOK[T any](w http.ResponseWriter, data T) {
    writeJSON(w, http.StatusOK, APIResponse[T]{Data: data})
}

func respondList[T any](w http.ResponseWriter, items []T, total, page, limit int) {
    writeJSON(w, http.StatusOK, APIResponse[[]T]{
        Data: items,
        Meta: &Meta{Total: total, Page: page, Limit: limit},
    })
}
```

---

## Quick Reference

| Pattern | When to Use |
|---------|------------|
| `http.NewServeMux()` | Standard router (Go 1.22+ for method patterns) |
| Middleware chain | Logging, auth, CORS, recovery — applied to all routes |
| `writeJSON()` helper | Every JSON API response |
| `decodeJSON[T]()` generic | Every JSON request body |
| Graceful shutdown | Every production server |
| `http.Client` with timeout | Every outbound HTTP call |
| Context propagation | Every handler → service → store call |
