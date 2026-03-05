---
description: When the user asks to create a GitHub Actions workflow, set up CI for a project, configure automated testing or builds, write a CI pipeline YAML, set up GitHub Actions triggers, reusable workflows, composite actions, matrix builds, workflow_dispatch, workflow_call, actions/checkout, actions/setup-node, actions/cache, upload-artifact, conditional execution, monorepo CI with path filters, or .github/workflows configuration
---

# GitHub Actions

Generate and configure GitHub Actions workflows. Covers workflow syntax, job configuration, triggers, reusable workflows, and common patterns.
- Add a workflow for linting, formatting, or type checking
- Set up pull request checks

## Workflow File Location

All workflows go in `.github/workflows/*.yml`

## Core Workflow Structure

```yaml
name: CI                          # Workflow name

on:                               # Triggers
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:                      # Least-privilege permissions
  contents: read

jobs:
  build:                          # Job name
    runs-on: ubuntu-latest        # Runner
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm test
```

## Common Triggers

```yaml
on:
  # Push to specific branches
  push:
    branches: [main, develop]
    paths: ['src/**', 'package.json']  # Only trigger for specific paths

  # Pull requests
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]

  # Scheduled (cron)
  schedule:
    - cron: '0 9 * * 1-5'  # Weekdays at 9am UTC

  # Manual trigger
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deploy environment'
        required: true
        default: 'staging'
        type: choice
        options: [staging, production]

  # After another workflow
  workflow_run:
    workflows: ['CI']
    types: [completed]

  # Tag push (releases)
  push:
    tags: ['v*']
```

## Common Workflow Templates

### Node.js CI

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-${{ matrix.node-version }}
          path: coverage/
```

### Python CI

```yaml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.11', '3.12', '3.13']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
          cache: 'pip'
      - run: pip install -r requirements.txt
      - run: pip install -r requirements-dev.txt
      - run: ruff check .
      - run: mypy src/
      - run: pytest --cov=src --cov-report=xml
```

### Go CI

```yaml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.23'
      - run: go vet ./...
      - run: golangci-lint run
      - run: go test -race -coverprofile=coverage.out ./...
      - run: go build ./...
```

## Reusable Workflows

### Define a reusable workflow

```yaml
# .github/workflows/reusable-deploy.yml
name: Deploy
on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
    secrets:
      DEPLOY_KEY:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - uses: actions/checkout@v4
      - run: echo "Deploying to ${{ inputs.environment }}"
```

### Call a reusable workflow

```yaml
jobs:
  deploy-staging:
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: staging
    secrets:
      DEPLOY_KEY: ${{ secrets.STAGING_DEPLOY_KEY }}
```

## Composite Actions

Reusable steps shared across workflows — like a function for CI.

### Define a Composite Action

```yaml
# .github/actions/setup-project/action.yml
name: 'Setup Project'
description: 'Checkout, install deps, build'
inputs:
  node-version:
    description: 'Node.js version'
    default: '22'

runs:
  using: 'composite'
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: 'npm'
    - run: npm ci
      shell: bash
    - run: npm run build
      shell: bash
```

### Use the Composite Action

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: ./.github/actions/setup-project
        with:
          node-version: '22'
      - run: npm test
```

**Why**: Eliminate duplicated setup steps across CI, deploy, and release workflows.

---

## Monorepo CI (Path Filtering)

Run only the jobs affected by changed files:

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      api: ${{ steps.filter.outputs.api }}
      web: ${{ steps.filter.outputs.web }}
      shared: ${{ steps.filter.outputs.shared }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            api:
              - 'packages/api/**'
              - 'packages/shared/**'
            web:
              - 'packages/web/**'
              - 'packages/shared/**'
            shared:
              - 'packages/shared/**'

  test-api:
    needs: detect-changes
    if: needs.detect-changes.outputs.api == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test -w packages/api

  test-web:
    needs: detect-changes
    if: needs.detect-changes.outputs.web == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test -w packages/web
```

**Why**: In monorepos, running all tests on every change wastes minutes. Path filtering runs only affected packages.

---

## Environment Variables and Secrets

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    env:
      NODE_ENV: production         # Job-level env var
    steps:
      - run: echo "$API_KEY"
        env:
          API_KEY: ${{ secrets.API_KEY }}  # Step-level secret
```

**Never** put secrets in workflow files. Always use GitHub Secrets or environment secrets.

## Conditional Execution

```yaml
steps:
  # Only on main branch
  - run: npm run deploy
    if: github.ref == 'refs/heads/main'

  # Only on PR
  - run: npm run preview
    if: github.event_name == 'pull_request'

  # Only if previous step failed
  - run: npm run cleanup
    if: failure()

  # Always run (even on failure)
  - run: npm run report
    if: always()

  # Skip for dependabot
  - run: npm run e2e
    if: github.actor != 'dependabot[bot]'
```
