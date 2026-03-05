---
description: When the user asks about Docker security, running containers as non-root, Docker image scanning, Docker secrets, container capabilities, read-only filesystems, hardening Docker containers for production, trivy vulnerability scanning, docker scout CVEs, BuildKit secrets --mount=type=secret, cap_drop ALL, resource limits memory/CPU, USER directive, rootless Docker, securing Docker in CI/CD, or container security best practices
---

# Docker Security

Hardening Docker containers for production — non-root users, image scanning, secrets management, capabilities, and security best practices.

## Non-Root Containers

Running as root inside a container is the #1 Docker security issue.

### Node.js

```dockerfile
FROM node:22-slim
WORKDIR /app

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev
COPY --chown=node:node . .

# Switch to built-in non-root user
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Python

```dockerfile
FROM python:3.13-slim
WORKDIR /app

# Create non-root user
RUN useradd --create-home --shell /bin/bash appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=appuser:appuser . .

USER appuser
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Go (Distroless)

```dockerfile
FROM gcr.io/distroless/static-debian12
COPY --from=builder /server /server
# distroless has built-in nonroot user
USER nonroot:nonroot
ENTRYPOINT ["/server"]
```

### Verify Non-Root

```bash
# Check what user a container runs as
docker exec <container> whoami
docker exec <container> id

# Check in Dockerfile
docker inspect --format='{{.Config.User}}' <image>
```

## Image Scanning

### Docker Scout (Built-in)

```bash
# Scan for vulnerabilities
docker scout cves <image>

# Quick overview
docker scout quickview <image>

# Compare two images
docker scout compare <image1> <image2>

# Recommendations
docker scout recommendations <image>
```

### Trivy (Open Source)

```bash
# Install
brew install trivy

# Scan an image
trivy image <image>

# Scan with severity filter
trivy image --severity HIGH,CRITICAL <image>

# Scan a Dockerfile (static analysis)
trivy config Dockerfile

# Exit with error on findings (for CI)
trivy image --exit-code 1 --severity CRITICAL <image>
```

### CI Integration (GitHub Actions)

```yaml
- name: Scan image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.IMAGE }}
    format: sarif
    output: trivy-results.sarif
    severity: CRITICAL,HIGH

- name: Upload results
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: trivy-results.sarif
```

## Secrets Management

### Docker Secrets (Compose)

```yaml
services:
  api:
    secrets:
      - db_password
      - api_key
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt  # From file
  api_key:
    environment: API_KEY             # From env var
```

```typescript
// Read secret from file
import { readFileSync } from "node:fs";

const dbPassword = process.env.DB_PASSWORD_FILE
  ? readFileSync(process.env.DB_PASSWORD_FILE, "utf8").trim()
  : process.env.DB_PASSWORD;
```

### BuildKit Secrets (Build-Time)

```dockerfile
# syntax=docker/dockerfile:1

# Mount a secret during build (never stored in image layers)
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci
```

```bash
# Build with secret
docker build --secret id=npmrc,src=$HOME/.npmrc .
```

### What NOT to Do

```dockerfile
# ❌ Secret in ENV — stored in image layers, visible in docker inspect
ENV API_KEY=sk_live_abc123

# ❌ Secret in ARG — visible in docker history
ARG API_KEY
RUN curl -H "Authorization: $API_KEY" https://api.example.com

# ❌ COPY .env — secret baked into image
COPY .env .

# ✅ Pass at runtime
docker run -e API_KEY=sk_live_abc123 my-app
# Or use Docker secrets
```

## Read-Only Filesystem

```yaml
services:
  api:
    read_only: true
    tmpfs:
      - /tmp
      - /app/cache
    volumes:
      - app-data:/app/data  # Writable named volume for data

  db:
    read_only: true
    tmpfs:
      - /tmp
      - /run/postgresql
    volumes:
      - pgdata:/var/lib/postgresql/data
```

**Why**: Prevents attackers from writing malware or modifying application code inside the container.

## Linux Capabilities

Docker containers get a reduced set of Linux capabilities by default. Further restrict for security:

```yaml
services:
  api:
    cap_drop:
      - ALL            # Remove all capabilities
    cap_add:
      - NET_BIND_SERVICE  # Add back only what's needed (bind to port <1024)
```

```bash
# Run with no capabilities
docker run --cap-drop ALL my-app

# Run with specific capability
docker run --cap-drop ALL --cap-add NET_BIND_SERVICE my-app
```

### Common Capabilities

| Capability | Purpose | Need It? |
|-----------|---------|----------|
| `NET_BIND_SERVICE` | Bind to ports < 1024 | Only if listening on 80/443 |
| `CHOWN` | Change file ownership | Usually no |
| `SETUID/SETGID` | Change user/group | Usually no |
| `SYS_PTRACE` | Debug/trace processes | Only for debugging |
| `NET_RAW` | Raw sockets (ping) | Usually no |

## Resource Limits

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          memory: 512M    # Hard limit — OOM killed if exceeded
          cpus: "1.0"     # Max 1 CPU core
        reservations:
          memory: 256M    # Guaranteed minimum
          cpus: "0.25"    # Guaranteed minimum CPU
    # OOM score (lower = less likely to be killed)
    oom_score_adj: -500

  db:
    deploy:
      resources:
        limits:
          memory: 1G
    # Limit open files (prevent fd exhaustion attacks)
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
```

```bash
# Docker run equivalent
docker run -m 512m --cpus 1.0 my-app
```

## Security Scanning Checklist

```bash
# 1. Scan image for CVEs
trivy image my-app:latest

# 2. Check for non-root user
docker inspect --format='{{.Config.User}}' my-app:latest

# 3. Check for sensitive env vars
docker inspect --format='{{.Config.Env}}' my-app:latest

# 4. Check image history for secrets
docker history --no-trunc my-app:latest | grep -i "secret\|key\|password\|token"

# 5. Check for latest tag (pin specific versions!)
docker images | grep latest

# 6. Check for large layers (might include unnecessary tools)
docker history my-app:latest
```

## Production Hardening Checklist

### Image
- [ ] Using specific version tags (not `latest`)
- [ ] Using slim/distroless base image
- [ ] Multi-stage build (no build tools in production)
- [ ] No secrets in image layers (checked with `docker history`)
- [ ] Image scanned for vulnerabilities
- [ ] `.dockerignore` excludes `.env`, `.git`, `node_modules`

### Runtime
- [ ] Running as non-root user (`USER` in Dockerfile)
- [ ] Read-only filesystem where possible
- [ ] Capabilities dropped (`cap_drop: ALL`)
- [ ] Memory and CPU limits set
- [ ] Health check configured
- [ ] No privileged mode
- [ ] Secrets passed at runtime (not baked into image)

### Network
- [ ] Services on isolated custom networks
- [ ] Only necessary ports published
- [ ] Ports bound to `127.0.0.1` when possible
- [ ] No `--network host` in production

### Monitoring
- [ ] Logs shipped to aggregation (not just stdout)
- [ ] Resource usage monitored (memory, CPU)
- [ ] Container restart alerts configured
- [ ] Image update notifications enabled
