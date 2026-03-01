---
description: When the user asks about git hooks, pre-commit hooks, commit-msg hooks, husky, lint-staged, lefthook, pre-push checks, CI gating, automated code quality checks before commit, or setting up git automation
---

# Git Hooks & Automation

Set up git hooks to automate quality checks before commits and pushes. Covers Husky, lint-staged, Lefthook, and native git hooks.

## Hook Types

| Hook | Trigger | Common Use |
|------|---------|------------|
| `pre-commit` | Before commit is created | Lint, format, type-check staged files |
| `commit-msg` | After message is written | Validate conventional commit format |
| `pre-push` | Before push to remote | Run tests, check branch protection |
| `post-merge` | After git merge/pull | Auto-install deps if lockfile changed |
| `post-checkout` | After branch switch | Notify about env changes, run setup |
| `prepare-commit-msg` | Before editor opens | Auto-populate template/ticket ID |

## Husky + lint-staged (Recommended for JS/TS)

### Setup

```bash
# Install
npm install -D husky lint-staged

# Initialize husky
npx husky init

# This creates .husky/ directory and adds prepare script to package.json
```

### Pre-commit Hook

```bash
# .husky/pre-commit
npx lint-staged
```

### lint-staged Configuration

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{css,scss}": [
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### Commit Message Validation

```bash
# .husky/commit-msg
npx --no-install commitlint --edit "$1"
```

```javascript
// commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'perf', 'test', 'chore', 'ci', 'build', 'revert',
    ]],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
  },
};
```

### Pre-push Hook

```bash
# .husky/pre-push
npm run typecheck
npm test -- --bail
```

## Lefthook (Recommended for Go / Multi-language)

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: "*.go"
      run: golangci-lint run --new-from-rev=HEAD~1
    format:
      glob: "*.go"
      run: gofmt -l {staged_files}
    test:
      run: go test ./... -short -count=1

commit-msg:
  commands:
    validate:
      run: |
        MSG=$(cat "$1")
        if ! echo "$MSG" | grep -qE '^(feat|fix|docs|refactor|test|chore|perf|ci|build|revert)(\(.+\))?!?: .+'; then
          echo "❌ Commit message must follow Conventional Commits format"
          echo "   Example: feat(auth): add login page"
          exit 1
        fi

pre-push:
  commands:
    test-all:
      run: go test ./... -count=1 -race
```

```bash
# Install lefthook
go install github.com/evilmartians/lefthook@latest
lefthook install
```

## Native Git Hooks (No Dependencies)

For projects that don't want npm/Go dependencies:

```bash
#!/bin/sh
# .git/hooks/pre-commit (make executable: chmod +x)

# Check for debug statements
if git diff --cached --diff-filter=ACM | grep -nE '(console\.log|debugger|fmt\.Println.*DEBUG|import pdb)'; then
  echo "❌ Debug statements found in staged files. Remove before committing."
  exit 1
fi

# Check for secrets
if git diff --cached --diff-filter=ACM | grep -nEi '(api_key|secret|password|token)\s*[:=]\s*["\x27][^"\x27]{8,}'; then
  echo "❌ Possible secrets detected in staged files!"
  exit 1
fi

# Check for merge conflict markers
if git diff --cached --diff-filter=ACM | grep -nE '^[<>=]{7}'; then
  echo "❌ Merge conflict markers found!"
  exit 1
fi

echo "✅ Pre-commit checks passed"
```

### Shareable Native Hooks

```bash
# Store hooks in repo (not .git/hooks which isn't committed)
mkdir -p .githooks

# Configure git to use them
git config core.hooksPath .githooks
```

```json
// package.json — auto-configure on install
{
  "scripts": {
    "postinstall": "git config core.hooksPath .githooks"
  }
}
```

## Post-merge Auto-install

```bash
#!/bin/sh
# .husky/post-merge or .githooks/post-merge

# Check if lockfile changed
CHANGED_FILES=$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD)

if echo "$CHANGED_FILES" | grep -q "package-lock.json\|pnpm-lock.yaml\|yarn.lock"; then
  echo "📦 Lockfile changed — running install..."
  npm install  # or pnpm install / yarn
fi

if echo "$CHANGED_FILES" | grep -q "go.sum"; then
  echo "📦 go.sum changed — running go mod download..."
  go mod download
fi

if echo "$CHANGED_FILES" | grep -q "requirements.txt\|poetry.lock"; then
  echo "📦 Python deps changed — running install..."
  pip install -r requirements.txt  # or poetry install
fi
```

## CI Integration

Hooks run locally — CI is your safety net:

```yaml
# .github/workflows/ci.yml
name: CI
on: [pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage
      - name: Enforce conventional commits
        uses: wagoid/commitlint-github-action@v6
```

## Choosing a Tool

| Tool | Best For | Pros | Cons |
|------|----------|------|------|
| **Husky + lint-staged** | JS/TS projects | Ecosystem standard, fast (staged only) | Node dependency |
| **Lefthook** | Go / polyglot | Zero deps binary, parallel execution, YAML | Smaller community |
| **Native hooks** | Minimal setups | No dependencies at all | Manual maintenance |
| **pre-commit (Python)** | Python projects | Language-agnostic, huge hook library | Python required |

## Checklist

- [ ] Pre-commit hook lints and formats staged files only (not entire repo)
- [ ] Commit message validation enforces conventional format
- [ ] Pre-push runs type-check and tests before pushing
- [ ] Hooks are committed to repo (not just in local .git/hooks)
- [ ] CI mirrors hook checks (hooks can be skipped with --no-verify)
- [ ] Post-merge auto-installs when lockfile changes
- [ ] Team onboarding docs mention hook setup
