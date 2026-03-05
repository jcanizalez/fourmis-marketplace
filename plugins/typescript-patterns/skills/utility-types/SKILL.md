---
description: When the user asks about TypeScript utility types, built-in types like Partial or Omit or Pick or Record, custom utility types, branded types, opaque types, nominal typing, NoInfer, Awaited, satisfies operator, or creating type helpers in TypeScript
---

# Utility Types

## Built-in Utility Types

### Object Manipulation

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: Date;
}

// Make all properties optional
type PartialUser = Partial<User>;

// Make all properties required
type RequiredUser = Required<User>;

// Make all properties readonly
type ReadonlyUser = Readonly<User>;

// Pick specific properties
type UserPreview = Pick<User, "id" | "name">;
// { id: string; name: string }

// Omit specific properties
type CreateUser = Omit<User, "id" | "createdAt">;
// { name: string; email: string; role: "admin" | "user" }
```

### Record Type
```typescript
// Map keys to a value type
type StatusMap = Record<"pending" | "active" | "banned", User[]>;

// Dynamic key mapping
type UsersByRole = Record<User["role"], User[]>;
// { admin: User[]; user: User[] }

// Type-safe lookup table
const HTTP_STATUS: Record<number, string> = {
  200: "OK",
  404: "Not Found",
  500: "Internal Server Error",
};
```

### Extract and Exclude
```typescript
type Role = "admin" | "editor" | "viewer" | "guest";

// Keep only matching members
type PrivilegedRole = Extract<Role, "admin" | "editor">;
// "admin" | "editor"

// Remove matching members
type PublicRole = Exclude<Role, "admin">;
// "editor" | "viewer" | "guest"

// Remove null/undefined
type NonNullString = NonNullable<string | null | undefined>;
// string
```

### Function Utilities
```typescript
function fetchUser(id: string, options?: { cache: boolean }): Promise<User> {
  // ...
}

// Extract parameter types
type FetchParams = Parameters<typeof fetchUser>;
// [id: string, options?: { cache: boolean }]

// Extract return type
type FetchReturn = ReturnType<typeof fetchUser>;
// Promise<User>

// Unwrap promise
type FetchResult = Awaited<ReturnType<typeof fetchUser>>;
// User

// Constructor parameters
type DateArgs = ConstructorParameters<typeof Date>;
```

### NoInfer (TS 5.4+)

Prevent TypeScript from inferring a type parameter from a specific position:

```typescript
// Without NoInfer — default is inferred from items too:
function createList<T>(items: T[], default_: T): T[] {
  return items;
}

createList([1, 2, 3], "oops");
// ✅ No error — T is inferred as number | string (wrong!)

// With NoInfer — default must match inferred T from items:
function createList<T>(items: T[], default_: NoInfer<T>): T[] {
  return items;
}

createList([1, 2, 3], "oops");
// ❌ Error: Argument of type 'string' is not assignable to 'number'

createList([1, 2, 3], 0);
// ✅ Works — T is number, default is number
```

Useful for functions where one parameter should **drive** inference and others should **follow**.

---

## Custom Utility Types

### DeepPartial / DeepRequired
```typescript
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? T[K] extends Array<infer U>
      ? Array<DeepPartial<U>>
      : DeepPartial<T[K]>
    : T[K];
};

type DeepRequired<T> = {
  [K in keyof T]-?: T[K] extends object
    ? T[K] extends Array<infer U>
      ? Array<DeepRequired<U>>
      : DeepRequired<T[K]>
    : T[K];
};

// Usage: nested config objects
interface Config {
  db?: {
    host?: string;
    port?: number;
    ssl?: { cert?: string; key?: string };
  };
}

type FullConfig = DeepRequired<Config>;
// All properties required, including nested ones
```

### PickByType / OmitByType
```typescript
type PickByType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K];
};

type OmitByType<T, U> = {
  [K in keyof T as T[K] extends U ? never : K]: T[K];
};

// Usage
type StringFields = PickByType<User, string>;
// { id: string; name: string; email: string }

type NonStringFields = OmitByType<User, string>;
// { role: "admin" | "user"; createdAt: Date }
```

### MakeOptional / MakeRequired
```typescript
// Make specific keys optional, keep rest as-is
type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Make specific keys required, keep rest as-is
type MakeRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// Usage
type UpdateUser = MakeOptional<User, "email" | "role">;
// id: string; name: string; createdAt: Date; email?: string; role?: ...
```

### Merge Types
```typescript
// Like Object.assign for types — second type wins on conflicts
type Merge<A, B> = Omit<A, keyof B> & B;

