# Go Service Scaffolding

Generate production-ready Go HTTP services with standard library `net/http`, structured logging, graceful shutdown, and idiomatic project layout.

## Project Structure

```
my-service/
├── cmd/
│   └── server/
│       └── main.go             # Entry point
├── internal/
│   ├── config/
│   │   └── config.go           # Environment configuration
│   ├── handler/
│   │   ├── handler.go          # Handler struct + constructor
│   │   ├── health.go           # GET /health
│   │   ├── users.go            # /api/users handlers
│   │   └── middleware.go       # Logging, recovery, CORS, request ID
│   ├── model/
│   │   └── user.go             # Domain types
│   ├── service/
│   │   └── user.go             # Business logic
│   └── store/
│       └── user.go             # Data access (interface + implementation)
├── pkg/
│   └── response/
│       └── json.go             # JSON response helpers
├── tests/
│   └── integration/
│       └── health_test.go
├── .github/
│   └── workflows/
│       └── ci.yml
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── Makefile
├── go.mod
└── README.md
```

## Key Files

### main.go

```go
// cmd/server/main.go
package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"my-service/internal/config"
	"my-service/internal/handler"
)

func main() {
	cfg := config.Load()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: cfg.LogLevel,
	}))
	slog.SetDefault(logger)

	h := handler.New(logger)
	mux := h.Routes()

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server
	go func() {
		logger.Info("server starting", "port", cfg.Port, "env", cfg.Env)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit
	logger.Info("shutting down", "signal", sig.String())

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("forced shutdown", "error", err)
		os.Exit(1)
	}

	logger.Info("server stopped")
}
```

### Configuration

```go
// internal/config/config.go
package config

import (
	"log/slog"
	"os"
	"strconv"
)

type Config struct {
	Env      string
	Port     int
	LogLevel slog.Level
	// DatabaseURL string  // Uncomment when adding database
}

func Load() *Config {
	return &Config{
		Env:      getEnv("APP_ENV", "development"),
		Port:     getEnvInt("PORT", 8080),
		LogLevel: parseLogLevel(getEnv("LOG_LEVEL", "info")),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}

func parseLogLevel(s string) slog.Level {
	switch s {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
```

### Handler + Routes

```go
// internal/handler/handler.go
package handler

import (
	"log/slog"
	"net/http"
)

type Handler struct {
	logger *slog.Logger
}

func New(logger *slog.Logger) *Handler {
	return &Handler{logger: logger}
}

func (h *Handler) Routes() http.Handler {
	mux := http.NewServeMux()

	// Apply middleware stack
	var handler http.Handler = mux
	handler = h.recoverer(handler)
	handler = h.requestID(handler)
	handler = h.logging(handler)
	handler = h.cors(handler)

	// Routes
	mux.HandleFunc("GET /health", h.handleHealth)
	mux.HandleFunc("GET /api/users", h.handleListUsers)
	mux.HandleFunc("POST /api/users", h.handleCreateUser)
	mux.HandleFunc("GET /api/users/{id}", h.handleGetUser)
	mux.HandleFunc("PUT /api/users/{id}", h.handleUpdateUser)
	mux.HandleFunc("DELETE /api/users/{id}", h.handleDeleteUser)

	return handler
}
```

### Middleware

```go
// internal/handler/middleware.go
package handler

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
)

type contextKey string

const requestIDKey contextKey = "requestID"

func (h *Handler) logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseWriter{ResponseWriter: w, statusCode: 200}
		next.ServeHTTP(rw, r)
		h.logger.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rw.statusCode,
			"duration_ms", time.Since(start).Milliseconds(),
			"request_id", r.Context().Value(requestIDKey),
		)
	})
}

func (h *Handler) requestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-ID")
		if id == "" {
			id = uuid.NewString()
		}
		ctx := context.WithValue(r.Context(), requestIDKey, id)
		w.Header().Set("X-Request-ID", id)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (h *Handler) recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				h.logger.Error("panic recovered", "error", rec, "path", r.URL.Path)
				http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func (h *Handler) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
```

### JSON Response Helpers

```go
// pkg/response/json.go
package response

import (
	"encoding/json"
	"net/http"
)

func JSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func Error(w http.ResponseWriter, status int, message string) {
	JSON(w, status, map[string]any{
		"error": map[string]string{"message": message},
	})
}
```

### Makefile

```makefile
.PHONY: dev build test lint run docker

APP_NAME := my-service
MAIN := ./cmd/server

dev:
	go run $(MAIN)

build:
	CGO_ENABLED=0 go build -ldflags="-s -w" -o bin/$(APP_NAME) $(MAIN)

test:
	go test ./... -v -race -count=1

test-coverage:
	go test ./... -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html

lint:
	golangci-lint run ./...

docker-build:
	docker build -t $(APP_NAME) .

docker-run:
	docker compose up -d
```

### Dockerfile

```dockerfile
FROM golang:1.23-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /server ./cmd/server

FROM alpine:3.21
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=build /server .
USER nobody:nobody
EXPOSE 8080
CMD ["./server"]
```

### GitHub Actions CI

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: "1.23"
      - run: go vet ./...
      - run: go test ./... -race -count=1
      - run: go build ./cmd/server
```

## Variants

### With PostgreSQL (pgx + sqlc)
- Add `github.com/jackc/pgx/v5` dependency
- Use `sqlc` for type-safe query generation
- Add migration tool (`goose` or `golang-migrate`)

### With gRPC
- Add protobuf definitions in `proto/`
- Generate Go code with `buf`
- Create gRPC server alongside HTTP

### With Redis (Caching)
- Add `github.com/redis/go-redis/v9`
- Create `internal/cache/` package

## Checklist After Scaffolding

1. Replace `my-service` in go.mod with actual module path
2. Run `go mod tidy`
3. Run `make dev` — verify health at `GET :8080/health`
4. Implement your domain in `internal/`
5. Add database when ready (pgx + sqlc recommended)
6. Run `make lint` — install golangci-lint if needed
7. Set up deployment (Docker recommended)
