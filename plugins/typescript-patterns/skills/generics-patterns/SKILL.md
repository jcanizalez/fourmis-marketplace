---
description: When the user asks about TypeScript generics, generic functions, constrained generics, conditional types, mapped types, template literal types, infer keyword, or advanced type-level programming in TypeScript
---

# Generics Patterns

## Generic Functions

### Basic Generic Function
```typescript
function identity<T>(value: T): T {
  return value;
}

// Type is inferred — no need to specify <string>
const name = identity("hello"); // string
const count = identity(42);      // number
```

### Multiple Type Parameters
```typescript
function pair<K, V>(key: K, value: V): [K, V] {
  return [key, value];
}

function map<T, U>(items: T[], fn: (item: T) => U): U[] {
  return items.map(fn);
}

// Swap types
function swap<A, B>(tuple: [A, B]): [B, A] {
  return [tuple[1], tuple[0]];
}
```

### Generic Arrow Functions (JSX-safe)
```typescript
// In .tsx files, <T> conflicts with JSX — use extends:
const identity = <T extends unknown>(value: T): T => value;

// Or use trailing comma:
const identity2 = <T,>(value: T): T => value;
```

---

## Constrained Generics

### extends Constraint
```typescript
// T must have a .length property
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

longest("hello", "world");   // ✅ string has length
longest([1, 2], [1, 2, 3]);  // ✅ array has length
longest(10, 20);              // ❌ number has no length
```

### Key Constraints with keyof
```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: "Alice", age: 30 };
getProperty(user, "name");  // ✅ string
getProperty(user, "age");   // ✅ number
getProperty(user, "email"); // ❌ "email" not in keyof user
```

### Constructor Constraint
```typescript
function create<T>(ctor: new () => T): T {
  return new ctor();
}

// With args:
function createWith<T, A extends unknown[]>(
  ctor: new (...args: A) => T,
  ...args: A
): T {
  return new ctor(...args);
}
```

---

## Conditional Types

### Basic Conditional Type
```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<"hello">; // true
type B = IsString<42>;      // false
```

### Distributive Conditional Types
```typescript
// When T is a union, the condition distributes over each member:
type ToArray<T> = T extends unknown ? T[] : never;

type Result = ToArray<string | number>;
// = string[] | number[]  (NOT (string | number)[])

// Prevent distribution with [T]:
type ToArrayNonDist<T> = [T] extends [unknown] ? T[] : never;

type Result2 = ToArrayNonDist<string | number>;
// = (string | number)[]
```

### infer Keyword
```typescript
// Extract return type
type ReturnOf<T> = T extends (...args: any[]) => infer R ? R : never;

type R1 = ReturnOf<() => string>;          // string
type R2 = ReturnOf<(x: number) => boolean>; // boolean

// Extract promise value
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

type A1 = Awaited<Promise<string>>;           // string
type A2 = Awaited<Promise<Promise<number>>>;  // number

// Extract array element
type ElementOf<T> = T extends (infer E)[] ? E : never;

type E1 = ElementOf<string[]>;  // string
type E2 = ElementOf<number[]>;  // number

// Extract function parameters
type FirstArg<T> = T extends (first: infer F, ...rest: any[]) => any ? F : never;

type F1 = FirstArg<(name: string, age: number) => void>; // string
```

---

## Mapped Types

### Basic Mapped Type
```typescript
type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};

type Partial<T> = {
  [K in keyof T]?: T[K];
};

type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};
```

### Key Remapping (as clause)
```typescript
// Prefix keys with "get"
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface User {
  name: string;
  age: number;
}

type UserGetters = Getters<User>;
// { getName: () => string; getAge: () => number }

// Filter keys by value type
type StringKeys<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

type UserStrings = StringKeys<User>;
// { name: string }
```

### Mapped Type Modifiers
```typescript
// Remove readonly
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

// Remove optional
type Required<T> = {
  [K in keyof T]-?: T[K];
};
```

---

## Template Literal Types

### Basic Template Literals
```typescript
type EventName = `on${Capitalize<"click" | "focus" | "blur">}`;
// "onClick" | "onFocus" | "onBlur"

type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE";
type Endpoint = "/users" | "/posts";
type Route = `${HTTPMethod} ${Endpoint}`;
// "GET /users" | "GET /posts" | "POST /users" | ...
```

### String Manipulation Types
```typescript
type Upper = Uppercase<"hello">;     // "HELLO"
type Lower = Lowercase<"HELLO">;     // "hello"
type Cap   = Capitalize<"hello">;    // "Hello"
type Uncap = Uncapitalize<"Hello">;  // "hello"
```

### Parsing with Template Literals
```typescript
// Extract parts from a string pattern
type ExtractRouteParams<T extends string> =
  T extends `${infer _Start}:${infer Param}/${infer Rest}`
    ? Param | ExtractRouteParams<`/${Rest}`>
    : T extends `${infer _Start}:${infer Param}`
      ? Param
      : never;

type Params = ExtractRouteParams<"/users/:userId/posts/:postId">;
// "userId" | "postId"
```

### Event Emitter Pattern
```typescript
type EventMap = {
  click: { x: number; y: number };
  focus: { target: string };
  blur: { target: string };
};

type EventHandler<T extends keyof EventMap> = (event: EventMap[T]) => void;

class TypedEmitter<Events extends Record<string, unknown>> {
  on<K extends string & keyof Events>(
    event: K,
    handler: (payload: Events[K]) => void,
  ): void { /* ... */ }

  emit<K extends string & keyof Events>(
    event: K,
    payload: Events[K],
  ): void { /* ... */ }
}

const emitter = new TypedEmitter<EventMap>();
emitter.on("click", (e) => console.log(e.x)); // ✅ e is { x, y }
emitter.on("click", (e) => console.log(e.target)); // ❌ no .target
```

---

## Generic Classes and Interfaces

### Generic Class
```typescript
class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }
}

const numbers = new Stack<number>();
numbers.push(42);
```

### Generic Interface with Default
```typescript
interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: Omit<T, "id">): Promise<T>;
  update(id: ID, data: Partial<T>): Promise<T>;
  delete(id: ID): Promise<void>;
}
```

### Builder Pattern with Generics
```typescript
class QueryBuilder<T extends Record<string, unknown>> {
  private conditions: string[] = [];

  where<K extends keyof T>(
    field: K,
    op: "=" | ">" | "<" | "!=",
    value: T[K],
  ): this {
    this.conditions.push(`${String(field)} ${op} ?`);
    return this;
  }

  build(): string {
    return `SELECT * WHERE ${this.conditions.join(" AND ")}`;
  }
}
```

---

## Common Patterns

### Type-Safe Object.keys
```typescript
// Object.keys returns string[], not (keyof T)[]
// Use this helper:
function typedKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

// Or use a type-safe entries:
function typedEntries<T extends object>(obj: T): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}
```

### Recursive Types
```typescript
// Deep partial
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// Deep readonly
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

// JSON-safe types
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
```

### Variadic Tuple Types
```typescript
// Typed pipe/compose
type Last<T extends unknown[]> = T extends [...infer _, infer L] ? L : never;

function pipe<T extends [(...args: any[]) => any, ...Array<(arg: any) => any>]>(
  ...fns: T
): (...args: Parameters<T[0]>) => ReturnType<Last<T>> {
  return (...args) => fns.reduce((acc, fn) => fn(acc), (fns[0] as any)(...args));
}
```
