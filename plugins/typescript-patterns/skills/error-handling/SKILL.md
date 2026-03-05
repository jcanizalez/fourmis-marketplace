---
description: When the user asks about TypeScript error handling, Result types, typed errors, error boundaries in TypeScript, async error patterns, try-catch best practices, unknown in catch blocks, error narrowing, Promise.allSettled, retry patterns, typed error classes, or how to handle errors safely in TypeScript
---

# Error Handling Patterns

## The Problem with try/catch

```typescript
// ❌ catch(e) gives you `unknown` — no type information
try {
  const user = await fetchUser(id);
} catch (e) {
  // e is unknown — what kind of error is it?
  // Network? 404? Validation? Permission?
}
```

TypeScript can't type catch clauses. These patterns give you type-safe error handling.

---

## Result Type

The most widely used pattern — return success or failure explicitly instead of throwing.

### Basic Result
```typescript
type Result<T, E = Error> =
  | { ok: true; data: T }
  | { ok: false; error: E };

// Constructor helpers
function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Usage
async function fetchUser(id: string): Promise<Result<User, ApiError>> {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) {
      return err(new ApiError(res.status, await res.text()));
    }
    const user = await res.json();
    return ok(user);
  } catch (e) {
    return err(new ApiError(0, "Network error"));
  }
}

// Consumer — no try/catch needed
const result = await fetchUser("123");
if (result.ok) {
  console.log(result.data.name);
} else {
  console.log(`Error ${result.error.status}: ${result.error.message}`);
}
```

### Result with Utility Methods
```typescript
class Ok<T> {
  readonly ok = true;
  constructor(public readonly data: T) {}

  map<U>(fn: (data: T) => U): Result<U, never> {
    return new Ok(fn(this.data));
  }

  mapErr<F>(_fn: (error: never) => F): Result<T, F> {
    return this;
  }

  unwrap(): T {
    return this.data;
  }

  unwrapOr(_fallback: T): T {
    return this.data;
  }
}

class Err<E> {
  readonly ok = false;
  constructor(public readonly error: E) {}

  map<U>(_fn: (data: never) => U): Result<U, E> {
    return this;
  }

  mapErr<F>(fn: (error: E) => F): Result<never, F> {
    return new Err(fn(this.error));
  }

  unwrap(): never {
    throw this.error;
  }

  unwrapOr<T>(fallback: T): T {
    return fallback;
  }
}

type Result<T, E> = Ok<T> | Err<E>;

// Usage
const result = await fetchUser("123");
const name = result.map((u) => u.name).unwrapOr("Unknown");
```

---

## Typed Error Classes

### Error Hierarchy
```typescript
// Base error with code discriminant
abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      name: this.name,
    };
  }
}

// Specific error types
class NotFoundError extends AppError {
  readonly code = "NOT_FOUND";
  readonly statusCode = 404;
  constructor(resource: string, id: string) {
    super(`${resource} ${id} not found`);
  }
}

class ValidationError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly statusCode = 400;
  constructor(
    message: string,
    public readonly fields: Record<string, string[]>,
  ) {
    super(message);
  }
}

class UnauthorizedError extends AppError {
  readonly code = "UNAUTHORIZED";
  readonly statusCode = 401;
  constructor(message = "Authentication required") {
    super(message);
  }
}

class ForbiddenError extends AppError {
  readonly code = "FORBIDDEN";
  readonly statusCode = 403;
  constructor(message = "Insufficient permissions") {
    super(message);
  }
}

class ConflictError extends AppError {
  readonly code = "CONFLICT";
  readonly statusCode = 409;
  constructor(message: string) {
    super(message);
  }
}
```

