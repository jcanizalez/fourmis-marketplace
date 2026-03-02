---
description: When the user asks about Zod schemas, runtime validation in TypeScript, form validation with Zod, API request or response validation, inferring TypeScript types from schemas, or type-safe validation patterns
---

# Zod Validation Patterns

## Why Zod

TypeScript types are erased at runtime — they can't validate external data (API responses, form input, env vars, JSON files). Zod bridges this gap: define a schema once, get both runtime validation and TypeScript types.

```
npm install zod
```

---

## Schema Basics

### Primitives
```typescript
import { z } from "zod";

const nameSchema = z.string().min(1).max(100);
const ageSchema = z.number().int().positive();
const emailSchema = z.string().email();
const urlSchema = z.string().url();
const uuidSchema = z.string().uuid();
const dateSchema = z.coerce.date(); // Converts string → Date
```

### Objects
```typescript
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
  role: z.enum(["admin", "user", "guest"]),
  createdAt: z.coerce.date(),
});

// Infer the TypeScript type from the schema
type User = z.infer<typeof UserSchema>;
// { id: string; name: string; email: string; age?: number; role: "admin" | "user" | "guest"; createdAt: Date }
```

### Parse vs SafeParse
```typescript
// parse — throws ZodError on failure
const user = UserSchema.parse(data); // User or throws

// safeParse — returns Result-like object, never throws
const result = UserSchema.safeParse(data);
if (result.success) {
  console.log(result.data); // User
} else {
  console.log(result.error.issues); // ZodIssue[]
}
```

---

## Schema Composition

### Extend and Merge
```typescript
const BaseSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Extend adds fields
const UserSchema = BaseSchema.extend({
  name: z.string(),
  email: z.string().email(),
});

// Merge combines two schemas (second wins on conflicts)
const WithMetadata = z.object({ version: z.number() });
const FullUser = UserSchema.merge(WithMetadata);
```

### Pick and Omit
```typescript
// Like TypeScript's Pick/Omit
const UserPreview = UserSchema.pick({ id: true, name: true });
const CreateUser = UserSchema.omit({ id: true, createdAt: true, updatedAt: true });
```

### Partial and Required
```typescript
const UpdateUser = UserSchema.partial();
// All fields optional — good for PATCH requests

const StrictUser = UserSchema.required();
// All fields required — removes optionals
```

### Arrays and Tuples
```typescript
const TagsSchema = z.array(z.string()).min(1).max(10);

const CoordSchema = z.tuple([z.number(), z.number()]);
// [number, number]

const PaginatedSchema = z.object({
  items: z.array(UserSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(100),
});
```

### Unions and Discriminated Unions
```typescript
// Simple union
const StringOrNumber = z.union([z.string(), z.number()]);

// Discriminated union — more efficient, better errors
const EventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("click"), x: z.number(), y: z.number() }),
  z.object({ type: z.literal("keypress"), key: z.string() }),
  z.object({ type: z.literal("scroll"), offset: z.number() }),
]);

type Event = z.infer<typeof EventSchema>;
```

---

## Transforms and Refinements

### Transform
```typescript
// Transform the parsed value
const SlugSchema = z.string().transform((s) => s.toLowerCase().replace(/\s+/g, "-"));

SlugSchema.parse("Hello World"); // "hello-world"

// Coerce string to number
const NumericId = z.string().transform(Number).pipe(z.number().int().positive());

// Transform entire object
const ApiUserSchema = z
  .object({ first_name: z.string(), last_name: z.string() })
  .transform((u) => ({
    firstName: u.first_name,
    lastName: u.last_name,
    fullName: `${u.first_name} ${u.last_name}`,
  }));
```

### Refine (Custom Validation)
```typescript
const PasswordSchema = z
  .string()
  .min(8)
  .refine((pw) => /[A-Z]/.test(pw), "Must contain an uppercase letter")
  .refine((pw) => /[0-9]/.test(pw), "Must contain a number")
  .refine((pw) => /[^A-Za-z0-9]/.test(pw), "Must contain a special character");

// Cross-field validation with superRefine
const SignupSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords don't match",
        path: ["confirmPassword"],
      });
    }
  });
```

---

## API Validation

### Express / Node.js Middleware
```typescript
import { z, ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";

function validate(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) req.body = schema.body.parse(req.body);
      if (schema.query) req.query = schema.query.parse(req.query);
      if (schema.params) req.params = schema.params.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: "Validation failed",
          issues: error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        });
      } else {
        next(error);
      }
    }
  };
}

// Usage
const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  tags: z.array(z.string()).max(5).default([]),
});

app.post(
  "/api/posts",
  validate({ body: CreatePostSchema }),
  (req, res) => {
    // req.body is typed and validated
    const { title, body, tags } = req.body;
  },
);
```

### Next.js Server Actions
```typescript
"use server";

import { z } from "zod";

const ContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactForm = z.infer<typeof ContactSchema>;

export async function submitContact(formData: FormData) {
  const result = ContactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  });

  if (!result.success) {
    return {
      success: false as const,
      errors: result.error.flatten().fieldErrors,
    };
  }

  await db.contacts.create({ data: result.data });
  return { success: true as const };
}
```

### Fetch Response Validation
```typescript
async function fetchUsers(): Promise<User[]> {
  const response = await fetch("/api/users");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const json = await response.json();
  return z.array(UserSchema).parse(json);
  // Throws if API response doesn't match schema
}

// Safer version with error handling
async function safeFetchUsers() {
  const response = await fetch("/api/users");
  const json = await response.json();
  const result = z.array(UserSchema).safeParse(json);

  if (!result.success) {
    console.error("API schema mismatch:", result.error.issues);
    throw new Error("Unexpected API response format");
  }

  return result.data;
}
```

---

## Form Validation (React)

### With React Hook Form
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be 8+ characters"),
  rememberMe: z.boolean().default(false),
});

type LoginForm = z.infer<typeof LoginSchema>;

function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = (data: LoginForm) => {
    // data is fully typed and validated
    console.log(data.email, data.password);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email")} />
      {errors.email && <span>{errors.email.message}</span>}

      <input type="password" {...register("password")} />
      {errors.password && <span>{errors.password.message}</span>}

      <label>
        <input type="checkbox" {...register("rememberMe")} />
        Remember me
      </label>

      <button type="submit">Log in</button>
    </form>
  );
}
```

---

## Environment Variables

### Type-Safe Env with Zod
```typescript
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

// Parse and export — fails fast at startup if invalid
export const env = EnvSchema.parse(process.env);
export type Env = z.infer<typeof EnvSchema>;

// Now `env.PORT` is number, `env.DATABASE_URL` is string, etc.
```

---

## Patterns Summary

| Pattern | Schema | Example |
|---------|--------|---------|
| Infer type from schema | `z.infer<typeof S>` | Single source of truth |
| API request body | `schema.parse(body)` | Express middleware |
| API response | `schema.safeParse(json)` | Fetch wrapper |
| Form validation | `zodResolver(schema)` | React Hook Form |
| Env vars | `schema.parse(process.env)` | Startup validation |
| Transform data | `.transform(fn)` | snake_case → camelCase |
| Cross-field validation | `.superRefine()` | Password confirmation |
| Union responses | `z.discriminatedUnion()` | WebSocket messages |
| Default values | `.default(value)` | Optional with fallback |
| Coerce types | `z.coerce.number()` | Query string → number |
