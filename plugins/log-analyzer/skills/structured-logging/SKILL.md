---
description: When the user asks about structured logging, setting up JSON logging, log levels and when to use them, logging best practices in Node.js or Python or Go, configuring pino or winston or slog or structlog, or adding context to log messages
---

# Structured Logging

Patterns and best practices for structured (JSON) logging across Node.js, Python, and Go. Structured logs are machine-parseable, searchable, and ready for log aggregation.

## Why Structured Logging

```
# Unstructured — hard to parse, search, and alert on
[2026-03-01 09:15:23] ERROR: Failed to process payment for user 12345

# Structured — every field is queryable
{"timestamp":"2026-03-01T09:15:23.456Z","level":"error","msg":"payment processing failed","user_id":12345,"payment_id":"pay_abc","error":"card declined","duration_ms":342}
```

## Log Levels

Use levels consistently across your entire application:

| Level | When to Use | Example |
|-------|-------------|---------|
| `fatal` | App cannot continue, will crash | Database connection lost, out of memory |
| `error` | Operation failed, needs attention | Payment failed, API returned 500, unhandled exception |
| `warn` | Unexpected but recoverable | Retry succeeded, deprecated API used, rate limit approaching |
| `info` | Normal business events | User signed up, order placed, deployment started |
| `debug` | Developer troubleshooting detail | SQL query executed, cache hit/miss, request payload |
| `trace` | Ultra-verbose, rarely used | Function entry/exit, loop iterations |

### Level Rules
- **Production**: `info` and above (never `debug` in prod by default)
- **Staging**: `debug` for troubleshooting
- **Development**: `debug` or `trace` as needed
- **Dynamic**: Use environment variable to change level without restart

## Node.js — Pino (Recommended)

### Setup

```typescript
// src/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  // Pretty print in development, JSON in production
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  // Base context added to every log
  base: {
    service: "my-api",
    env: process.env.NODE_ENV,
    version: process.env.APP_VERSION,
  },
  // ISO timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,
  // Redact sensitive fields
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "body.password"],
    censor: "[REDACTED]",
  },
});
```

### Request Logging (Express)

```typescript
// src/middleware/request-logger.ts
import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { logger } from "../logger";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers["x-request-id"] as string || randomUUID();
  const start = performance.now();

  // Attach child logger with request context
  req.log = logger.child({
    request_id: requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const duration_ms = Math.round(performance.now() - start);
    req.log.info({
      status: res.statusCode,
      duration_ms,
      content_length: res.getHeader("content-length"),
    }, "request completed");
  });

  next();
}
```

### Child Loggers (Contextual Logging)

```typescript
// Add context as you go deeper in the call stack
const userLogger = logger.child({ user_id: user.id });
userLogger.info("processing payment");

const paymentLogger = userLogger.child({ payment_id: payment.id });
paymentLogger.info({ amount: 99.99 }, "charge initiated");
paymentLogger.error({ error: err.message }, "charge failed");
// Output: {"user_id":123,"payment_id":"pay_abc","error":"card declined",...}
```

### Winston (Alternative)

```typescript
import { createLogger, format, transports } from "winston";

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(
    format.timestamp({ format: "ISO" }),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: "my-api" },
  transports: [
    new transports.Console({
      format:
        process.env.NODE_ENV === "development"
          ? format.combine(format.colorize(), format.simple())
          : format.json(),
    }),
  ],
});
```

## Python — structlog (Recommended)

### Setup

```python
# src/logging_config.py
import structlog
import logging
import sys

def configure_logging(level: str = "INFO", json_output: bool = True):
    """Configure structured logging for the application."""

    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
        structlog.processors.TimeStamper(fmt="iso"),
    ]

    if json_output:
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer())

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, level.upper())
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

# Usage
configure_logging(
    level=os.getenv("LOG_LEVEL", "INFO"),
    json_output=os.getenv("ENV") != "development",
)
```

### Context Binding

