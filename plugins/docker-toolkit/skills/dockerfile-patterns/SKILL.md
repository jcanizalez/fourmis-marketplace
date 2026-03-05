---
description: When the user asks about writing a Dockerfile, multi-stage Docker builds, Docker layer caching, choosing a base image, Dockerizing a Node.js or Python or Go or Rust application, Dockerfile best practices, HEALTHCHECK instruction, .dockerignore, distroless images, scratch images, docker init, slim vs alpine base images, pnpm/Bun Docker setup, Next.js standalone Docker, COPY vs ADD, USER directive, ENTRYPOINT vs CMD, or production-ready container images
---

# Dockerfile Patterns

Production-ready Dockerfile patterns for Node.js, Python, and Go — with multi-stage builds, layer caching, and security hardening.

## Multi-Stage Build Pattern

The most important Dockerfile pattern. Separate build dependencies from runtime:

```dockerfile
# Stage 1: Build
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production (no build tools, no devDependencies)
FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**Why**: Build stage has compilers, dev tools (~1GB). Production stage has only runtime (~150MB).

## Node.js / TypeScript

### Production Dockerfile

```dockerfile
FROM node:22-slim AS base
WORKDIR /app

# Install dependencies first (cached layer)
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Build stage
FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM base AS production
ENV NODE_ENV=production

# Copy only production deps and built code
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Security: run as non-root
USER node

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Next.js Standalone

```dockerfile
FROM node:22-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER node
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

**Requires** in `next.config.ts`:
```typescript
const nextConfig = { output: "standalone" };
```

### With pnpm

```dockerfile
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM base AS production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### With Bun

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS builder
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM base AS production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
RUN bun install --frozen-lockfile --production
USER bun
EXPOSE 3000
CMD ["bun", "run", "dist/main.js"]
```

## Python

### FastAPI / Flask with uv

```dockerfile
FROM python:3.13-slim AS base
WORKDIR /app

# Install uv
FROM base AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install dependencies (cached)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-editable

# Copy application code
COPY . .
RUN uv pip install . --no-deps

FROM base AS production
# Copy the virtual environment
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

USER nobody
EXPOSE 8000
CMD ["uvicorn", "my_app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### With pip (Traditional)

```dockerfile
FROM python:3.13-slim AS base
WORKDIR /app

FROM base AS builder
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM base AS production
COPY --from=builder /install /usr/local
COPY . .
USER nobody
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Go

### Standard Go Build

```dockerfile
FROM golang:1.23-alpine AS builder
WORKDIR /app

# Dependencies first (cached)
COPY go.mod go.sum ./
RUN go mod download

# Build static binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server ./cmd/server

# Minimal runtime — scratch or distroless
FROM gcr.io/distroless/static-debian12
COPY --from=builder /server /server
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/server"]
```

**Key Go flags:**
- `CGO_ENABLED=0` — static binary, no C dependencies
- `-ldflags="-s -w"` — strip debug symbols (smaller binary)
- `GOOS=linux` — cross-compile for Linux (if building on macOS)

### With scratch (Smallest Possible)

```dockerfile
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /server ./cmd/server

FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
```

**Note**: `scratch` has no shell, no certs, no user management. Use `distroless` if you need TLS or debugging.

## Base Image Guide

| Image | Size | Use Case |
|-------|------|----------|
| `node:22` | ~1GB | Need native compilation (node-gyp) |
| `node:22-slim` | ~200MB | Most Node.js apps (recommended) |
| `node:22-alpine` | ~130MB | Size-critical, watch for musl issues |
| `python:3.13-slim` | ~150MB | Most Python apps (recommended) |
| `python:3.13-alpine` | ~50MB | Size-critical, native deps may fail |
| `golang:1.23-alpine` | ~250MB | Build stage only |
| `gcr.io/distroless/static` | ~2MB | Go binaries (recommended runtime) |
| `gcr.io/distroless/base` | ~20MB | Apps needing glibc |
| `scratch` | 0MB | Static Go binaries |
| `ubuntu:24.04` | ~75MB | Need apt, debugging tools |
| `alpine:3.21` | ~7MB | Minimal Linux with package manager |

## Layer Caching Rules

```dockerfile
# ✅ Good — dependencies cached separately from code
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# ❌ Bad — any code change invalidates dependency cache
COPY . .
RUN npm ci
```

**Docker builds layers top-to-bottom. When a layer changes, all subsequent layers are rebuilt.**

### Caching Order (most stable → least stable)
1. Base image
2. System packages (`apt-get install`)
3. Dependency lock files (`package-lock.json`, `go.sum`)
4. Dependency install (`npm ci`, `go mod download`)
5. Source code (`COPY . .`)
6. Build command (`npm run build`)

## HEALTHCHECK Instruction

Add health checks directly in the Dockerfile so orchestrators (Compose, Swarm, Kubernetes) know when the app is ready.

### HTTP Service
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
```

### Node.js (Without curl/wget)
```dockerfile
# Use Node.js itself — no extra binary needed
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => { if (!r.ok) throw r; })"
```

### Go (Static Binary)
```dockerfile
# Distroless/scratch have no shell — use the app's health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD ["/server", "--health-check"]
# Your Go app should handle the --health-check flag
```

### Parameters

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `--interval` | 30s | Time between checks |
| `--timeout` | 30s | Max time for a single check |
| `--start-period` | 0s | Grace period for startup (failures don't count) |
| `--retries` | 3 | Consecutive failures before "unhealthy" |

---

## .dockerignore

Always create a `.dockerignore` to keep images small and avoid leaking secrets:

```
# .dockerignore
node_modules
.git
.env
.env.local
.env*.local
*.md
!README.md
dist
.next
.cache
coverage
.vscode
.idea
*.log
Dockerfile
docker-compose*.yml
.dockerignore
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| No `.dockerignore` | Create one — `node_modules` alone adds hundreds of MB |
| `COPY . .` before `npm install` | Copy `package*.json` first, install, then copy code |
| Running as root | Add `USER node` / `USER nobody` / `USER nonroot` |
| Using `latest` tag | Pin specific versions (`node:22-slim`, not `node:latest`) |
| No health check | Add `HEALTHCHECK CMD curl -f http://localhost:3000/health` |
| Secrets in build args | Use runtime env vars or Docker secrets instead |
| No `--omit=dev` | Production images shouldn't include devDependencies |
| Large final image | Use multi-stage builds — build stage ≠ runtime stage |
