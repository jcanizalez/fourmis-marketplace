---
description: When the user asks about validating environment variables, type-safe env access, t3-env or Zod env schemas, pydantic-settings, Go envconfig validation, or making apps fail fast on missing config
---

# Environment Validation

Type-safe environment variable validation — catch missing or malformed config at startup, not at runtime in production.

## Why Validate

```typescript
// WITHOUT validation — crashes at 3 AM when someone uses the feature
const port = parseInt(process.env.PORT); // NaN if missing
const url = process.env.DATABASE_URL;     // undefined — silent failure

// WITH validation — crashes immediately at startup with a clear message
// ❌ Error: DATABASE_URL is required
// ❌ Error: PORT must be a number between 1 and 65535
```

## Node.js / TypeScript

### @t3-oss/env-nextjs (Recommended for Next.js)

```typescript
// src/env.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  // Server-side variables (never exposed to client)
  server: {
    DATABASE_URL: z.string().url(),
    API_KEY: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    REDIS_URL: z.string().url().optional(),
  },

  // Client-side variables (must be prefixed with NEXT_PUBLIC_)
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_ANALYTICS_ID: z.string().optional(),
  },

  // Map to actual env vars (required for tree-shaking)
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    API_KEY: process.env.API_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    LOG_LEVEL: process.env.LOG_LEVEL,
    REDIS_URL: process.env.REDIS_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_ANALYTICS_ID: process.env.NEXT_PUBLIC_ANALYTICS_ID,
  },
});

// Usage — fully typed, autocomplete works
const dbUrl = env.DATABASE_URL; // string (guaranteed)
const port = env.PORT;          // number (guaranteed)
```

### @t3-oss/env-core (For non-Next.js)

```typescript
// src/env.ts
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    PORT: z.coerce.number().default(3000),
    API_KEY: z.string().min(1),
  },
  runtimeEnv: process.env,
  // Or if using a bundler:
  // runtimeEnvStrict: { DATABASE_URL: process.env.DATABASE_URL, ... },
});
```

### Zod (Manual Validation)

```typescript
// src/config.ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  API_KEY: z.string().min(1, "API_KEY is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  CORS_ORIGINS: z
    .string()
    .transform((s) => s.split(",").map((o) => o.trim()))
    .default("http://localhost:3000"),
  RATE_LIMIT_RPM: z.coerce.number().int().positive().default(100),
  REDIS_URL: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),
});

// Validate at startup
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const config = parsed.data;
export type Config = z.infer<typeof envSchema>;
```

### Vite Environment Types

```typescript
// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_ANALYTICS_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

## Python

### pydantic-settings (Recommended)

```python
# src/config.py
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore unknown env vars
    )

    # Required
    database_url: str
    api_key: str = Field(min_length=1)
    jwt_secret: str = Field(min_length=32)

    # With defaults
    port: int = 8000
    debug: bool = False
    log_level: str = "info"
    env: str = "development"

    # Optional
    redis_url: str | None = None
    sentry_dsn: str | None = None

    # Computed/validated
    cors_origins: list[str] = ["http://localhost:3000"]

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if not v.startswith(("postgresql://", "sqlite://", "mysql://")):
            raise ValueError("DATABASE_URL must be a valid database URL")
        return v

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        allowed = {"debug", "info", "warn", "warning", "error", "critical"}
        if v.lower() not in allowed:
            raise ValueError(f"LOG_LEVEL must be one of {allowed}")
        return v.lower()

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

# Singleton — validates on first import
settings = Settings()

# Usage
print(settings.database_url)  # str (guaranteed)
print(settings.port)          # int (guaranteed)
```

### Nested Settings

```python
class DatabaseSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DB_")

    host: str = "localhost"
    port: int = 5432
    name: str = "mydb"
    user: str = "postgres"
    password: str

    @property
    def url(self) -> str:
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"

class Settings(BaseSettings):
    db: DatabaseSettings = DatabaseSettings()
    # Reads DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
```

## Go

### envconfig (Recommended)

```go
// internal/config/config.go
package config

