---
description: When the user asks about application configuration patterns, 12-factor app config, feature flags, environment-specific configuration, configuration management, or runtime vs build-time config
---

# Configuration Patterns

Best practices for application configuration — 12-factor app principles, feature flags, environment-specific overrides, and config architecture.

## The 12-Factor Config Rules

From [12factor.net/config](https://12factor.net/config):

1. **Config in env vars** — not in code, not in config files deployed with the app
2. **Strict separation** — code doesn't change between environments, only config does
3. **No config in code** — no `if (env === "production")` conditionally setting values
4. **Env vars are granular** — each has its own variable, not grouped into "environments"
5. **Can deploy to any env at any time** — without code changes

### How to Apply

```typescript
// ❌ Bad — config in code
const config = {
  database: process.env.NODE_ENV === "production"
    ? "postgresql://prod-server:5432/app"  // Hardcoded!
    : "postgresql://localhost:5432/app",
};

// ✅ Good — config from environment
const config = {
  database: env.DATABASE_URL, // Same code, different env var per environment
};
```

## Config Architecture

### Single Config Module Pattern

Every app should have **one** config module that validates and exports all config:

```typescript
// src/config.ts — the ONLY place env vars are accessed
import { z } from "zod";

const envSchema = z.object({
  // App
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  port: z.coerce.number().default(3000),
  appUrl: z.string().url(),

  // Database
  databaseUrl: z.string().url(),

  // Auth
  jwtSecret: z.string().min(32),
  jwtExpiresIn: z.string().default("7d"),

  // External services
  stripeSecretKey: z.string().optional(),
  sentryDsn: z.string().url().optional(),

  // Feature flags
  enableNewDashboard: z.coerce.boolean().default(false),
  enableBetaAPI: z.coerce.boolean().default(false),
});

// Map env var names (SCREAMING_SNAKE) to config names (camelCase)
const parsed = envSchema.safeParse({
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT,
  appUrl: process.env.APP_URL,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  sentryDsn: process.env.SENTRY_DSN,
  enableNewDashboard: process.env.ENABLE_NEW_DASHBOARD,
  enableBetaAPI: process.env.ENABLE_BETA_API,
});

if (!parsed.success) {
  console.error("❌ Config validation failed:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = Object.freeze(parsed.data);
```

```typescript
// Usage throughout the app — NEVER access process.env directly
import { config } from "./config";

const app = express();
app.listen(config.port); // number, guaranteed
```

### Python Equivalent

```python
# src/config.py
from pydantic_settings import BaseSettings

class AppConfig(BaseSettings):
    # App
    env: str = "development"
    port: int = 8000
    app_url: str = "http://localhost:8000"

    # Database
    database_url: str

    # Auth
    jwt_secret: str
    jwt_expires_in: str = "7d"

    # Feature flags
    enable_new_dashboard: bool = False
    enable_beta_api: bool = False

    class Config:
        env_file = ".env"

config = AppConfig()  # Validates on import
```

### Go Equivalent

```go
type Config struct {
    Env         string `envconfig:"APP_ENV" default:"development"`
    Port        int    `envconfig:"PORT" default:"8080"`
    AppURL      string `envconfig:"APP_URL" required:"true"`
    DatabaseURL string `envconfig:"DATABASE_URL" required:"true"`
    JWTSecret   string `envconfig:"JWT_SECRET" required:"true"`

    // Feature flags
    EnableNewDashboard bool `envconfig:"ENABLE_NEW_DASHBOARD" default:"false"`
    EnableBetaAPI      bool `envconfig:"ENABLE_BETA_API" default:"false"`
}
```

## Feature Flags

### Environment Variable Feature Flags

The simplest approach — no external service needed:

```bash
# .env
ENABLE_NEW_DASHBOARD=true
ENABLE_BETA_API=false
ENABLE_DARK_MODE=true
MAINTENANCE_MODE=false
```

```typescript
// Usage
if (config.enableNewDashboard) {
  app.use("/dashboard", newDashboardRouter);
} else {
  app.use("/dashboard", legacyDashboardRouter);
}
```

### Feature Flag Naming Convention

```bash
# Boolean flags — ENABLE_ prefix
ENABLE_NEW_CHECKOUT=true
ENABLE_BETA_FEATURES=false
ENABLE_MAINTENANCE_MODE=false

# Percentage rollouts — _PERCENTAGE suffix
NEW_CHECKOUT_PERCENTAGE=25        # 25% of users

# Value flags — descriptive name
PAYMENT_PROVIDER=stripe           # stripe | paypal | mock
MAX_UPLOAD_SIZE_MB=10
RATE_LIMIT_RPM=100
```

### Feature Flag Best Practices

| Rule | Reason |
|------|--------|
| Short-lived | Remove flag after feature is fully rolled out |
| Boolean by default | Keep it simple — on or off |
| Named clearly | `ENABLE_X` not `X_FLAG` or `X_TOGGLE` |
| Documented | List all flags in `.env.example` with descriptions |
| Tested both ways | Test with flag on AND off |
| Clean up | Delete flag from code and config when fully shipped |

## Runtime vs Build-Time Config

### Build-Time Config (Baked into the Artifact)

```bash
# These are set during build and CANNOT change at runtime
NEXT_PUBLIC_APP_URL=https://myapp.com
NEXT_PUBLIC_ANALYTICS_ID=UA-12345

# In Vite
VITE_API_URL=https://api.myapp.com
```

**Use for**: Public URLs, analytics IDs, feature flags that won't change per-deployment.

### Runtime Config (Injected at Startup)

```bash
# These are set when the app starts and CAN differ per instance
DATABASE_URL=postgresql://prod-server:5432/app
API_KEY=sk_live_abc123
JWT_SECRET=production-secret
PORT=8080
```

**Use for**: Secrets, database connections, anything that differs between environments.

### The Rule

```
If it contains a secret → runtime
If it differs between prod instances → runtime
If it's public and fixed per build → build-time
When in doubt → runtime (more flexible)
```

## Multi-Environment Config

### Pattern: Same Code, Different Config

```
Code (identical everywhere)
  + .env.development  → local dev
  + .env.staging      → staging server
  + .env.production   → production server
```

### Environment-Specific Defaults

```typescript
const defaults: Record<string, Partial<Config>> = {
  development: {
    logLevel: "debug",
    corsOrigins: ["http://localhost:3000"],
  },
  staging: {
    logLevel: "info",
    corsOrigins: ["https://staging.myapp.com"],
  },
  production: {
    logLevel: "warn",
    corsOrigins: ["https://myapp.com"],
  },
};

// Merge: env vars > environment defaults > global defaults
const config = {
  ...globalDefaults,
  ...defaults[env.NODE_ENV],
  ...validatedEnvVars,
};
```

## Config Checklist

### For Every Project

- [ ] Single config module that validates all env vars at startup
- [ ] `.env.example` with every variable documented
- [ ] `.gitignore` includes `.env` and `.env.local`
- [ ] Type-safe access (Zod, Pydantic, envconfig — never raw `process.env`)
- [ ] Required vs optional clearly distinguished
- [ ] Secrets separated from non-secret config
- [ ] No `process.env` / `os.environ` / `os.Getenv` outside the config module
- [ ] Feature flags documented and time-bounded
