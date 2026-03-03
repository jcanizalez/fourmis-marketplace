---
description: When the user asks about structured logging, JSON logging, log levels, correlation IDs, request logging, Pino, Winston, zerolog, or log formatting for production services
---

# Structured Logging Patterns

Production logging that's machine-parseable and human-debuggable. Structured JSON logs with context, correlation IDs, and proper log levels.

## Why Structured Logging

```
# ❌ Unstructured — impossible to parse at scale
console.log("User 123 placed order 456 for $99.99");

# ✅ Structured — queryable, filterable, alertable
{"level":"info","msg":"order_placed","userId":"123","orderId":"456","amount":99.99,"ts":"2026-03-03T12:00:00Z"}
```

## Node.js — Pino (Fastest JSON Logger)

### Setup

```typescript
// logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  // Production: JSON. Development: pretty print
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
      : undefined,
  // Base fields on every log line
  base: {
    service: process.env.SERVICE_NAME || "my-service",
    version: process.env.APP_VERSION || "unknown",
    env: process.env.NODE_ENV || "development",
  },
  // Redact sensitive fields
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "body.password", "body.token"],
    censor: "[REDACTED]",
  },
  // Serialize errors properly
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

// Child loggers inherit parent context
export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
```

### Log Levels

```typescript
// Use levels semantically — this matters for alerting
logger.trace("Detailed debugging info");     // level 10 — never in production
logger.debug("Diagnostic information");       // level 20 — dev/staging only
logger.info("Normal operational events");     // level 30 — default production level
logger.warn("Unexpected but handled");        // level 40 — might need attention
logger.error("Failure requiring attention");  // level 50 — triggers alerts
logger.fatal("Service is going down");        // level 60 — page someone NOW

// ✅ GOOD: Structured context as second argument
logger.info({ userId: "123", orderId: "456", amount: 99.99 }, "order placed");

// ❌ BAD: String interpolation loses structure
logger.info(`User 123 placed order 456 for $99.99`);
```

### Correlation IDs (Request Tracing)

```typescript
import { randomUUID } from "crypto";
import { AsyncLocalStorage } from "async_hooks";

// Store request context across async boundaries
const als = new AsyncLocalStorage<{ requestId: string; userId?: string }>();

export function getRequestContext() {
  return als.getStore();
}

// Express middleware — inject correlation ID
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers["x-request-id"] as string) || randomUUID();

  // Propagate to downstream services
  res.setHeader("x-request-id", requestId);

  als.run({ requestId, userId: req.user?.id }, () => {
    next();
  });
}

// Create a context-aware logger
export function getLogger() {
  const ctx = getRequestContext();
  if (!ctx) return logger;
  return logger.child({ requestId: ctx.requestId, userId: ctx.userId });
}
```

### Express Request Logging with pino-http

```typescript
import pinoHttp from "pino-http";

const httpLogger = pinoHttp({
  logger,
  // Custom log level based on status code
  customLogLevel(req, res, err) {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    if (res.statusCode >= 300) return "silent"; // skip redirects
    return "info";
  },
  // What to log on each request
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} completed`;
  },
  customErrorMessage(req, res, err) {
    return `${req.method} ${req.url} failed: ${err.message}`;
  },
  // Add custom attributes
  customAttributeKeys: {
    req: "request",
    res: "response",
    err: "error",
    responseTime: "duration_ms",
  },
  // Skip health check noise
  autoLogging: {
    ignore(req) {
      return req.url === "/health" || req.url === "/ready";
    },
  },
});

app.use(httpLogger);
```

## Node.js — Winston (Feature-Rich)

```typescript
import winston from "winston";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "ISO" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || "my-service",
  },
  transports: [
    // Console — JSON in prod, colorized in dev
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === "development"
          ? winston.format.combine(winston.format.colorize(), winston.format.simple())
          : winston.format.json(),
    }),
    // File transport for errors
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
  ],
});

// Child logger with persistent metadata
const orderLogger = logger.child({ module: "orders" });
orderLogger.info("order created", { orderId: "456", userId: "123" });
```

## Go — zerolog (Zero Allocation)

```go
package main

import (
    "os"
    "time"

    "github.com/rs/zerolog"
    "github.com/rs/zerolog/log"
)

func setupLogger() {
    // Global settings
    zerolog.TimeFieldFormat = time.RFC3339Nano
    zerolog.SetGlobalLevel(zerolog.InfoLevel)

    if os.Getenv("ENV") == "development" {
        // Pretty print for development
        log.Logger = log.Output(zerolog.ConsoleWriter{
            Out:        os.Stderr,
            TimeFormat: "15:04:05",
        })
    } else {
        // JSON for production
        log.Logger = zerolog.New(os.Stdout).
            With().
            Timestamp().
            Str("service", os.Getenv("SERVICE_NAME")).
            Str("version", os.Getenv("APP_VERSION")).
            Logger()
    }
}