import (
    "fmt"
    "github.com/kelseyhightower/envconfig"
)

type Config struct {
    // Required
    DatabaseURL string `envconfig:"DATABASE_URL" required:"true"`
    APIKey      string `envconfig:"API_KEY" required:"true"`
    JWTSecret   string `envconfig:"JWT_SECRET" required:"true"`

    // With defaults
    Port     int    `envconfig:"PORT" default:"8080"`
    Env      string `envconfig:"APP_ENV" default:"development"`
    LogLevel string `envconfig:"LOG_LEVEL" default:"info"`
    Debug    bool   `envconfig:"DEBUG" default:"false"`

    // Optional (pointer = nil if not set)
    RedisURL  *string `envconfig:"REDIS_URL"`
    SentryDSN *string `envconfig:"SENTRY_DSN"`

    // Parsed types
    CORSOrigins []string `envconfig:"CORS_ORIGINS" default:"http://localhost:3000"`
    // Reads CORS_ORIGINS="http://a.com,http://b.com" → ["http://a.com", "http://b.com"]
}

func Load() (*Config, error) {
    var cfg Config
    if err := envconfig.Process("", &cfg); err != nil {
        return nil, fmt.Errorf("loading config: %w", err)
    }

    // Custom validation
    if len(cfg.JWTSecret) < 32 {
        return nil, fmt.Errorf("JWT_SECRET must be at least 32 characters")
    }

    return &cfg, nil
}

// Usage in main.go
func main() {
    cfg, err := config.Load()
    if err != nil {
        log.Fatalf("config error: %v", err)
    }
    // cfg.Port is int, cfg.Debug is bool — all typed
}
```

### caarlos0/env (Alternative with more features)

```go
import "github.com/caarlos0/env/v11"

type Config struct {
    Port        int      `env:"PORT" envDefault:"8080"`
    DatabaseURL string   `env:"DATABASE_URL,required"`
    Hosts       []string `env:"HOSTS" envSeparator:","`
}

func Load() (*Config, error) {
    cfg := &Config{}
    return cfg, env.Parse(cfg)
}
```

## Validation Patterns

### Common Validators

```typescript
// Zod validators for common env var patterns
const validators = {
  // URLs
  url: z.string().url(),
  databaseUrl: z.string().url().refine(
    (s) => s.startsWith("postgresql://") || s.startsWith("mysql://"),
    "Must be a PostgreSQL or MySQL URL"
  ),

  // Ports
  port: z.coerce.number().int().min(1).max(65535),

  // Secrets
  secret: z.string().min(32, "Secret must be at least 32 characters"),
  apiKey: z.string().regex(/^sk_/, "API key must start with sk_"),

  // Enums
  nodeEnv: z.enum(["development", "production", "test"]),
  logLevel: z.enum(["debug", "info", "warn", "error"]),

  // Lists (comma-separated)
  csvList: z.string().transform((s) => s.split(",").map((i) => i.trim())),

  // Booleans (handle "true"/"false"/"1"/"0")
  boolean: z.string().transform((s) => s === "true" || s === "1"),

  // Duration (e.g., "30s", "5m", "1h")
  duration: z.string().regex(/^\d+[smhd]$/, "Must be a duration like 30s, 5m, 1h"),

  // Email
  email: z.string().email(),
};
```

## Fail-Fast Pattern

### The Golden Rule

**Validate all environment variables at application startup. If any are missing or invalid, crash immediately with a clear error message.**

```typescript
// ✅ Good — crash at startup with clear message
const config = validateEnv(); // throws if invalid
startServer(config);

// ❌ Bad — crash 3 hours later when someone triggers the code path
app.post("/payment", (req, res) => {
  const key = process.env.STRIPE_KEY; // undefined — boom
  stripe(key).charges.create(...);
});
```

### Startup Validation Pattern

```typescript
// src/config.ts — this module is imported first
import { z } from "zod";

const envSchema = z.object({ /* ... */ });
const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("❌ Environment validation failed:");
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = Object.freeze(result.data);
```
