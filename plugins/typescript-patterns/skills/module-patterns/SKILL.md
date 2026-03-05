---
description: When the user asks about TypeScript module patterns, barrel exports, declaration merging, module augmentation, ambient declarations, tsconfig configuration, import type, verbatimModuleSyntax, path aliases, project references, d.ts files, declare module, or how to organize TypeScript modules and project structure
---

# Module Patterns

## Barrel Exports

Re-export from a single `index.ts` for cleaner imports.

### Basic Barrel
```typescript
// src/models/user.ts
export interface User { id: string; name: string; email: string }
export type CreateUser = Omit<User, "id">;

// src/models/post.ts
export interface Post { id: string; title: string; body: string; authorId: string }

// src/models/index.ts (barrel)
export { User, CreateUser } from "./user";
export { Post } from "./post";

// Now consumers can do:
import { User, Post, CreateUser } from "@/models";
// Instead of:
import { User, CreateUser } from "@/models/user";
import { Post } from "@/models/post";
```

### When to Use Barrels

**✅ Good — public API surface:**
```typescript
// src/components/index.ts
export { Button } from "./Button";
export { Input } from "./Input";
export { Modal } from "./Modal";
// Package consumers import from one place
```

**❌ Bad — barrel causes circular imports or bundle bloat:**
```typescript
// DON'T barrel everything in a large monorepo
// It can pull in the entire module tree
export * from "./moduleA";
export * from "./moduleB";
export * from "./moduleC";
// Importing { one thing } loads ALL modules
```

### Best Practices
- Use barrels for public APIs and component libraries
- Avoid `export *` — prefer named re-exports for visibility
- Don't barrel internal implementation files
- Use `sideEffects: false` in package.json so bundlers can tree-shake barrels
- For large projects, barrel at feature boundaries, not globally

---

## Declaration Merging

TypeScript merges declarations with the same name. This is how interfaces work with `extends`, and how modules can be augmented.

### Interface Merging
```typescript
// Two declarations of the same interface are merged:
interface Config {
  debug: boolean;
}

interface Config {
  logLevel: "info" | "warn" | "error";
}

// Result:
// interface Config { debug: boolean; logLevel: "info" | "warn" | "error" }
```

### Enum Merging
```typescript
enum Color {
  Red = 0,
  Green = 1,
  Blue = 2,
}

enum Color {
  DarkRed = 3,
  DarkGreen = 4,
  DarkBlue = 5,
}

// Color has all 6 members
```

### Namespace Merging (with Class or Function)
```typescript
// Add static properties to a class
class Validator {
  validate(value: unknown): boolean {
    return value != null;
  }
}

namespace Validator {
  export const VERSION = "1.0.0";
  export function create(): Validator {
    return new Validator();
  }
}

Validator.VERSION;     // "1.0.0"
Validator.create();    // new Validator()
```

---

## Module Augmentation

Extend third-party types without modifying the original package.

### Extend Express Request
```typescript
// src/types/express.d.ts
import "express";

declare module "express" {
  interface Request {
    user?: {
      id: string;
      role: "admin" | "user";
    };
    requestId: string;
  }
}

// Now in your middleware:
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID(); // ✅ TypeScript knows about requestId
  next();
});
```

### Extend Environment Variables
```typescript
// src/types/env.d.ts
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      PORT: string;
      DATABASE_URL: string;
      JWT_SECRET: string;
    }
  }
}

export {}; // Makes this a module (required for `declare global`)

// Now process.env.DATABASE_URL is typed as string (not string | undefined)
```

### Extend Window
```typescript
// src/types/global.d.ts
declare global {
  interface Window {
    __INITIAL_STATE__: AppState;
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

export {};
```

### Extend Third-Party Libraries
```typescript
// Extend Zod with custom methods
import "zod";

declare module "zod" {
  interface ZodString {
    slug(): ZodString;
  }
}

// Extend Fastify
import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user: { id: string; role: string } | null;
  }
}
```

---

## Ambient Declarations

Declare types for untyped JS libraries, global variables, or non-TS assets.

