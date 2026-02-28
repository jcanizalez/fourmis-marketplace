# CI Best Practices

Optimize CI/CD pipelines — caching strategies, parallelism, secrets management, matrix builds, and reducing build times.

## When to Activate

When the user asks to:
- Speed up CI builds
- Optimize CI pipeline performance
- Set up caching in CI
- Configure parallel test execution
- Manage secrets in CI/CD
- Debug failing CI builds

## Caching Strategies

### Node.js — Cache npm/pnpm/yarn

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: 'npm'  # Auto-caches ~/.npm

# Or manual cache for node_modules
- uses: actions/cache@v4
  with:
    path: node_modules
    key: node-modules-${{ hashFiles('package-lock.json') }}
    restore-keys: node-modules-
```

### Python — Cache pip

```yaml
- uses: actions/setup-python@v5
  with:
    python-version: '3.12'
    cache: 'pip'

# Or cache virtualenv
- uses: actions/cache@v4
  with:
    path: .venv
    key: venv-${{ hashFiles('requirements*.txt') }}
```

### Go — Cache modules

```yaml
- uses: actions/setup-go@v5
  with:
    go-version: '1.23'
    cache: true  # Auto-caches go modules

# Or cache build artifacts
- uses: actions/cache@v4
  with:
    path: |
      ~/go/pkg/mod
      ~/.cache/go-build
    key: go-${{ hashFiles('go.sum') }}
```

### Docker — Cache layers

```yaml
- uses: docker/build-push-action@v6
  with:
    context: .
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

## Parallelism

### Run independent jobs concurrently

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test

  # All three run in parallel, then build depends on all
  build:
    needs: [lint, typecheck, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
```

### Shard tests across runners

```yaml
test:
  runs-on: ubuntu-latest
  strategy:
    matrix:
      shard: [1, 2, 3, 4]
  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npx jest --shard=${{ matrix.shard }}/${{ strategy.job-total }}
```

## Matrix Builds

```yaml
test:
  strategy:
    fail-fast: false  # Don't cancel other jobs if one fails
    matrix:
      os: [ubuntu-latest, macos-latest, windows-latest]
      node-version: [20, 22]
      exclude:
        - os: windows-latest
          node-version: 20  # Skip this combo
      include:
        - os: ubuntu-latest
          node-version: 22
          coverage: true      # Extra flag for this combo
```

## Secrets Management

### GitHub Secrets

```yaml
# Organization-level: Settings → Secrets → Actions
# Repository-level: Settings → Secrets and variables → Actions
# Environment-level: Settings → Environments → [env] → Secrets

steps:
  - run: ./deploy.sh
    env:
      API_KEY: ${{ secrets.API_KEY }}           # Repository secret
      DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }} # Environment secret
```

### Security Rules

| Rule | Details |
|------|---------|
| Never echo secrets | `echo $SECRET` will be masked, but avoid it |
| Don't pass to untrusted actions | Only use verified actions (checkmark) |
| Use OIDC for cloud providers | Avoid long-lived cloud credentials |
| Rotate secrets regularly | Set calendar reminders for rotation |
| Use environment protection | Require approval for production secrets |

### OIDC Authentication (Preferred)

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789:role/github-actions
      aws-region: us-east-1
      # No access keys needed! Uses OIDC tokens
```

## CI Performance Optimization

| Optimization | Impact | How |
|-------------|--------|-----|
| Cache dependencies | ⭐⭐⭐ High | `actions/cache` or built-in caching |
| Parallel jobs | ⭐⭐⭐ High | Split lint/test/build into separate jobs |
| Shard tests | ⭐⭐ Medium | Split test suite across runners |
| Skip unchanged | ⭐⭐ Medium | `paths` filter in triggers |
| Smaller images | ⭐⭐ Medium | Use `-slim` or Alpine base images |
| Self-hosted runners | ⭐⭐⭐ High | For build-heavy workflows |
| Fail fast | ⭐ Low | `fail-fast: true` in matrix |
| Concurrency groups | ⭐ Low | Cancel redundant runs |

### Concurrency — Cancel Redundant Runs

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true  # Cancel old runs when new push arrives
```

## Debugging CI Failures

### 1. Enable debug logging
```yaml
# Set repository secret: ACTIONS_RUNNER_DEBUG = true
# Or re-run with "Enable debug logging" checkbox
```

### 2. SSH into runner (tmate)
```yaml
- uses: mxschmitt/action-tmate@v3
  if: failure()  # Only on failure
```

### 3. Upload artifacts for investigation
```yaml
- uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: debug-logs
    path: |
      logs/
      coverage/
      screenshots/
```

## Status Badges

```markdown
[![CI](https://github.com/user/repo/actions/workflows/ci.yml/badge.svg)](https://github.com/user/repo/actions/workflows/ci.yml)
```
