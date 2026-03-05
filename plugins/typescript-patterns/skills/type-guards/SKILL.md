---
description: When the user asks about TypeScript type guards, type narrowing, discriminated unions, exhaustive checking, assertion functions, the is keyword, satisfies keyword, using keyword, Disposable pattern, Symbol.dispose, or how to check types at runtime in TypeScript
---

# Type Guards & Narrowing

## Built-in Narrowing

### typeof Guards
```typescript
function process(value: string | number | boolean) {
  if (typeof value === "string") {
    // value: string
    return value.toUpperCase();
  }
  if (typeof value === "number") {
    // value: number
    return value.toFixed(2);
  }
  // value: boolean
  return value ? "yes" : "no";
}
```

### instanceof Guards
```typescript
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

class ValidationError extends Error {
  constructor(public fields: Record<string, string>) {
    super("Validation failed");
  }
}

function handleError(error: unknown) {
  if (error instanceof ApiError) {
    // error: ApiError — has .status
    console.log(`API ${error.status}: ${error.message}`);
  } else if (error instanceof ValidationError) {
    // error: ValidationError — has .fields
    console.log("Invalid fields:", Object.keys(error.fields));
  } else if (error instanceof Error) {
    console.log("Error:", error.message);
  } else {
    console.log("Unknown error:", String(error));
  }
}
```

### in Operator
```typescript
interface Dog { bark(): void; breed: string }
interface Cat { meow(): void; indoor: boolean }

function speak(animal: Dog | Cat) {
  if ("bark" in animal) {
    // animal: Dog
    animal.bark();
  } else {
    // animal: Cat
    animal.meow();
  }
}
```

### Truthiness Narrowing
```typescript
function greet(name: string | null | undefined) {
  if (name) {
    // name: string (null and undefined removed)
    console.log(`Hello, ${name}`);
  }
}

// ⚠️ Watch out — 0, "", and false are falsy!
function processCount(count: number | null) {
  if (count) {
    // ❌ This excludes 0, which might be valid!
  }
  if (count != null) {
    // ✅ This only excludes null/undefined
  }
}
```

---

## Custom Type Guards (is keyword)

### Basic Type Guard
```typescript
interface Fish { swim(): void }
interface Bird { fly(): void }

// Return type `x is Fish` tells TS this narrows the type
function isFish(animal: Fish | Bird): animal is Fish {
  return "swim" in animal;
}

function move(animal: Fish | Bird) {
  if (isFish(animal)) {
    animal.swim(); // ✅ TS knows it's Fish
  } else {
    animal.fly();  // ✅ TS knows it's Bird
  }
}
```

### Practical Type Guards
```typescript
// Check for non-null (filter helper)
function isNonNull<T>(value: T | null | undefined): value is T {
  return value != null;
}

const items: (string | null)[] = ["a", null, "b", null, "c"];
const clean: string[] = items.filter(isNonNull);
// ✅ string[] — without isNonNull, TS infers (string | null)[]

// Check object shape
interface ApiResponse<T> {
  data: T;
  error: null;
}

interface ApiError {
  data: null;
  error: { message: string; code: number };
}

function isSuccess<T>(
  response: ApiResponse<T> | ApiError,
): response is ApiResponse<T> {
  return response.error === null;
}

// Check array is non-empty
function isNonEmpty<T>(arr: T[]): arr is [T, ...T[]] {
  return arr.length > 0;
}

const items2: string[] = getItems();
if (isNonEmpty(items2)) {
  const first = items2[0]; // ✅ string, not string | undefined
}
```

### Type Guard with unknown
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    "email" in value &&
    typeof (value as User).id === "string" &&
    typeof (value as User).name === "string" &&
    typeof (value as User).email === "string"
  );
}

// Use with API responses:
const data: unknown = await response.json();
if (isUser(data)) {
  console.log(data.name); // ✅ safely narrowed to User
}
```

---

## Discriminated Unions

The most powerful narrowing pattern — give each variant a shared literal field.

### Basic Pattern
```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rectangle"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "rectangle":
      return shape.width * shape.height;
    case "triangle":
      return (shape.base * shape.height) / 2;
  }
}
```

### API Response Pattern
```typescript
type Result<T, E = Error> =
  | { ok: true; data: T }
  | { ok: false; error: E };

function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Usage
async function fetchUser(id: string): Promise<Result<User, ApiError>> {
  try {
    const user = await db.users.findById(id);
    if (!user) return err(new ApiError(404, "Not found"));
    return ok(user);
  } catch (e) {
    return err(new ApiError(500, "Internal error"));
  }
}

const result = await fetchUser("123");
if (result.ok) {
  console.log(result.data.name); // ✅ User
} else {
  console.log(result.error.message); // ✅ ApiError
}
```

### State Machine Pattern
```typescript
type ConnectionState =
  | { status: "disconnected" }
  | { status: "connecting"; attempt: number }
  | { status: "connected"; socket: WebSocket; connectedAt: Date }
  | { status: "error"; error: Error; lastAttempt: Date };