```python
import structlog

log = structlog.get_logger()

# Bind context progressively
log = log.bind(user_id=user.id)
log.info("processing payment")

log = log.bind(payment_id=payment.id)
log.info("charge initiated", amount=99.99)
log.error("charge failed", error=str(e))
```

### FastAPI Request Logging

```python
# src/middleware/logging.py
import time
import uuid
import structlog
from starlette.middleware.base import BaseHTTPMiddleware

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )

        log = structlog.get_logger()
        start = time.perf_counter()

        response = await call_next(request)

        duration_ms = round((time.perf_counter() - start) * 1000)
        log.info("request completed", status=response.status_code, duration_ms=duration_ms)

        response.headers["x-request-id"] = request_id
        return response
```

## Go — slog (Standard Library)

### Setup

```go
// internal/logger/logger.go
package logger

import (
    "log/slog"
    "os"
)

func New(level string, service string) *slog.Logger {
    var logLevel slog.Level
    switch level {
    case "debug":
        logLevel = slog.LevelDebug
    case "warn":
        logLevel = slog.LevelWarn
    case "error":
        logLevel = slog.LevelError
    default:
        logLevel = slog.LevelInfo
    }

    handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: logLevel,
        // Add source file info in debug mode
        AddSource: logLevel == slog.LevelDebug,
    })

    return slog.New(handler).With(
        slog.String("service", service),
        slog.String("version", os.Getenv("APP_VERSION")),
    )
}
```

### Request Logging Middleware

```go
func RequestLogger(logger *slog.Logger) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            requestID := r.Header.Get("X-Request-ID")
            if requestID == "" {
                requestID = uuid.New().String()
            }

            reqLogger := logger.With(
                slog.String("request_id", requestID),
                slog.String("method", r.Method),
                slog.String("path", r.URL.Path),
                slog.String("ip", r.RemoteAddr),
            )

            start := time.Now()
            sw := &statusWriter{ResponseWriter: w}

            ctx := context.WithValue(r.Context(), loggerKey, reqLogger)
            next.ServeHTTP(sw, r.WithContext(ctx))

            reqLogger.Info("request completed",
                slog.Int("status", sw.status),
                slog.Duration("duration", time.Since(start)),
            )
        })
    }
}
```

### Grouping Fields

```go
logger.Info("user action",
    slog.Group("user",
        slog.Int("id", user.ID),
        slog.String("email", user.Email),
    ),
    slog.Group("action",
        slog.String("type", "login"),
        slog.String("ip", clientIP),
    ),
)
// Output: {"user":{"id":123,"email":"..."},"action":{"type":"login","ip":"..."}}
```

## What to Log

### Always Log
- Request start/end with duration
- Authentication events (login, logout, failed attempts)
- Business events (order placed, payment processed)
- Errors with full context (stack trace, input data)
- External API calls (service, endpoint, status, duration)
- Database queries in debug mode (query, params, duration)

### Never Log
- Passwords, tokens, API keys, secrets
- Full credit card numbers (last 4 only)
- PII without explicit consent (email, SSN, phone)
- Request/response bodies in production (too verbose)
- Health check requests (pollute logs)

### Redaction Patterns

```typescript
// Pino — automatic redaction
const logger = pino({
  redact: {
    paths: [
      "password",
      "*.password",
      "req.headers.authorization",
      "req.headers.cookie",
      "creditCard",
      "ssn",
    ],
    censor: "[REDACTED]",
  },
});
```

## Log Format Standards

### Recommended JSON Schema

```json
{
  "timestamp": "2026-03-01T09:15:23.456Z",
  "level": "info",
  "msg": "request completed",
  "service": "my-api",
  "version": "1.2.3",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "path": "/api/orders",
  "status": 201,
  "duration_ms": 145,
  "user_id": 12345,
  "trace_id": "abc123def456"
}
```

### Field Naming Conventions
- Use `snake_case` for all field names
- Use `_ms` suffix for millisecond durations
- Use `_id` suffix for identifiers
- Use `_at` suffix for timestamps (other than the main one)
- Use ISO 8601 for all timestamps
- Keep field names short but descriptive
