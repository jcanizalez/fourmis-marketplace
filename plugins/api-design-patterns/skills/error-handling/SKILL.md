---
description: When the user asks about API error handling, error responses, RFC 7807 Problem Details, error codes, validation errors, error middleware, or API error format
---

# API Error Handling Patterns

Consistent, informative, and secure error responses. Covers RFC 7807 Problem Details, typed error classes, validation error format, and error middleware for Node.js and Go.

## RFC 7807 Problem Details (Standard Error Format)

The gold standard for API errors. Adopted by major APIs (GitHub, Stripe, Twilio).

```json
{
  "type": "https://api.example.com/errors/insufficient-funds",
  "title": "Insufficient Funds",
  "status": 422,
  "detail": "Account balance is $30.00, but the transaction requires $50.00.",
  "instance": "/api/v1/transactions/txn_789",
  "traceId": "req_abc123"
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | URI identifying the error type. Links to documentation. |
| `title` | Yes | Short human-readable summary. Same for all instances of this type. |
| `status` | Yes | HTTP status code (duplicated for convenience). |
| `detail` | Yes | Human-readable explanation specific to this occurrence. |
| `instance` | No | URI of the specific resource/request that caused the error. |
| `traceId` | No | Request ID for debugging (extension field). |

## Node.js — Typed Error Classes

```typescript
// errors/api-error.ts
export class ApiError extends Error {
  constructor(
    public readonly type: string,
    public readonly title: string,
    public readonly status: number,
    public readonly detail: string,
    public readonly errors?: ValidationError[],
    public readonly instance?: string
  ) {
    super(title);
    this.name = "ApiError";
  }

  toJSON() {
    return {
      type: `https://api.example.com/errors/${this.type}`,
      title: this.title,
      status: this.status,
      detail: this.detail,
      ...(this.errors && { errors: this.errors }),
      ...(this.instance && { instance: this.instance }),
    };
  }
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}
```

### Common Error Factories

```typescript
// errors/common.ts
export class NotFoundError extends ApiError {
  constructor(resource: string, id: string) {
    super(
      "not-found",
      "Resource Not Found",
      404,
      `${resource} with id '${id}' was not found.`
    );
  }
}

export class ValidationFailedError extends ApiError {
  constructor(errors: ValidationError[]) {
    super(
      "validation-failed",
      "Validation Failed",
      422,
      `${errors.length} validation error(s) occurred.`,
      errors
    );
  }
}

export class ConflictError extends ApiError {
  constructor(detail: string) {
    super("conflict", "Conflict", 409, detail);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(detail = "Authentication required.") {
    super("unauthorized", "Unauthorized", 401, detail);
  }
}

export class ForbiddenError extends ApiError {
  constructor(detail = "You don't have permission to access this resource.") {
    super("forbidden", "Forbidden", 403, detail);
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfter: number) {
    super(
      "rate-limit-exceeded",
      "Too Many Requests",
      429,
      `Rate limit exceeded. Retry after ${retryAfter} seconds.`
    );
  }
}

export class InternalError extends ApiError {
  constructor(detail = "An unexpected error occurred.") {
    super("internal-error", "Internal Server Error", 500, detail);
  }
}
```

### Express Error Middleware

```typescript
// middleware/error-handler.ts
import { Request, Response, NextFunction } from "express";
import { ApiError, InternalError } from "../errors";
import { logger } from "../logger";

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  // Known API errors — return structured response
  if (err instanceof ApiError) {
    // Only log 5xx errors as errors
    if (err.status >= 500) {
      logger.error({ err, requestId: req.id, path: req.path }, err.detail);
    } else {
      logger.warn({ err, requestId: req.id, path: req.path }, err.detail);
    }

    return res.status(err.status).json({
      ...err.toJSON(),
      traceId: req.id,
    });
  }

  // Zod validation errors
  if (err.name === "ZodError") {
    const zodErr = err as any;
    const validationErrors = zodErr.issues.map((issue: any) => ({
      field: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));

    return res.status(422).json({
      type: "https://api.example.com/errors/validation-failed",
      title: "Validation Failed",
      status: 422,
      detail: `${validationErrors.length} validation error(s) occurred.`,
      errors: validationErrors,
      traceId: req.id,
    });
  }

  // JSON parse errors
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      type: "https://api.example.com/errors/malformed-request",
      title: "Malformed Request",
      status: 400,
      detail: "The request body contains invalid JSON.",
      traceId: req.id,
    });
  }

  // Unknown errors — never leak internal details
  logger.error({ err, requestId: req.id, path: req.path, stack: err.stack }, "Unhandled error");

  const internal = new InternalError();
  return res.status(500).json({
    ...internal.toJSON(),
    traceId: req.id,
  });
}

// Register AFTER all routes
app.use(errorHandler);
```

### Usage in Route Handlers

```typescript
// routes/users.ts
router.get("/users/:id", async (req, res) => {
  const user = await userService.findById(req.params.id);
  if (!user) {
    throw new NotFoundError("User", req.params.id);
  }
  res.json({ data: user });
});

