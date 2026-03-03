---
description: When the user asks about Go project structure, Go project layout, package organization, internal packages, cmd directory, Go modules, Makefile for Go, golangci-lint, or how to organize a Go project
---

# Project Structure

## Standard Layout

### CLI Application
```
myapp/
├── cmd/
│   └── myapp/
│       └── main.go          # Entry point
├── internal/                 # Private packages (can't be imported externally)
│   ├── config/
│   │   └── config.go
│   ├── handler/
│   │   ├── handler.go
│   │   └── handler_test.go
│   ├── middleware/
│   │   └── middleware.go
│   ├── model/
│   │   └── user.go
│   └── store/
│       ├── postgres/
│       │   └── user.go
│       └── store.go          # Interface definitions
├── pkg/                      # Public packages (importable by others) — optional
│   └── validator/
│       └── validator.go
├── migrations/               # Database migrations
│   ├── 001_create_users.up.sql
│   └── 001_create_users.down.sql
├── go.mod
├── go.sum
├── Makefile
├── Dockerfile
└── README.md
```

### Multiple Binaries
```
myproject/
├── cmd/
│   ├── api/                  # API server
│   │   └── main.go
│   ├── worker/               # Background worker
│   │   └── main.go
│   └── migrate/              # Migration CLI
│       └── main.go
├── internal/
│   ├── api/                  # HTTP handlers
│   ├── worker/               # Worker logic
│   └── shared/               # Shared between api and worker
└── go.mod
```

### Library (No cmd/)
```
mylib/
├── mylib.go                  # Package root — core types and functions
├── mylib_test.go
├── option.go                 # Options pattern
├── internal/                 # Implementation details
│   └── parser/
└── go.mod
```

---

## Package Design

### Naming
```go
// ✅ Good — short, lowercase, singular
package user
package store
package handler
package config

// ❌ Bad
package userService    // no camelCase
package user_handlers  // no underscores
package utils          // too generic
package common         // too generic
package models         // use singular: model
```

### What Goes Where
| Package | Contains |
|---------|----------|
| `cmd/myapp/` | `main.go` — wires everything together, starts server |
| `internal/config/` | Config parsing, env vars, validation |
| `internal/handler/` | HTTP handlers (or `internal/api/`) |
| `internal/middleware/` | HTTP middleware |
| `internal/model/` | Domain types (`User`, `Post`, etc.) |
| `internal/store/` | Database interfaces + implementations |
| `internal/service/` | Business logic (optional — only if handlers get complex) |
| `pkg/` | Reusable packages others can import (use sparingly) |

### internal/ is Enforced
```go
// internal/ packages can ONLY be imported by the parent module
// This is enforced by the Go compiler

// myapp/internal/store/ → importable by myapp/* only
// myapp/pkg/validator/  → importable by anyone
```

---

## Go Modules

### Initialize
```bash
go mod init github.com/yourname/myapp
```

### Common Commands
```bash
go mod tidy          # Add missing / remove unused dependencies
go mod download      # Download dependencies to cache
go get pkg@latest    # Add/update a dependency
go get pkg@v1.2.3    # Pin to specific version
go mod vendor        # Copy deps to vendor/ (for reproducible builds)
go mod graph         # Show dependency graph
```

### go.mod
```go
module github.com/yourname/myapp

go 1.23

require (
    github.com/lib/pq v1.10.9
    github.com/stretchr/testify v1.9.0
    golang.org/x/sync v0.7.0
)

require (
    // indirect dependencies (auto-managed by go mod tidy)
    github.com/davecgh/go-spew v1.1.1 // indirect
)
```

---

## main.go Pattern

