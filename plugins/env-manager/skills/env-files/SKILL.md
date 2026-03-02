---
description: When the user asks about dotenv files, .env file structure, environment variable precedence, loading env vars in Node.js or Python or Go, dotenv patterns, or organizing environment configuration
---

# Environment Files

Patterns for structuring, loading, and managing `.env` files across Node.js, Python, and Go projects.

## .env File Format

```bash
# Comments start with #
# KEY=VALUE — no spaces around =
# Values with spaces need quotes

# App
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# Secrets (never commit these)
API_KEY=sk_live_abc123
JWT_SECRET=super-secret-value

# Quoted values (for spaces or special chars)
APP_NAME="My Cool App"
GREETING='Hello World'

# Multiline (use \n or quotes)
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE..."

# Variable expansion (some loaders support this)
BASE_URL=http://localhost:3000
API_URL=${BASE_URL}/api
```

## File Hierarchy

### Standard Files

```
my-project/
├── .env                    # Local overrides (gitignored)
├── .env.local              # Machine-specific overrides (gitignored)
├── .env.development        # Development defaults
├── .env.production         # Production defaults
├── .env.test               # Test environment
├── .env.example            # Template with all keys, no secrets (committed)
└── .gitignore              # Must include .env, .env.local, .env*.local
```

### Precedence Rules (Most Common)

**Next.js** (highest to lowest):
1. `process.env` (system/CI environment)
2. `.env.$(NODE_ENV).local` (e.g., `.env.development.local`)
3. `.env.local` (not loaded in test)
4. `.env.$(NODE_ENV)` (e.g., `.env.development`)
5. `.env`

**Vite**:
1. System environment
2. `.env.$(MODE).local`
3. `.env.$(MODE)`
4. `.env.local`
5. `.env`

**Docker Compose**:
1. Shell environment
2. `environment:` in compose file
3. `--env-file` flag
4. `env_file:` in compose file
5. `.env` in project root

**General rule**: More specific files override less specific. System env always wins.

## Node.js / TypeScript

### dotenv (Manual Loading)

```typescript
// Load at the very start of your app
import "dotenv/config";

// Or with specific file
import { config } from "dotenv";
config({ path: ".env.local" });

// Access
const port = process.env.PORT || "3000";
const dbUrl = process.env.DATABASE_URL;
```

### Next.js (Built-in)

```typescript
// Automatic loading — no import needed
// Only NEXT_PUBLIC_* vars are exposed to the browser

// Server-only (safe for secrets)
const apiKey = process.env.API_KEY;

// Client-accessible (prefixed)
const analyticsId = process.env.NEXT_PUBLIC_ANALYTICS_ID;
```

### Vite (Built-in)

```typescript
// Only VITE_* vars are exposed to the client
const apiUrl = import.meta.env.VITE_API_URL;
const mode = import.meta.env.MODE; // "development" | "production"
const isDev = import.meta.env.DEV; // boolean
```

## Python

### python-dotenv

```python
# Load at app startup
from dotenv import load_dotenv
import os

load_dotenv()  # Loads .env from current directory

# Access
port = int(os.getenv("PORT", "8000"))
db_url = os.environ["DATABASE_URL"]  # Raises KeyError if missing
api_key = os.getenv("API_KEY")  # Returns None if missing
```

### pydantic-settings (Recommended)

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    port: int = 8000
    database_url: str
    api_key: str
    debug: bool = False

settings = Settings()  # Auto-loads from .env + validates types
```

## Go

### envconfig (Recommended)

```go
package config

import (
    "github.com/kelseyhightower/envconfig"
    "log"
)

type Config struct {
    Port        int    `envconfig:"PORT" default:"8080"`
    DatabaseURL string `envconfig:"DATABASE_URL" required:"true"`
    APIKey      string `envconfig:"API_KEY" required:"true"`
    Debug       bool   `envconfig:"DEBUG" default:"false"`
    LogLevel    string `envconfig:"LOG_LEVEL" default:"info"`
}

func Load() *Config {
    var cfg Config
    if err := envconfig.Process("", &cfg); err != nil {
        log.Fatalf("failed to load config: %v", err)
    }
    return &cfg
}
```

### godotenv (for .env file loading)

```go
import "github.com/joho/godotenv"

func init() {
    // Load .env file (optional — don't fail if missing)
    _ = godotenv.Load()
}
```

## .env.example Template

Always maintain an `.env.example` with every variable your app needs:

```bash
# .env.example — Copy to .env and fill in values
# Required vars are marked with (required)

# App
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database (required)
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# Auth (required)
JWT_SECRET=generate-with: openssl rand -base64 32
SESSION_SECRET=generate-with: openssl rand -hex 32

# External APIs (required)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional
SENTRY_DSN=
ANALYTICS_ID=
LOG_LEVEL=info
```

### Rules for .env.example
- Include every variable your app reads
- Use placeholder values that show the expected format
- Include generation commands for secrets (`openssl rand`)
- Mark required vs optional
- Never include real secrets — even test keys can be problematic
- Keep it sorted by category

## Docker / Docker Compose

### Docker Run

```bash
# Single variable
docker run -e PORT=3000 my-app

# From file
docker run --env-file .env my-app

# Multiple files (later ones override)
docker run --env-file .env --env-file .env.local my-app
```

### Docker Compose

```yaml
services:
  api:
    build: .
    # Method 1: Direct values
    environment:
      - NODE_ENV=production
      - PORT=3000
    # Method 2: From file
    env_file:
      - .env
      - .env.production
    # Method 3: Variable substitution (from shell or .env)
    environment:
      - DATABASE_URL=${DATABASE_URL}
```

### Multi-Stage Build (Don't Leak Secrets)

```dockerfile
# BAD — secret baked into image layer
FROM node:22-slim
COPY .env .
RUN npm run build

# GOOD — pass at runtime only
FROM node:22-slim AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
COPY --from=builder /app/dist ./dist
# .env is NOT in the image — pass at runtime
CMD ["node", "dist/main.js"]
```

## CI/CD Environment Variables

### GitHub Actions

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      NODE_ENV: production
    steps:
      - run: echo "Using ${{ secrets.API_KEY }}"
        env:
          API_KEY: ${{ secrets.API_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Vercel

```bash
# Set via CLI
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview
vercel env add DATABASE_URL development

# Pull to local .env
vercel env pull .env.local
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Committing `.env` to git | Add to `.gitignore` immediately, rotate leaked secrets |
| Missing `.env.example` | Create one with every variable documented |
| No type validation | Use Zod, Pydantic, or envconfig for type-safe access |
| Hardcoded defaults for secrets | Fail fast if required secrets are missing |
| Different var names per environment | Use same names everywhere, different values |
| Secrets in Docker image layers | Pass secrets at runtime, not build time |
| Using `process.env` everywhere | Centralize in a config module, validate once at startup |
