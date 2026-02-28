# Express API Scaffolding

Generate production-ready Express.js REST APIs with TypeScript, structured routing, validation, error handling, and testing.

## Project Structure

```
my-api/
├── src/
│   ├── index.ts                # Entry point — creates and starts server
│   ├── app.ts                  # Express app setup (middleware, routes)
│   ├── config/
│   │   ├── env.ts              # Environment variable validation (Zod)
│   │   └── cors.ts             # CORS configuration
│   ├── routes/
│   │   ├── index.ts            # Route aggregator
│   │   ├── health.ts           # GET /health
│   │   └── users.ts            # /api/users CRUD routes
│   ├── controllers/
│   │   └── users.controller.ts # Request handlers
│   ├── services/
│   │   └── users.service.ts    # Business logic
│   ├── middleware/
│   │   ├── error-handler.ts    # Global error handler
│   │   ├── validate.ts         # Zod validation middleware
│   │   ├── rate-limit.ts       # Rate limiting
│   │   └── request-id.ts       # Request ID injection
│   ├── types/
│   │   └── index.ts            # Shared types
│   └── utils/
│       ├── logger.ts           # Pino logger setup
│       └── api-error.ts        # Custom API error class
├── tests/
│   ├── setup.ts                # Test setup
│   ├── helpers/
│   │   └── request.ts          # Supertest helper
│   └── routes/
│       └── health.test.ts
├── .github/
│   └── workflows/
│       └── ci.yml
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── tsconfig.json
├── vitest.config.ts
├── package.json
└── README.md
```

## Key Files

### package.json

```json
{
  "name": "my-api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src/",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "express": "^5.0.0",
    "zod": "^3.23.0",
    "pino": "^9.0.0",
    "pino-pretty": "^13.0.0",
    "helmet": "^8.0.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.4.0",
    "uuid": "^11.0.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/cors": "^2.8.17",
    "@types/uuid": "^10.0.0",
    "typescript": "^5.7.0",
    "tsx": "^4.19.0",
    "vitest": "^3.0.0",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.0",
    "eslint": "^9.0.0",
    "@eslint/js": "^9.0.0",
    "typescript-eslint": "^8.0.0"
  }
}
```

### Entry Point

```typescript
// src/index.ts
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info(`${signal} received — shutting down`);
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
  // Force exit after 10s
  setTimeout(() => process.exit(1), 10_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

### App Setup

```typescript
// src/app.ts
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { corsOptions } from "./config/cors.js";
import { routes } from "./routes/index.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestId } from "./middleware/request-id.js";

export function createApp() {
  const app = express();

  // Security
  app.use(helmet());
  app.use(cors(corsOptions));

  // Parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Request tracking
  app.use(requestId);

  // Routes
  app.use(routes);

  // Error handling (must be last)
  app.use(errorHandler);

  return app;
}
```

### Environment Validation

```typescript
// src/config/env.ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  CORS_ORIGIN: z.string().default("*"),
  // DATABASE_URL: z.string().url(),  // Uncomment when adding database
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
```

### Error Handler

```typescript
// src/middleware/error-handler.ts
import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/api-error.js";
import { logger } from "../utils/logger.js";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: { message: err.message, code: err.code },
    });
    return;
  }

  // Unexpected errors
  logger.error({ err, method: req.method, url: req.url }, "Unhandled error");

  res.status(500).json({
    error: { message: "Internal server error", code: "INTERNAL_ERROR" },
  });
}
```

### API Error Class

```typescript
// src/utils/api-error.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = "ERROR"
  ) {
    super(message);
    this.name = "ApiError";
  }

  static badRequest(message: string, code = "BAD_REQUEST") {
    return new ApiError(400, message, code);
  }
  static unauthorized(message = "Unauthorized", code = "UNAUTHORIZED") {
    return new ApiError(401, message, code);
  }
  static forbidden(message = "Forbidden", code = "FORBIDDEN") {
    return new ApiError(403, message, code);
  }
  static notFound(message = "Not found", code = "NOT_FOUND") {
    return new ApiError(404, message, code);
  }
  static conflict(message: string, code = "CONFLICT") {
    return new ApiError(409, message, code);
  }
}
```

### Validation Middleware

```typescript
// src/middleware/validate.ts
import type { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export function validate(schema: ZodSchema, source: "body" | "query" | "params" = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: {
            message: "Validation failed",
            code: "VALIDATION_ERROR",
            details: err.errors.map((e) => ({
              path: e.path.join("."),
              message: e.message,
            })),
          },
        });
        return;
      }
      next(err);
    }
  };
}
```

### Dockerfile

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev

FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### docker-compose.yml

```yaml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: mydb
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  pgdata:
```

## Variants

### With Database (Drizzle + PostgreSQL)
- Add `drizzle-orm`, `postgres` to dependencies
- Create `src/db/schema.ts`, `src/db/index.ts`
- Add `drizzle.config.ts` and migration scripts

### With Authentication (JWT)
- Add `jsonwebtoken`, `bcryptjs` to dependencies
- Create `src/middleware/auth.ts` — JWT verification
- Create `src/routes/auth.ts` — login/register endpoints
- Add `JWT_SECRET` to env schema

### With WebSocket (Socket.IO)
- Add `socket.io` to dependencies
- Create `src/ws/index.ts` — WebSocket handler
- Attach to HTTP server in `src/index.ts`

## Checklist After Scaffolding

1. Replace "my-api" with actual project name
2. Set up `.env` from `.env.example`
3. Run `npm install`
4. Run `npm run dev` — verify health endpoint at `GET /health`
5. Add your routes in `src/routes/`
6. Add database when ready (Drizzle recommended)
7. Customize CORS origins for production
8. Set up deployment (Docker or platform of choice)