router.post("/users", async (req, res) => {
  // Validate
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationFailedError(
      parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
        code: i.code,
      }))
    );
  }

  // Check duplicate
  const existing = await userService.findByEmail(parsed.data.email);
  if (existing) {
    throw new ConflictError(`A user with email '${parsed.data.email}' already exists.`);
  }

  const user = await userService.create(parsed.data);
  res.status(201).location(`/api/v1/users/${user.id}`).json({ data: user });
});
```

## Go — Error Handling

```go
// errors/errors.go
package apierr

import (
    "encoding/json"
    "fmt"
    "net/http"
)

type APIError struct {
    Type     string            `json:"type"`
    Title    string            `json:"title"`
    Status   int               `json:"status"`
    Detail   string            `json:"detail"`
    Instance string            `json:"instance,omitempty"`
    TraceID  string            `json:"traceId,omitempty"`
    Errors   []ValidationError `json:"errors,omitempty"`
}

type ValidationError struct {
    Field   string `json:"field"`
    Message string `json:"message"`
    Code    string `json:"code"`
}

func (e *APIError) Error() string {
    return fmt.Sprintf("%s: %s", e.Title, e.Detail)
}

func NotFound(resource, id string) *APIError {
    return &APIError{
        Type:   "https://api.example.com/errors/not-found",
        Title:  "Resource Not Found",
        Status: http.StatusNotFound,
        Detail: fmt.Sprintf("%s with id '%s' was not found.", resource, id),
    }
}

func ValidationFailed(errors []ValidationError) *APIError {
    return &APIError{
        Type:   "https://api.example.com/errors/validation-failed",
        Title:  "Validation Failed",
        Status: http.StatusUnprocessableEntity,
        Detail: fmt.Sprintf("%d validation error(s) occurred.", len(errors)),
        Errors: errors,
    }
}

func Conflict(detail string) *APIError {
    return &APIError{
        Type:   "https://api.example.com/errors/conflict",
        Title:  "Conflict",
        Status: http.StatusConflict,
        Detail: detail,
    }
}

func Unauthorized(detail string) *APIError {
    if detail == "" {
        detail = "Authentication required."
    }
    return &APIError{
        Type:   "https://api.example.com/errors/unauthorized",
        Title:  "Unauthorized",
        Status: http.StatusUnauthorized,
        Detail: detail,
    }
}

func RateLimited(retryAfter int) *APIError {
    return &APIError{
        Type:   "https://api.example.com/errors/rate-limit-exceeded",
        Title:  "Too Many Requests",
        Status: http.StatusTooManyRequests,
        Detail: fmt.Sprintf("Rate limit exceeded. Retry after %d seconds.", retryAfter),
    }
}

func Internal() *APIError {
    return &APIError{
        Type:   "https://api.example.com/errors/internal-error",
        Title:  "Internal Server Error",
        Status: http.StatusInternalServerError,
        Detail: "An unexpected error occurred.",
    }
}
```

### Go Error Middleware

```go
// middleware/error.go
func ErrorHandler(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if rec := recover(); rec != nil {
                log.Error().
                    Interface("panic", rec).
                    Str("path", r.URL.Path).
                    Msg("panic recovered")

                writeError(w, apierr.Internal())
            }
        }()
        next.ServeHTTP(w, r)
    })
}

func writeError(w http.ResponseWriter, apiErr *apierr.APIError) {
    w.Header().Set("Content-Type", "application/problem+json")
    w.WriteHeader(apiErr.Status)
    json.NewEncoder(w).Encode(apiErr)
}

// Usage in handlers
func GetUser(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
    user, err := userService.FindByID(r.Context(), id)
    if err != nil {
        if errors.Is(err, ErrNotFound) {
            writeError(w, apierr.NotFound("User", id))
            return
        }
        log.Error().Err(err).Str("userId", id).Msg("failed to find user")
        writeError(w, apierr.Internal())
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"data": user})
}
```

## Validation Error Format

```json
{
  "type": "https://api.example.com/errors/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "3 validation error(s) occurred.",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address",
      "code": "invalid_string"
    },
    {
      "field": "password",
      "message": "Must be at least 8 characters",
      "code": "too_small"
    },
    {
      "field": "age",
      "message": "Must be at least 18",
      "code": "too_small"
    }
  ],
  "traceId": "req_abc123"
}
```

## Error Response Guidelines

| Rule | Why |
|------|-----|
| **Never expose stack traces** | Security risk — internal paths, library versions |
| **Never expose SQL errors** | Reveals schema, enables SQL injection tuning |
| **Always include `type` URI** | Machine-readable, links to documentation |
| **Always include `traceId`** | Enables support debugging |
| **Distinguish 4xx from 5xx** | 4xx = client can fix; 5xx = server must fix |
| **Use 422 for business logic, 400 for syntax** | "Valid JSON but wrong semantics" vs "can't parse this" |
| **Include `Retry-After` for 429 and 503** | Tells clients when to try again |
| **Log 5xx errors with full context** | Alert on these — they need fixing |
| **Log 4xx errors at warn level** | Don't alert, but track for API health |

## Content-Type for Errors

```typescript
// RFC 7807 specifies this content type
res.set("Content-Type", "application/problem+json");

// Most APIs use standard JSON (also fine)
res.set("Content-Type", "application/json");
```
