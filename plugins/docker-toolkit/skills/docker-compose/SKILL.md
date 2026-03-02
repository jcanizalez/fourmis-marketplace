---
description: When the user asks about Docker Compose, docker-compose.yml configuration, defining services and networks and volumes, health checks in Compose, Docker Compose profiles, or setting up a local development environment with Docker
---

# Docker Compose

Patterns for Docker Compose — from local development environments to production-like stacks with services, networking, health checks, and profiles.

## Basic Structure

```yaml
# docker-compose.yml (or compose.yml — both work)
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/myapp
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules  # Exclude node_modules from bind mount

  db:
    image: postgres:17
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

## Full Development Stack

### Node.js + PostgreSQL + Redis

```yaml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: builder  # Use build stage for dev (has devDependencies)
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:postgres@db:5432/myapp
      REDIS_URL: redis://redis:6379
      LOG_LEVEL: debug
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules
    command: npx tsx watch src/main.ts

  db:
    image: postgres:17
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Optional: database admin UI
  adminer:
    image: adminer
    ports:
      - "8080:8080"
    depends_on:
      - db
    profiles:
      - tools  # Only starts with: docker compose --profile tools up

volumes:
  pgdata:
  redis-data:
```

### Python + PostgreSQL + Celery

```yaml
services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/myapp
      REDIS_URL: redis://redis:6379
      CELERY_BROKER_URL: redis://redis:6379/0
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - .:/app
    command: uvicorn my_app.main:app --host 0.0.0.0 --port 8000 --reload

  worker:
    build: .
    environment:
      CELERY_BROKER_URL: redis://redis:6379/0
      DATABASE_URL: postgresql://postgres:postgres@db:5432/myapp
    depends_on:
      - redis
      - db
    volumes:
      - .:/app
    command: celery -A my_app.tasks worker --loglevel=info

  db:
    image: postgres:17
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

## Health Checks

### Common Health Check Patterns

```yaml
# PostgreSQL
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres"]
  interval: 5s
  timeout: 5s
  retries: 5

# MySQL
healthcheck:
  test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
  interval: 5s
  timeout: 5s
  retries: 5

# Redis
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 5s
  timeout: 5s
  retries: 5

# HTTP service
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 10s
  timeout: 5s
  retries: 3
  start_period: 10s  # Grace period for startup

# MongoDB
healthcheck:
  test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
  interval: 10s
  timeout: 5s
  retries: 5

# Elasticsearch
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### depends_on with Health Checks

```yaml
services:
  api:
    depends_on:
      db:
        condition: service_healthy    # Wait until healthy
      redis:
        condition: service_started    # Just wait until started
      migrations:
        condition: service_completed_successfully  # Wait until exit 0
```

## Profiles

Group optional services that aren't always needed:

```yaml
services:
  api:
    build: .
    # Always runs (no profile)

  db:
    image: postgres:17
    # Always runs (no profile)

  adminer:
    image: adminer
    profiles: [tools]    # Only with --profile tools

  prometheus:
    image: prom/prometheus
    profiles: [monitoring]

  grafana:
    image: grafana/grafana
    profiles: [monitoring]

  mailhog:
    image: mailhog/mailhog
    profiles: [tools]
```

```bash
# Start core services only
docker compose up

# Start with monitoring
docker compose --profile monitoring up

# Start with all tools
docker compose --profile tools --profile monitoring up
```

## Volumes

### Named vs Bind Mounts

```yaml
services:
  api:
    volumes:
      # Bind mount — sync local code to container (dev only)
      - .:/app

      # Named volume — persistent data across restarts
      - node_modules:/app/node_modules

      # Tmpfs — in-memory, lost on restart
      - type: tmpfs
        target: /tmp

  db:
    volumes:
      # Named volume — database data persists
      - pgdata:/var/lib/postgresql/data

      # Init scripts — executed on first start
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro

volumes:
  pgdata:
  node_modules:
```

### Volume Best Practices

| Rule | Reason |
|------|--------|
| Named volumes for data | Persist across `docker compose down` |
| Bind mounts for code | Live reload in development |
| Exclude `node_modules` from bind mount | Different OS binary formats break |
| `:ro` for config files | Prevent container from modifying host files |
| Don't mount `.env` | Pass via `environment:` or `env_file:` instead |

## Environment Variables

```yaml
services:
  api:
    # Method 1: Inline
    environment:
      NODE_ENV: production
      PORT: "3000"

    # Method 2: From file
    env_file:
      - .env
      - .env.production

    # Method 3: Variable substitution (from host env or .env)
    environment:
      DATABASE_URL: ${DATABASE_URL}
      API_KEY: ${API_KEY:?API_KEY is required}  # Error if not set
      LOG_LEVEL: ${LOG_LEVEL:-info}              # Default if not set
```

## Dev vs Production Compose

### Override Pattern

```yaml
# docker-compose.yml — base config (production-like)
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
```

```yaml
# docker-compose.override.yml — auto-loaded in dev
services:
  api:
    build:
      target: builder  # Use build stage with devDependencies
    environment:
      NODE_ENV: development
      LOG_LEVEL: debug
    volumes:
      - .:/app
      - /app/node_modules
    command: npx tsx watch src/main.ts
```

```bash
# Development (auto-loads override)
docker compose up

# Production (explicit, no override)
docker compose -f docker-compose.yml up

# Or use separate production file
docker compose -f docker-compose.yml -f docker-compose.prod.yml up
```

## Common Commands

```bash
# Start services (detached)
docker compose up -d

# Start and rebuild
docker compose up --build

# Stop and remove
docker compose down

# Stop and remove volumes (wipe data)
docker compose down -v

# View logs
docker compose logs -f api

# Execute command in running container
docker compose exec api sh

# Run one-off command
docker compose run --rm api npm run migrate

# Restart a single service
docker compose restart api

# Check service status
docker compose ps
```