```go
// cmd/api/main.go
package main

import (
    "context"
    "log/slog"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/yourname/myapp/internal/config"
    "github.com/yourname/myapp/internal/handler"
    "github.com/yourname/myapp/internal/store/postgres"
)

func main() {
    if err := run(); err != nil {
        slog.Error("fatal error", "error", err)
        os.Exit(1)
    }
}

func run() error {
    // Load config
    cfg, err := config.Load()
    if err != nil {
        return fmt.Errorf("load config: %w", err)
    }

    // Setup logger
    logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: cfg.LogLevel,
    }))
    slog.SetDefault(logger)

    // Connect database
    db, err := postgres.Connect(cfg.DatabaseURL)
    if err != nil {
        return fmt.Errorf("connect database: %w", err)
    }
    defer db.Close()

    // Build handler
    store := postgres.NewStore(db)
    h := handler.New(store, logger)

    // Start server
    srv := &http.Server{
        Addr:         ":" + cfg.Port,
        Handler:      h,
        ReadTimeout:  5 * time.Second,
        WriteTimeout: 10 * time.Second,
    }

    go func() {
        logger.Info("server starting", "port", cfg.Port)
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            logger.Error("server error", "error", err)
        }
    }()

    // Graceful shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    return srv.Shutdown(ctx)
}
```

---

## Makefile

```makefile
.PHONY: build run test lint fmt vet clean

# Variables
BINARY = myapp
MAIN = ./cmd/api

# Build
build:
	go build -o bin/$(BINARY) $(MAIN)

# Run (development)
run:
	go run $(MAIN)

# Test
test:
	go test ./... -v -race -count=1

test-coverage:
	go test ./... -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html

test-integration:
	go test -tags=integration ./... -v -count=1

# Quality
lint:
	golangci-lint run

fmt:
	gofmt -s -w .
	goimports -w .

vet:
	go vet ./...

# Database
migrate-up:
	migrate -path migrations -database "$(DATABASE_URL)" up

migrate-down:
	migrate -path migrations -database "$(DATABASE_URL)" down 1

migrate-create:
	migrate create -ext sql -dir migrations -seq $(name)

# Docker
docker-build:
	docker build -t $(BINARY) .

docker-run:
	docker run -p 8080:8080 $(BINARY)

# Clean
clean:
	rm -rf bin/ coverage.out coverage.html
```

---

## golangci-lint

### .golangci.yml
```yaml
run:
  timeout: 5m

linters:
  enable:
    - errcheck       # Check errors are handled
    - govet          # Go vet checks
    - staticcheck    # Advanced static analysis
    - unused         # Find unused code
    - gosimple       # Simplify code
    - ineffassign    # Detect useless assignments
    - revive         # Opinionated linter (replaces golint)
    - gocritic       # Style and performance checks
    - misspell       # Catch typos
    - nolintlint     # Require explanation for //nolint
    - errorlint      # Correct use of errors.Is/As
    - exhaustive     # Check exhaustive switch/map
    - bodyclose      # Ensure HTTP body is closed

linters-settings:
  revive:
    rules:
      - name: exported
        arguments:
          - "checkPrivateReceivers"
      - name: unexported-return
        disabled: true

  gocritic:
    enabled-tags:
      - diagnostic
      - style
      - performance

issues:
  exclude-rules:
    - path: _test\.go
      linters:
        - errcheck
        - gocritic
```

### Install & Run
```bash
# Install
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Or via brew
brew install golangci-lint

# Run
golangci-lint run
golangci-lint run --fix   # auto-fix where possible
```

---

## Build Tags

```go
//go:build linux
// +build linux

package myapp

// This file is only compiled on Linux
```

Common build tags:
| Tag | Purpose |
|-----|---------|
| `integration` | Integration tests |
| `e2e` | End-to-end tests |
| `linux` / `darwin` / `windows` | OS-specific code |
| `!cgo` | No CGO dependency |

---

## Init Order

```
1. Package-level var declarations (computed in order)
2. init() functions (all init() in a file, then next file)
3. main() in the main package
```

```go
// ⚠️ Avoid init() for side effects — prefer explicit initialization
// ✅ OK: register database driver
func init() {
    sql.Register("mydriver", &MyDriver{})
}

// ❌ Bad: init() that connects to database or reads config
func init() {
    db = connectDB() // fails at import time — hard to test
}
```
