---
description: When the user asks about CI/CD pipeline configuration, continuous integration setup, GitHub Actions workflows, automated testing in CI, deployment pipelines, build automation, or asks how to set up CI for their project
---

# CI Pipeline Patterns

Production-grade CI/CD pipeline patterns for automated testing, building, and deployment. Covers GitHub Actions, GitLab CI, and general pipeline architecture.

## GitHub Actions — Starter Workflows

### Node.js/TypeScript CI

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck  # tsc --noEmit

  test:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test -- --coverage
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/testdb
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/lcov-report/

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
```

### Go CI

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.23'
      - uses: golangci/golangci-lint-action@v6
        with:
          version: latest

  test:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.23'
      - run: go test -v -race -coverprofile=coverage.out ./...
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/testdb
      - run: go tool cover -func=coverage.out

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.23'
      - run: go build -o bin/ ./cmd/...
      - uses: actions/upload-artifact@v4
        with:
          name: binaries
          path: bin/
```

### Python CI

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install ruff mypy
      - run: ruff check .
      - run: ruff format --check .
      - run: mypy src/

  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: pip
      - run: pip install -e ".[test]"
      - run: pytest --tb=short --cov=src --cov-report=term-missing
```

## Pipeline Architecture

### Stage Ordering

Run stages from fastest to slowest — fail fast:

```
1. Lint (10s)     — syntax errors, style violations
2. Type check (30s) — type errors
3. Unit tests (1m) — logic errors
4. Build (2m)     — compilation/bundling errors
5. Integration tests (5m) — system errors
6. E2E tests (10m) — user-facing errors
7. Deploy (5m)    — only on main branch
```

**Key principle**: Never run slow tests if fast checks fail.

### Parallelization

```yaml
jobs:
  lint:           # ← runs immediately
  typecheck:      # ← runs immediately (parallel with lint)
  unit-tests:
    needs: [lint, typecheck]  # ← waits for both
  integration-tests:
    needs: unit-tests          # ← waits for unit tests
  deploy:
    needs: integration-tests   # ← waits for integration
    if: github.ref == 'refs/heads/main'
```

### Caching Strategy

| What to Cache | Key | Why |
|--------------|-----|-----|
| `node_modules` | `hash(package-lock.json)` | npm ci is slow |
| Go modules | `hash(go.sum)` | Download is slow |
| Python venv | `hash(requirements.txt)` | pip install is slow |
| Docker layers | `hash(Dockerfile)` | Builds are slow |
| Build output | `hash(src/**)` | Avoid rebuilding unchanged code |
| Test results | `hash(src/**,tests/**)` | Skip passing tests (advanced) |

### Branch Protection Rules

Set these in GitHub Settings → Branches → Branch protection:

```
Required for merge to main:
✅ Require pull request before merging
  ✅ Require 1 approval
  ✅ Dismiss stale reviews on new push
✅ Require status checks to pass
  ✅ lint
  ✅ test
  ✅ build
✅ Require branches to be up to date
✅ Require linear history (no merge commits)
❌ Include administrators (optional — sometimes you need to unbreak main)
```

## Common CI Failures and Fixes

| Failure | Common Cause | Fix |
|---------|-------------|-----|
| `npm ci` fails | Lock file out of sync | `rm package-lock.json && npm install && git add package-lock.json` |
| Tests pass locally, fail in CI | Environment difference | Use same Node/Go/Python version, check env vars |
| Flaky tests | Timing, shared state, network | Use fake timers, reset state, mock HTTP |
| Out of memory | Large test suite | Run tests in parallel shards, increase runner memory |
| Docker build slow | No layer caching | Use `docker/build-push-action` with `cache-from` |
| Permissions denied | File not executable | `git update-index --chmod=+x scripts/my-script.sh` |
| Test database not ready | Service not started | Add health check with retry in workflow |

## Secret Management in CI

### GitHub Actions Secrets

```yaml
# ❌ NEVER hardcode secrets
env:
  API_KEY: sk-1234567890  # Will leak in logs

# ✅ Use repository/environment secrets
env:
  API_KEY: ${{ secrets.API_KEY }}

# ✅ Use environment-scoped secrets for deploy
jobs:
  deploy:
    environment: production  # ← secrets scoped to this environment
    steps:
      - run: ./deploy.sh
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### Secret Rotation Checklist

- [ ] Store secrets in GitHub Settings → Secrets → Actions
- [ ] Use environment-scoped secrets for production credentials
- [ ] Never log secret values — mask with `::add-mask::` if needed
- [ ] Rotate secrets on schedule (90 days for production)
- [ ] Use OIDC for cloud providers instead of long-lived credentials
- [ ] Audit secret access: Settings → Secrets → Audit log

## PR Checks Pattern

Annotate PRs with test results and coverage:

```yaml
- name: Comment coverage on PR
  if: github.event_name == 'pull_request'
  uses: marocchino/sticky-pull-request-comment@v2
  with:
    header: coverage
    message: |
      ## Test Coverage
      ${{ steps.coverage.outputs.report }}
```
