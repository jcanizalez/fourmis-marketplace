---
description: When the user asks about syncing .env.example, onboarding new developers with env setup, keeping env files in sync across a team, auditing for missing env vars, or CI/CD environment variable setup
---

# Env Sync

Patterns for keeping `.env.example` in sync with actual environment variables, onboarding new developers, and managing env vars across environments.

## The .env.example Contract

`.env.example` is a **contract** — it documents every environment variable your app needs. If it's outdated, new developers waste hours debugging missing config.

### Keeping It in Sync

#### Manual Audit

```bash
# Compare .env against .env.example
# Find vars in .env but NOT in .env.example (missing from template)
comm -23 <(grep -oP '^\w+' .env | sort) <(grep -oP '^\w+' .env.example | sort)

# Find vars in .env.example but NOT in .env (need to add locally)
comm -13 <(grep -oP '^\w+' .env | sort) <(grep -oP '^\w+' .env.example | sort)

# Find vars used in code but not in .env.example
grep -rhoP 'process\.env\.(\w+)' src/ | sort -u | sed 's/process\.env\.//' | \
  comm -23 - <(grep -oP '^\w+' .env.example | sort)
```

#### Automated Sync Script

```bash
#!/bin/bash
# sync-env-example.sh — Run before committing

ENV_FILE=".env"
EXAMPLE_FILE=".env.example"

if [ ! -f "$ENV_FILE" ]; then
  echo "No .env file found"
  exit 1
fi

echo "Checking env sync..."

# Extract variable names
env_vars=$(grep -oP '^\w+' "$ENV_FILE" | sort)
example_vars=$(grep -oP '^\w+' "$EXAMPLE_FILE" | sort)

# Find missing from example
missing=$(comm -23 <(echo "$env_vars") <(echo "$example_vars"))

if [ -n "$missing" ]; then
  echo "⚠️  Variables in .env but NOT in .env.example:"
  echo "$missing" | while read var; do
    echo "  - $var"
  done
  echo ""
  echo "Add them to .env.example with placeholder values."
  exit 1
fi

# Find in example but not in .env
extra=$(comm -13 <(echo "$env_vars") <(echo "$example_vars"))

if [ -n "$extra" ]; then
  echo "ℹ️  Variables in .env.example but not in your .env:"
  echo "$extra" | while read var; do
    echo "  - $var"
  done
  echo ""
  echo "These may be optional or you may need to add them."
fi

echo "✅ Env files are in sync"
```

### Git Hook (Pre-Commit)

```bash
# .husky/pre-commit or .githooks/pre-commit
#!/bin/sh

# Check if .env.example is up to date with code
USED_VARS=$(grep -rhoP 'process\.env\.(\w+)' src/ | sed 's/process\.env\.//' | sort -u)
EXAMPLE_VARS=$(grep -oP '^\w+' .env.example | sort -u)

MISSING=$(comm -23 <(echo "$USED_VARS") <(echo "$EXAMPLE_VARS"))

if [ -n "$MISSING" ]; then
  echo "❌ These env vars are used in code but missing from .env.example:"
  echo "$MISSING" | while read var; do echo "  - $var"; done
  echo "Please add them to .env.example before committing."
  exit 1
fi
```

## New Developer Onboarding

### Setup Script

```bash
#!/bin/bash
# scripts/setup.sh — Run once after cloning

echo "🔧 Setting up development environment..."

# 1. Copy env template
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created .env from .env.example"
  echo ""
  echo "⚠️  Please fill in the following required values in .env:"
  grep -E '^\w+=\s*$|^\w+=.*required' .env.example | grep -oP '^\w+' | while read var; do
    echo "  - $var"
  done
else
  echo "ℹ️  .env already exists, skipping"
fi

# 2. Install dependencies
if [ -f package.json ]; then
  echo "📦 Installing Node.js dependencies..."
  npm install
elif [ -f pyproject.toml ]; then
  echo "📦 Installing Python dependencies..."
  uv sync
elif [ -f go.mod ]; then
  echo "📦 Installing Go dependencies..."
  go mod download
fi

# 3. Check required tools
for cmd in node docker git; do
  if ! command -v $cmd &> /dev/null; then
    echo "⚠️  $cmd is not installed"
  fi
done

# 4. Validate env
echo ""
echo "🔍 Validating environment..."
if [ -f package.json ]; then
  npx tsx src/config.ts 2>&1 || echo "⚠️  Some env vars may need to be filled in"
fi

echo ""
echo "✅ Setup complete! Run 'npm run dev' to start."
```