interface BaseConfig {
  timeout: number;
  retries: number;
  debug: boolean;
}

interface ProdConfig {
  debug: false;        // Override to literal false
  monitoring: boolean; // New field
}

type Config = Merge<BaseConfig, ProdConfig>;
// { timeout: number; retries: number; debug: false; monitoring: boolean }
```

### PathOf (Dot-Notation Paths)
```typescript
type PathOf<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? `${Prefix}${K}` | PathOf<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

interface Form {
  user: { name: string; address: { city: string; zip: string } };
  settings: { theme: string };
}

type FormPath = PathOf<Form>;
// "user" | "user.name" | "user.address" | "user.address.city" | "user.address.zip" | "settings" | "settings.theme"
```

---

## Branded / Opaque Types

TypeScript uses structural typing — two types with the same shape are compatible. Branded types add a phantom property to prevent accidental mixing.

### Basic Branded Type
```typescript
// Brand helper
type Brand<T, B extends string> = T & { readonly __brand: B };

// Define branded types
type UserId = Brand<string, "UserId">;
type PostId = Brand<string, "PostId">;
type Email = Brand<string, "Email">;

// Constructor functions (type guards)
function UserId(id: string): UserId {
  return id as UserId;
}

function PostId(id: string): PostId {
  return id as PostId;
}

// Now they're incompatible:
function getUser(id: UserId): User { /* ... */ }
function getPost(id: PostId): Post { /* ... */ }

const userId = UserId("usr_123");
const postId = PostId("post_456");

getUser(userId);  // ✅
getUser(postId);  // ❌ Type 'PostId' is not assignable to 'UserId'
getUser("raw");   // ❌ Type 'string' is not assignable to 'UserId'
```

### Validated Branded Types
```typescript
type PositiveInt = Brand<number, "PositiveInt">;
type Email = Brand<string, "Email">;
type URL = Brand<string, "URL">;

function PositiveInt(n: number): PositiveInt {
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Expected positive integer, got ${n}`);
  }
  return n as PositiveInt;
}

function Email(value: string): Email {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error(`Invalid email: ${value}`);
  }
  return value as Email;
}

// Safe math — return type preserves brand only when valid
function addPositive(a: PositiveInt, b: PositiveInt): PositiveInt {
  return (a + b) as PositiveInt; // Sum of positives is positive
}
```

### Currency Example
```typescript
type USD = Brand<number, "USD">;
type EUR = Brand<number, "EUR">;

function USD(amount: number): USD { return amount as USD; }
function EUR(amount: number): EUR { return amount as EUR; }

function addUSD(a: USD, b: USD): USD {
  return (a + b) as USD;
}

const price = USD(29.99);
const tax = USD(2.40);
const euros = EUR(25.00);

addUSD(price, tax);    // ✅
addUSD(price, euros);  // ❌ Can't mix currencies!
addUSD(price, 10);     // ❌ Must be branded USD
```

---

## Discriminated Union Helpers

### Extract Variant from Union
```typescript
type Event =
  | { type: "click"; x: number; y: number }
  | { type: "keypress"; key: string }
  | { type: "scroll"; offset: number };

// Extract a specific variant
type ClickEvent = Extract<Event, { type: "click" }>;
// { type: "click"; x: number; y: number }

// Generic helper
type EventByType<T extends Event["type"]> = Extract<Event, { type: T }>;

type KeyEvent = EventByType<"keypress">;
// { type: "keypress"; key: string }
```

### Exhaustive Record from Union
```typescript
// Ensure every variant is handled
type EventHandlers = {
  [E in Event as E["type"]]: (event: E) => void;
};
// {
//   click: (event: { type: "click"; x: number; y: number }) => void;
//   keypress: (event: { type: "keypress"; key: string }) => void;
//   scroll: (event: { type: "scroll"; offset: number }) => void;
// }
```

---

## Patterns by Use Case

| Need | Type | Example |
|------|------|---------|
| API response subset | `Pick<T, K>` | `Pick<User, "id" \| "name">` |
| Create form data | `Omit<T, "id" \| "createdAt">` | Form without server fields |
| Partial update | `Partial<T>` | PATCH request body |
| Config with defaults | `Required<T>` | Merge defaults with partial input |
| Lookup table | `Record<K, V>` | `Record<StatusCode, string>` |
| Prevent ID mixing | `Brand<string, "UserId">` | Branded types |
| Filter union members | `Extract<T, U>` | Get specific event type |
| Remove null | `NonNullable<T>` | After null check |
| Nested optional | `DeepPartial<T>` | Nested config objects |
| Dot-path access | `PathOf<T>` | Form field paths |
