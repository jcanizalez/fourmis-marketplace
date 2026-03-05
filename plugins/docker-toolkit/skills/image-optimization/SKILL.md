---
description: When the user asks about reducing Docker image size, analyzing Docker layers, optimizing Docker builds, using buildx for multi-arch images, Docker build cache, speeding up Docker builds, dive layer analysis, docker scout, trivy image scanning, BuildKit cache mounts, --mount=type=cache, multi-platform builds, linux/amd64 linux/arm64, .dockerignore optimization, or why Docker image is too large
---

# Image Optimization

Techniques for reducing Docker image size, speeding up builds, and creating efficient multi-architecture images.

## Analyze Image Size

### Layer Analysis

```bash
# See layer sizes
docker history <image>
docker history --no-trunc <image>

# Total image size
docker images <image>

# Detailed size breakdown
docker image inspect <image> --format='{{.Size}}' | numfmt --to=iec

# Compare two images
docker images --format 'table {{.Repository}}:{{.Tag}}\t{{.Size}}' | sort -k2 -h
```

### dive (Interactive Layer Explorer)

```bash
# Install
brew install dive

# Analyze an image
dive <image>

# CI mode (check for wasted space)
dive <image> --ci
```

`dive` shows each layer's content, wasted space, and efficiency score. Essential for optimization.

## Size Reduction Techniques

### 1. Use Smaller Base Images

| From | To | Savings |
|------|----|---------|
| `node:22` (~1GB) | `node:22-slim` (~200MB) | ~800MB |
| `python:3.13` (~1GB) | `python:3.13-slim` (~150MB) | ~850MB |
| `golang:1.23` (~800MB) | Build on Go, run on `distroless` (~2MB) | ~798MB |
| `ubuntu:24.04` (~75MB) | `alpine:3.21` (~7MB) | ~68MB |

### 2. Multi-Stage Builds

The single biggest optimization. See dockerfile-patterns skill for examples.

```dockerfile
# Build stage: has compilers, dev tools, source code
FROM node:22-slim AS builder
# ... build ...

# Production stage: ONLY runtime + built artifacts
FROM node:22-slim
COPY --from=builder /app/dist ./dist
# Image is 80% smaller
```

### 3. Minimize Layers

```dockerfile
# ❌ Bad — 3 layers
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get clean

# ✅ Good — 1 layer, cleaned in same layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*
```

### 4. Exclude Unnecessary Files

```dockerfile
# Production Node.js — no devDependencies
RUN npm ci --omit=dev

# Python — no cache
RUN pip install --no-cache-dir -r requirements.txt

# Alpine — no cache
RUN apk add --no-cache curl
```

### 5. Use .dockerignore

```
node_modules
.git
.env*
*.md
dist
.next
coverage
.vscode
```

Without `.dockerignore`, `COPY . .` sends everything to the Docker daemon, including `node_modules` (~500MB+) and `.git` (~100MB+).

## Build Cache Optimization

### Cache-Friendly Layer Order

```dockerfile
# Layer 1: System packages (rarely changes)
RUN apt-get update && apt-get install -y --no-install-recommends curl

# Layer 2: Lock file (changes when deps change)
COPY package.json package-lock.json ./

# Layer 3: Install deps (cached when lock file unchanged)
RUN npm ci

# Layer 4: Source code (changes most frequently)
COPY . .

# Layer 5: Build (re-runs when source changes)
RUN npm run build
```

### Cache Mounts (BuildKit)

```dockerfile
# syntax=docker/dockerfile:1

# Cache npm modules across builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Cache Go modules
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Cache pip packages
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Cache apt packages
RUN --mount=type=cache,target=/var/cache/apt \
    apt-get update && apt-get install -y curl
```

### Speed Up Builds

```bash
# Enable BuildKit (faster, cache mounts, secrets)
export DOCKER_BUILDKIT=1

# Use buildx with cache export
docker buildx build \
  --cache-from type=registry,ref=myapp:cache \
  --cache-to type=registry,ref=myapp:cache,mode=max \
  -t myapp:latest .

# Local cache directory
docker buildx build \
  --cache-from type=local,src=/tmp/docker-cache \
  --cache-to type=local,dest=/tmp/docker-cache,mode=max \
  -t myapp:latest .
```

## Multi-Architecture Images

### buildx Multi-Platform Build

```bash
# Create a builder instance (once)
docker buildx create --name multiarch --driver docker-container --use

# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t myregistry/myapp:latest \
  --push .

# Inspect manifest
docker buildx imagetools inspect myregistry/myapp:latest
```

### In CI (GitHub Actions)

```yaml
- uses: docker/setup-qemu-action@v3
- uses: docker/setup-buildx-action@v3
- uses: docker/build-push-action@v6
  with:
    context: .
    platforms: linux/amd64,linux/arm64
    push: true
    tags: ghcr.io/myorg/myapp:latest
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

## Size Comparison Table

| Approach | Node.js API | Python API | Go API |
|----------|-------------|------------|--------|
| Naive (full base, no multi-stage) | ~1.2GB | ~1.1GB | ~800MB |
| Slim base + multi-stage | ~200MB | ~150MB | ~25MB |
| Alpine + multi-stage | ~130MB | ~80MB | ~15MB |
| Distroless (Go only) | — | — | ~8MB |
| Scratch (Go static only) | — | — | ~5MB |

## Optimization Checklist

- [ ] Using multi-stage build?
- [ ] Using slim/alpine base image?
- [ ] `.dockerignore` excluding `node_modules`, `.git`, etc.?
- [ ] Dependencies installed before source code copied?
- [ ] `--omit=dev` / `--no-cache-dir` for production?
- [ ] Layers combined where possible (`RUN` commands)?
- [ ] Cleanup in same layer as install (`rm -rf /var/lib/apt/lists/*`)?
- [ ] No unnecessary tools in production image?
- [ ] Using BuildKit cache mounts for faster rebuilds?
- [ ] Image scanned for vulnerabilities? (`docker scout`, `trivy`)