### Discriminated Error Union
```typescript
type ServiceError =
  | { code: "NOT_FOUND"; resource: string; id: string }
  | { code: "VALIDATION"; fields: Record<string, string[]> }
  | { code: "UNAUTHORIZED"; reason: string }
  | { code: "RATE_LIMITED"; retryAfter: number }
  | { code: "INTERNAL"; message: string };

function handleServiceError(error: ServiceError): Response {
  switch (error.code) {
    case "NOT_FOUND":
      return Response.json({ error: `${error.resource} not found` }, { status: 404 });
    case "VALIDATION":
      return Response.json({ error: "Validation failed", fields: error.fields }, { status: 400 });
    case "UNAUTHORIZED":
      return Response.json({ error: error.reason }, { status: 401 });
    case "RATE_LIMITED":
      return Response.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(error.retryAfter) } },
      );
    case "INTERNAL":
      return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

## Async Error Patterns

### Safe Async Wrapper
```typescript
// Wrap any async function to return Result instead of throwing
async function trySafe<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
  try {
    const data = await fn();
    return ok(data);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

// Usage
const result = await trySafe(() => fetch("/api/data").then((r) => r.json()));
if (result.ok) {
  console.log(result.data);
}
```

### Promise.allSettled Patterns
```typescript
// Process results with type safety
async function fetchAll(ids: string[]): Promise<Map<string, User>> {
  const results = await Promise.allSettled(
    ids.map((id) => fetchUser(id)),
  );

  const users = new Map<string, User>();
  const errors: Array<{ id: string; error: unknown }> = [];

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      users.set(ids[i], result.value);
    } else {
      errors.push({ id: ids[i], error: result.reason });
    }
  });

  if (errors.length > 0) {
    console.warn(`Failed to fetch ${errors.length} users:`, errors);
  }

  return users;
}
```

### Retry with Typed Errors
```typescript
interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoff?: "linear" | "exponential";
  retryOn?: (error: unknown) => boolean;
}

async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { maxAttempts, delayMs, backoff = "exponential", retryOn } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (retryOn && !retryOn(error)) throw error;
      if (attempt === maxAttempts) throw error;

      const delay = backoff === "exponential"
        ? delayMs * 2 ** (attempt - 1)
        : delayMs * attempt;

      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError; // Unreachable, but satisfies TypeScript
}

// Usage
const data = await retry(
  () => fetch("/api/data").then((r) => r.json()),
  {
    maxAttempts: 3,
    delayMs: 1000,
    backoff: "exponential",
    retryOn: (e) => e instanceof TypeError, // Only retry network errors
  },
);
```

---

## Error Handling in Express / Node.js

### Async Handler Wrapper
```typescript
import { Request, Response, NextFunction, RequestHandler } from "express";

// Catch async errors and forward to error middleware
function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Usage
app.get(
  "/api/users/:id",
  asyncHandler(async (req, res) => {
    const user = await db.users.findById(req.params.id);
    if (!user) throw new NotFoundError("User", req.params.id);
    res.json(user);
  }),
);
```

### Centralized Error Handler
```typescript
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  // Handle known error types
  if (err instanceof AppError) {
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // Handle Zod validation errors
  if (err instanceof z.ZodError) {
    res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Invalid request",
      issues: err.issues,
    });
    return;
  }

  // Unknown errors
  console.error("Unhandled error:", err);
  res.status(500).json({
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
  });
});
```

---

## React Error Boundaries

### Class-based Error Boundary
```typescript
import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  fallback: ReactNode | ((error: Error) => ReactNode);
  onError?: (error: Error, info: ErrorInfo) => void;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.error) {
      const { fallback } = this.props;
      return typeof fallback === "function"
        ? fallback(this.state.error)
        : fallback;
    }
    return this.props.children;
  }
}

// Usage
<ErrorBoundary
  fallback={(error) => <div>Error: {error.message}</div>}
  onError={(error) => reportToSentry(error)}
>
  <App />
</ErrorBoundary>
```

---

## Handling `unknown` Safely

### Error Narrowing Helpers
```typescript
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unknown error occurred";
}

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(error);
  return new Error(JSON.stringify(error));
}

// Usage in catch blocks
try {
  await riskyOperation();
} catch (error) {
  const message = getErrorMessage(error);
  logger.error("Operation failed", { message, error });
}
```

---

## Quick Reference

| Pattern | When to Use |
|---------|------------|
| `Result<T, E>` | Functions that can fail predictably — API calls, DB queries, parsing |
| Typed error classes | Express/Fastify APIs with centralized error handling |
| Discriminated error union | Multiple error types handled in switch/case |
| `trySafe()` wrapper | Wrap external libs that throw |
| `assertNever` | Exhaustive error type checking |
| Error boundary | React component tree errors |
| `unknown` narrowing | Every catch block — never assume `e` is `Error` |