### Declare Module (Untyped Package)
```typescript
// src/types/legacy-lib.d.ts
declare module "legacy-analytics" {
  export function track(event: string, data?: Record<string, unknown>): void;
  export function identify(userId: string): void;
  export function page(name: string): void;
}

// Now you can import with types:
import { track, identify } from "legacy-analytics";
```

### Declare Asset Types
```typescript
// src/types/assets.d.ts

// CSS modules
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

declare module "*.module.scss" {
  const classes: Record<string, string>;
  export default classes;
}

// Images
declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  import type { FC, SVGProps } from "react";
  const SVGComponent: FC<SVGProps<SVGSVGElement>>;
  export default SVGComponent;
}

// Other assets
declare module "*.graphql" {
  import { DocumentNode } from "graphql";
  const value: DocumentNode;
  export default value;
}
```

### Declare Global Variables
```typescript
// src/types/globals.d.ts
declare const __DEV__: boolean;
declare const __VERSION__: string;
declare const __BUILD_TIME__: string;

// Usage anywhere:
if (__DEV__) {
  console.log("Development mode");
}
```

---

## tsconfig.json Best Practices

### Recommended Base (Node.js + ESM)
```json
{
  "compilerOptions": {
    // Output
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",

    // Strictness — ALL on
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,

    // Interop
    "esModuleInterop": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,

    // Declarations
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    // Paths
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### Recommended Base (Next.js)
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true,

    "esModuleInterop": true,
    "isolatedModules": true,
    "incremental": true,
    "skipLibCheck": true,

    "paths": {
      "@/*": ["./src/*"]
    },

    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Key strict Flags Explained

| Flag | What It Does | Why Enable |
|------|-------------|-----------|
| `strict` | Enables all strict checks below | Baseline safety |
| `noUncheckedIndexedAccess` | `arr[0]` returns `T \| undefined` | Catches out-of-bounds access |
| `exactOptionalPropertyTypes` | `x?: string` ≠ `x: string \| undefined` | Distinguish missing from undefined |
| `noImplicitReturns` | Error if function path has no return | Prevent accidental undefined |
| `noFallthroughCasesInSwitch` | Error on fall-through switch cases | Prevent accidental fall-through |
| `forceConsistentCasingInFileNames` | Case-sensitive imports | Works cross-platform |
| `verbatimModuleSyntax` | Use `import type` or error | Cleaner tree-shaking |
| `isolatedModules` | Per-file transpilation safe | Required for esbuild/swc |

### Path Aliases
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/lib/*": ["src/lib/*"],
      "@/types/*": ["src/types/*"]
    }
  }
}
```

**Note**: Path aliases need bundler/runner support too:
- **Next.js**: Works out of the box
- **Node.js**: Use `tsx` or `tsc-alias`
- **Vitest/Jest**: Configure `resolve.alias` or `moduleNameMapper`

### Project References (Monorepo)
```json
// tsconfig.json (root)
{
  "references": [
    { "path": "packages/shared" },
    { "path": "packages/api" },
    { "path": "packages/web" }
  ]
}

// packages/api/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "references": [
    { "path": "../shared" }
  ]
}
```

Build with `tsc --build` for incremental cross-package compilation.

---

## Import Patterns

### Type-Only Imports
```typescript
// Import only the type — erased at runtime, zero bundle impact
import type { User } from "./models";
import type { Request, Response } from "express";

// Mixed import
import { z, type ZodSchema } from "zod";

// Type-only re-export
export type { User, CreateUser } from "./models";
```

### Dynamic Imports (Code Splitting)
```typescript
// Dynamic import returns Promise<Module>
const { heavy } = await import("./heavy-module");

// React lazy loading
const Dashboard = lazy(() => import("./pages/Dashboard"));

// Conditional import
async function loadAnalytics() {
  if (process.env.NODE_ENV === "production") {
    const { init } = await import("./analytics");
    init();
  }
}
```

### Namespace Import
```typescript
// Import everything as namespace
import * as models from "./models";

const user: models.User = { id: "1", name: "Alice", email: "a@b.com" };

// Useful for avoiding name collisions
import * as userApi from "./api/users";
import * as postApi from "./api/posts";

await userApi.getById("123");
await postApi.getById("456");
```
