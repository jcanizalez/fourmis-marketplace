# Docker CI

Build, test, and push Docker images in CI/CD pipelines. Covers multi-stage builds, registry authentication, image scanning, and Docker Compose for integration tests.

## When to Activate

When the user asks to:
- Build Docker images in CI
- Push images to a container registry
- Set up multi-stage Docker builds
- Run integration tests with Docker Compose in CI
- Scan Docker images for vulnerabilities
- Optimize Docker builds for CI

## Docker Build and Push (GitHub Actions)

### Docker Hub

```yaml
name: Docker Build & Push

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  docker:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: username/app
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix=
            type=raw,value=latest,enable={{is_default_branch}}

      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### GitHub Container Registry (GHCR)

```yaml
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ghcr.io/${{ github.repository }}
```

### AWS ECR

```yaml
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - uses: aws-actions/amazon-ecr-login@v2
        id: ecr

      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.ecr.outputs.registry }}/app:${{ github.sha }}
```

## Multi-Stage Dockerfile (CI-Optimized)

```dockerfile
# Stage 1: Dependencies
FROM node:22-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: Build
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:22-slim AS production
WORKDIR /app
ENV NODE_ENV=production

# Non-root user
RUN addgroup --system app && adduser --system --group app
USER app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Docker Compose for Integration Tests

```yaml
# docker-compose.test.yml
services:
  app:
    build: .
    environment:
      DATABASE_URL: postgres://test:test@db:5432/testdb
      REDIS_URL: redis://cache:6379
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: testdb
    healthcheck:
      test: pg_isready -U test
      interval: 5s
      retries: 5

  cache:
    image: redis:7-alpine
```

### Running in CI

```yaml
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker compose -f docker-compose.test.yml up -d
      - run: docker compose -f docker-compose.test.yml run app npm test
      - run: docker compose -f docker-compose.test.yml down -v
        if: always()
```

## Image Scanning

### Trivy (recommended)

```yaml
      - uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          format: 'table'
          exit-code: '1'          # Fail on vulnerabilities
          severity: 'CRITICAL,HIGH'
```

### Docker Scout

```yaml
      - uses: docker/scout-action@v1
        with:
          command: cves
          image: myapp:${{ github.sha }}
          only-severities: critical,high
```

## Docker Build Optimization

| Optimization | How | Impact |
|-------------|-----|--------|
| Multi-stage builds | Separate build and runtime stages | ⭐⭐⭐ Smaller images |
| BuildKit cache | `cache-from: type=gha` | ⭐⭐⭐ Faster builds |
| Layer ordering | Copy package.json before source | ⭐⭐ Better caching |
| .dockerignore | Exclude node_modules, .git, docs | ⭐⭐ Faster context |
| Slim base images | `node:22-slim` vs `node:22` | ⭐⭐ Smaller images |
| Non-root user | `USER app` in production stage | ⭐ Security |

## .dockerignore (Essential)

```
node_modules
.git
.github
dist
coverage
.env*
*.md
.vscode
.idea
Dockerfile
docker-compose*.yml
```