### README Onboarding Section

```markdown
## Getting Started

1. Clone the repo
2. Run `./scripts/setup.sh`
3. Fill in required values in `.env`:
   - `DATABASE_URL` — PostgreSQL connection string (see docker-compose for local)
   - `API_KEY` — Get from [dashboard](https://...)
   - `JWT_SECRET` — Generate with `openssl rand -base64 32`
4. Start the database: `docker compose up -d postgres`
5. Run migrations: `npm run db:migrate`
6. Start the app: `npm run dev`
```

## CI/CD Environment Setup

### GitHub Actions — Required Secrets Checklist

```yaml
# .github/ENV_CHECKLIST.md (or in workflow comments)
# Required GitHub Secrets for CI/CD:
#
# PRODUCTION:
#   DATABASE_URL          - Production database connection
#   API_KEY               - Production API key
#   JWT_SECRET            - JWT signing secret (min 32 chars)
#   SENTRY_DSN            - Error tracking
#
# STAGING:
#   STAGING_DATABASE_URL  - Staging database connection
#
# ALL ENVIRONMENTS:
#   VERCEL_TOKEN          - Deployment token
#   CODECOV_TOKEN         - Code coverage upload
```

### Vercel Environment Sync

```bash
#!/bin/bash
# scripts/sync-vercel-env.sh

echo "Syncing environment variables to Vercel..."

# Read required vars from .env.example
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue

  # Check if already set in Vercel
  if vercel env ls 2>/dev/null | grep -q "$key"; then
    echo "  ✓ $key (already set)"
  else
    echo "  ⚠ $key (MISSING — set with: vercel env add $key production)"
  fi
done < .env.example
```

### Docker Compose — Dev Environment

```yaml
# docker-compose.yml — consistent dev environment for the team
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

```bash
# .env.example — local dev defaults that match docker-compose
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myapp
REDIS_URL=redis://localhost:6379
```

## Multi-Environment Management

### Environment Inventory

```markdown
# ENVIRONMENTS.md

| Env | Purpose | Database | Secrets Source |
|-----|---------|----------|---------------|
| local | Developer machines | Docker Compose PostgreSQL | .env file |
| test | CI test runner | SQLite in-memory | GitHub Secrets |
| staging | Pre-production | staging.db.example.com | AWS SSM `/myapp/staging/` |
| production | Live users | prod.db.example.com | AWS SSM `/myapp/production/` |
```

### Promoting Between Environments

```bash
# Never copy .env files between environments!
# Instead, document what needs to be set:

# For staging
echo "Required staging secrets:"
echo "  DATABASE_URL     — staging database"
echo "  API_KEY          — staging API key"
echo "  JWT_SECRET       — generate: openssl rand -base64 32"

# For production
echo "Required production secrets:"
echo "  DATABASE_URL     — production database"
echo "  API_KEY          — production API key (different from staging!)"
echo "  JWT_SECRET       — generate: openssl rand -base64 32 (different!)"
echo "  SENTRY_DSN       — production error tracking"
```

## Checklist

### For New Projects
- [ ] Create `.env.example` with all variables documented
- [ ] Add `.env` and `.env.local` to `.gitignore`
- [ ] Create `scripts/setup.sh` for new developer onboarding
- [ ] Add env validation (fail-fast at startup)
- [ ] Document required secrets in README

### For Ongoing Maintenance
- [ ] Run env sync check before major releases
- [ ] Audit CI/CD secrets quarterly (remove unused)
- [ ] Rotate secrets on schedule
- [ ] Update `.env.example` when adding new env vars
- [ ] Keep ENVIRONMENTS.md up to date