function renderStatus(state: ConnectionState): string {
  switch (state.status) {
    case "disconnected":
      return "Not connected";
    case "connecting":
      return `Connecting (attempt ${state.attempt})...`;
    case "connected":
      return `Connected since ${state.connectedAt.toISOString()}`;
    case "error":
      return `Error: ${state.error.message}`;
  }
}
```

---

## Exhaustive Checking

Ensure every union variant is handled — get a compile error when you add a new variant.

### never Check
```typescript
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

type Status = "active" | "inactive" | "banned";

function getLabel(status: Status): string {
  switch (status) {
    case "active":   return "Active";
    case "inactive": return "Inactive";
    case "banned":   return "Banned";
    default:
      return assertNever(status);
      // If you add a new status without handling it,
      // TS will error: Argument of type 'string' is not assignable to 'never'
  }
}
```

### Exhaustive Record
```typescript
// Alternative: use Record to ensure all keys are covered
const STATUS_LABELS: Record<Status, string> = {
  active: "Active",
  inactive: "Inactive",
  banned: "Banned",
  // ❌ Adding a new Status without adding it here = compile error
};
```

### satisfies for Exhaustive Maps
```typescript
const STATUS_CONFIG = {
  active:   { color: "green",  icon: "✅" },
  inactive: { color: "gray",   icon: "⏸️" },
  banned:   { color: "red",    icon: "🚫" },
} satisfies Record<Status, { color: string; icon: string }>;

// Keys are preserved as literal types (not widened to string)
STATUS_CONFIG.active.color; // ✅ "green" (literal), not string
```

---

## Assertion Functions

Assert that a condition is true, or throw. TS narrows the type after the assertion.

### asserts condition
```typescript
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function processUser(user: User | null) {
  assert(user, "User must exist");
  // After assert, user is narrowed to User
  console.log(user.name); // ✅
}
```

### asserts value is Type
```typescript
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new TypeError(`Expected string, got ${typeof value}`);
  }
}

function assertIsUser(value: unknown): asserts value is User {
  assert(typeof value === "object" && value !== null, "Expected object");
  assert("id" in value, "Missing id");
  assert("name" in value, "Missing name");
}

// Usage
const data: unknown = JSON.parse(input);
assertIsUser(data);
// After assertion, data is User
console.log(data.name); // ✅
```

### Non-Null Assertion Helper
```typescript
function assertDefined<T>(
  value: T | null | undefined,
  name: string = "value",
): asserts value is T {
  if (value == null) {
    throw new Error(`Expected ${name} to be defined`);
  }
}

// Usage
const el = document.getElementById("app");
assertDefined(el, "app element");
el.innerHTML = "Hello"; // ✅ el is HTMLElement, not null
```

---

## Explicit Resource Management (`using`, TS 5.2+)

The `using` keyword automatically cleans up resources when they go out of scope — like `defer` in Go or context managers in Python.

### Disposable Pattern
```typescript
// Synchronous disposable
class TempFile implements Disposable {
  path: string;

  constructor(name: string) {
    this.path = `/tmp/${name}`;
    // Create the file
  }

  [Symbol.dispose](): void {
    // Automatically called when `using` scope ends
    fs.unlinkSync(this.path);
    console.log(`Cleaned up ${this.path}`);
  }
}

// Usage — file is deleted when scope ends
function processData() {
  using file = new TempFile("data.json");
  // ... use file.path ...
} // ← [Symbol.dispose]() called automatically here
```

### Async Disposable
```typescript
class DatabaseConnection implements AsyncDisposable {
  private client: Client;

  constructor(url: string) {
    this.client = new Client(url);
  }

  async connect() {
    await this.client.connect();
    return this;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.client.end();
    console.log("Connection closed");
  }
}

// Usage
async function queryUsers() {
  await using db = await new DatabaseConnection(DATABASE_URL).connect();
  // ... query the database ...
} // ← connection automatically closed
```

### Practical: Lock Pattern
```typescript
class Mutex {
  private locked = false;

  async acquire(): Promise<Disposable> {
    while (this.locked) {
      await new Promise((r) => setTimeout(r, 10));
    }
    this.locked = true;

    return {
      [Symbol.dispose]: () => {
        this.locked = false;
      },
    };
  }
}

const mutex = new Mutex();

async function criticalSection() {
  using lock = await mutex.acquire();
  // ... exclusive access ...
} // ← lock automatically released
```

---

## Summary: When to Use What

| Pattern | Use Case |
|---------|----------|
| `typeof` | Primitives (string, number, boolean) |
| `instanceof` | Class instances (Error, Date, custom classes) |
| `in` operator | Check if property exists on object |
| `is` type guard | Reusable narrowing logic, filter callbacks |
| Discriminated union | Multiple variants with shared discriminant |
| `assertNever` | Exhaustive switch/case checking |
| `asserts` function | Throw-or-narrow pattern (validate early) |
| `satisfies` Record | Exhaustive mapping with preserved literal types |
| `using` / Disposable | Auto-cleanup of resources (files, connections, locks) |