func main() {
    setupLogger()

    // Structured logging — zero allocations
    log.Info().
        Str("userId", "123").
        Str("orderId", "456").
        Float64("amount", 99.99).
        Msg("order placed")

    // Sub-logger with persistent context
    orderLog := log.With().Str("module", "orders").Logger()
    orderLog.Info().Str("orderId", "789").Msg("processing")

    // Error logging with stack trace
    err := processOrder("456")
    if err != nil {
        log.Error().
            Err(err).
            Str("orderId", "456").
            Msg("order processing failed")
    }
}
```

### Go Request Logging Middleware

```go
func RequestLogger(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        requestID := r.Header.Get("X-Request-ID")
        if requestID == "" {
            requestID = uuid.NewString()
        }

        // Inject logger into request context
        ctx := log.With().
            Str("requestId", requestID).
            Str("method", r.Method).
            Str("path", r.URL.Path).
            Logger().
            WithContext(r.Context())

        // Wrap response writer to capture status code
        lrw := &loggingResponseWriter{ResponseWriter: w, statusCode: 200}
        w.Header().Set("X-Request-ID", requestID)

        next.ServeHTTP(lrw, r.WithContext(ctx))

        duration := time.Since(start)
        event := log.Ctx(ctx).Info()
        if lrw.statusCode >= 500 {
            event = log.Ctx(ctx).Error()
        } else if lrw.statusCode >= 400 {
            event = log.Ctx(ctx).Warn()
        }

        event.
            Int("status", lrw.statusCode).
            Dur("duration", duration).
            Int("bytes", lrw.bytesWritten).
            Msg("request completed")
    })
}

type loggingResponseWriter struct {
    http.ResponseWriter
    statusCode   int
    bytesWritten int
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
    lrw.statusCode = code
    lrw.ResponseWriter.WriteHeader(code)
}

func (lrw *loggingResponseWriter) Write(b []byte) (int, error) {
    n, err := lrw.ResponseWriter.Write(b)
    lrw.bytesWritten += n
    return n, err
}
```

## Log Context Best Practices

```typescript
// ✅ DO: Use consistent field names across services
const STANDARD_FIELDS = {
  requestId: "requestId",    // correlation
  userId: "userId",          // who
  traceId: "traceId",        // distributed tracing
  spanId: "spanId",
  duration: "duration_ms",   // always milliseconds
  error: "err",              // error object
  statusCode: "statusCode",  // HTTP status
};

// ✅ DO: Log at domain boundaries
logger.info({ orderId, items: items.length }, "order created");
logger.info({ orderId, paymentId }, "payment processed");
logger.info({ orderId, trackingNumber }, "shipment created");

// ❌ DON'T: Log inside tight loops
for (const item of items) {
  // logger.debug({ item }, "processing item"); // N log lines per request!
  processItem(item);
}
// ✅ Instead, log summary
logger.info({ count: items.length, duration: elapsed }, "items processed");

// ❌ DON'T: Log sensitive data
logger.info({ password, ssn, creditCard }); // NEVER

// ❌ DON'T: Use generic messages
logger.info("done");           // done with what?
logger.error("something failed"); // what failed?
```

## Log Output Formats

```jsonc
// Production JSON (single line, machine-parseable)
{"level":"info","time":"2026-03-03T12:00:00.000Z","service":"order-api","requestId":"abc-123","userId":"user-456","msg":"order placed","orderId":"ord-789","amount":99.99,"duration_ms":42}

// Development pretty print
12:00:00 INFO  [order-api] order placed
  requestId: abc-123
  userId: user-456
  orderId: ord-789
  amount: 99.99
  duration_ms: 42
```

## Shipping Logs to Aggregators

| Platform | Collector | Protocol |
|----------|-----------|----------|
| Grafana Loki | Promtail / Alloy | Push (HTTP) |
| Elasticsearch | Filebeat / Fluentd | Push |
| Datadog | dd-agent | Push (TCP/HTTP) |
| AWS CloudWatch | CloudWatch agent | Push |
| Self-hosted | Vector / Fluentd | Pull/Push |

```yaml
# Docker Compose — ship stdout logs to Loki via Promtail
services:
  app:
    image: my-service:latest
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    command: -config.file=/etc/promtail/config.yml
```
