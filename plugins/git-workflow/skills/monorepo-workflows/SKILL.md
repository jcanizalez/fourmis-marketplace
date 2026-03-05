---
description: When the user asks about monorepo git workflows, managing multiple packages in one repo, workspace-aware commits, selective CI, turborepo, nx, pnpm workspaces, git subtrees, git submodules, CODEOWNERS, large repository management, sparse checkout, changesets, independent versioning, or partial clone
---

# Monorepo Git Workflows

Git patterns for monorepos — workspace-aware commits, selective CI, CODEOWNERS, and tooling for multi-package repositories.

## Monorepo Structure

```
my-monorepo/
├── package.json              # Root workspace config
├── turbo.json                # Turborepo config (or nx.json)
├── .github/
│   ├── CODEOWNERS
│   └── workflows/
│       ├── ci.yml            # Selective CI
│       └── release.yml
├── packages/
│   ├── ui/                   # @acme/ui
│   │   ├── package.json
│   │   └── src/
│   ├── utils/                # @acme/utils
│   │   ├── package.json
│   │   └── src/
│   └── config/               # @acme/config
│       └── package.json
└── apps/
    ├── web/                  # Next.js app
    │   ├── package.json
    │   └── src/
    └── api/                  # Express/Go API
        ├── package.json
        └── src/
```

## Workspace-Aware Commits

### Scoped Conventional Commits

In monorepos, **scope = package name**:

```
feat(ui): add DatePicker component
fix(api): handle null response in /users endpoint
chore(config): update ESLint rules for TypeScript 5.5
test(web): add integration tests for checkout flow
docs(utils): add JSDoc to formatCurrency function
```

### Multi-Package Commits

When a change spans multiple packages:

```
feat(ui,web): add DatePicker component and integrate in checkout

- packages/ui: new DatePicker with range selection
- apps/web: integrate DatePicker in booking form
```

Or if it's a cross-cutting concern:

```
chore: upgrade TypeScript to 5.5 across all packages
```

### Commit Scope Detection

Before committing, check which packages are affected:

```bash
# List changed packages based on staged files
git diff --cached --name-only | \
  grep -oE '^(packages|apps)/[^/]+' | \
  sort -u

# Output:
# apps/web
# packages/ui
```

## CODEOWNERS

Assign reviewers automatically based on file paths:

```
# .github/CODEOWNERS

# Global
* @org/platform-team

# Package-specific owners
/packages/ui/          @org/design-team
/packages/utils/       @org/platform-team
/packages/config/      @org/dx-team
/apps/web/             @org/frontend-team
/apps/api/             @org/backend-team

# Critical files — require senior review
package.json           @org/tech-leads
turbo.json             @org/tech-leads
.github/workflows/     @org/devops-team
```

## Selective CI (Only Test What Changed)

### GitHub Actions with Path Filters

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    paths:
      - 'packages/**'
      - 'apps/**'
      - 'package.json'
      - 'pnpm-lock.yaml'

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      ui: ${{ steps.changes.outputs.ui }}
      web: ${{ steps.changes.outputs.web }}
      api: ${{ steps.changes.outputs.api }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: changes
        with:
          filters: |
            ui:
              - 'packages/ui/**'
            web:
              - 'apps/web/**'
              - 'packages/ui/**'
            api:
              - 'apps/api/**'
              - 'packages/utils/**'

  test-ui:
    needs: detect-changes
    if: needs.detect-changes.outputs.ui == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @acme/ui test
      - run: pnpm --filter @acme/ui lint

  test-web:
    needs: detect-changes
    if: needs.detect-changes.outputs.web == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @acme/web test
      - run: pnpm --filter @acme/web build
```

### Turborepo Selective Execution

```bash
# Only run affected packages since main
turbo run test --filter=...[origin/main]

# Only run packages that depend on changed files
turbo run build --filter=...{./packages/ui}

# Run specific package and its dependents
turbo run test --filter=@acme/ui...
```

### Nx Affected

```bash
# Test only affected projects
npx nx affected --target=test --base=origin/main

# Build only affected projects
npx nx affected --target=build --base=origin/main

# See which projects are affected
npx nx show projects --affected --base=origin/main
```

## Release Strategies

### Independent Versioning (Changesets)

Each package has its own version and changelog:

```bash
# Install changesets
pnpm add -D @changesets/cli
pnpm changeset init

# Add a changeset (run after making changes)
pnpm changeset
# Prompts: which packages? major/minor/patch? description?

# Creates .changeset/funny-name.md:
# ---
# "@acme/ui": minor
# "@acme/web": patch
# ---
# Add DatePicker component with range selection
```

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install
      - uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
          title: "Version Packages"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Synchronized Versioning

All packages share the same version (simpler):

```json
// package.json (root)
{
  "scripts": {
    "version": "pnpm --recursive exec -- npm version $1 --no-git-tag-version",
    "release": "pnpm version patch && pnpm publish --recursive"
  }
}
```

## Git Submodules vs Subtrees

For external repo inclusion (not the same as monorepo workspaces):

### Submodules

```bash
# Add a submodule
git submodule add https://github.com/org/shared-proto.git proto/

# Clone a repo with submodules
git clone --recurse-submodules <url>

# Update submodule to latest
cd proto && git pull origin main && cd ..
git add proto
git commit -m "chore: update shared-proto submodule"

# Gotcha: submodules point to a specific commit, not a branch
```

### Subtrees (Simpler Alternative)

```bash
# Add external repo as subtree
git subtree add --prefix=lib/shared-proto \
  https://github.com/org/shared-proto.git main --squash

# Pull updates
git subtree pull --prefix=lib/shared-proto \
  https://github.com/org/shared-proto.git main --squash

# Push changes back upstream
git subtree push --prefix=lib/shared-proto \
  https://github.com/org/shared-proto.git main
```

### When to Use What

| Approach | Best For | Pros | Cons |
|----------|----------|------|------|
| **Workspaces** | Packages you own | Full monorepo benefits | Must be same repo |
| **Submodules** | External repos, pinned versions | Exact version control | Confusing UX, easy to mess up |
| **Subtrees** | External code you modify | Simpler than submodules | History mixing, large diffs |
| **Package registry** | Shared libraries | Clean boundaries | Publish/version overhead |

## Large Repo Performance

```bash
# Sparse checkout — only check out packages you need
git clone --sparse --filter=blob:none <url>
git sparse-checkout set apps/web packages/ui packages/utils

# Shallow clone — limit history depth
git clone --depth=1 <url>          # CI/CD (latest only)
git clone --depth=50 <url>         # Development (recent history)

# Partial clone — fetch blobs on demand
git clone --filter=blob:none <url>
# Git fetches file contents as you access them

# Maintenance — optimize large repos
git maintenance start              # Background optimization
git gc --aggressive                # Manual garbage collection
```

## Checklist

- [ ] Commit scopes match package names in monorepo
- [ ] CODEOWNERS assigns correct team per package directory
- [ ] CI is selective — only tests packages affected by the change
- [ ] Lockfile at root level (one per monorepo, not per package)
- [ ] Release strategy defined: independent (changesets) or synchronized
- [ ] Sparse checkout configured for large repos (CI + developer machines)
- [ ] Submodules/subtrees documented if used (they confuse new contributors)
- [ ] README explains monorepo structure and how to work in it
