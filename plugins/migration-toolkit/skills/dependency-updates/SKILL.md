---
description: When the user asks about updating dependencies, upgrading packages, npm update, semver, breaking changes in packages, changelog review, dependency audit, renovate, dependabot, or managing package upgrades safely
---

# Dependency Updates

Safely update project dependencies — check for breaking changes, review changelogs, batch updates by risk level, and verify nothing breaks.

## Semver Understanding

```
MAJOR.MINOR.PATCH
  ^     ^     ^
  |     |     └── Bug fixes (safe to update)
  |     └──────── New features, backward compatible (usually safe)
  └────────────── Breaking changes (review required!)
```

| Update Type | Example | Risk | Action |
|-------------|---------|------|--------|
| Patch | 2.3.1 → 2.3.4 | 🟢 Low | Auto-merge usually safe |
| Minor | 2.3.1 → 2.5.0 | 🟡 Medium | Check changelog for deprecations |
| Major | 2.3.1 → 3.0.0 | 🔴 High | Full migration guide review |

## Update Strategy

### 1. Audit Current State

```bash
# npm — check for outdated packages
npm outdated

# npm — security vulnerabilities
npm audit

# pnpm
pnpm outdated
pnpm audit

# Go
go list -m -u all

# Python
pip list --outdated
pip-audit
```

### 2. Categorize Updates by Risk

```markdown
## Dependency Update Plan

### 🟢 Patch Updates (auto-merge)
| Package | Current | Latest | Change |
|---------|---------|--------|--------|
| zod | 3.22.1 | 3.22.4 | Bug fixes |
| drizzle-orm | 0.30.1 | 0.30.3 | Bug fixes |

### 🟡 Minor Updates (review changelog)
| Package | Current | Latest | Change |
|---------|---------|--------|--------|
| next | 15.0.3 | 15.1.0 | New features, check deprecations |
| tailwindcss | 4.0.1 | 4.1.0 | New utilities |

### 🔴 Major Updates (migration required)
| Package | Current | Latest | Breaking Changes |
|---------|---------|--------|-----------------|
| react | 18.3.1 | 19.0.0 | Ref changes, use() hook, new JSX transform |
| express | 4.21.1 | 5.0.1 | Removed deprecated APIs, path syntax changes |
```

### 3. Update in Batches

```bash
# Batch 1: All patch updates (low risk)
npm update --save

# Batch 2: Minor updates one at a time
npm install next@15.1.0
npm test  # Verify before moving on

# Batch 3: Major updates individually with migration
npm install react@19 react-dom@19
# Follow migration guide, fix breaking changes, test
```

## Changelog Review Process

### Where to Find Changelogs

| Source | How to Check |
|--------|-------------|
| GitHub Releases | `gh release list -R owner/repo` or `https://github.com/owner/repo/releases` |
| CHANGELOG.md | In the package repository root |
| npm page | `https://www.npmjs.com/package/NAME/v/VERSION` |
| Migration guides | Usually linked from major release notes |
| `npm diff` | `npm diff --diff=pkg@old --diff=pkg@new` |

### What to Look For

| Signal | Risk | Action |
|--------|------|--------|
| "BREAKING" in changelog | 🔴 | Read full migration guide |
| "Deprecated" warnings | 🟡 | Plan to update usage before next major |
| "Security fix" | 🔴 | Update immediately |
| New peer dependency | 🟡 | Install the peer dependency too |
| Dropped Node.js version | 🟡 | Check your CI/CD Node version |
| TypeScript version bump | 🟡 | May need tsconfig changes |

## Lock File Management

### npm (package-lock.json)

```bash
# Update lock file without changing versions
npm install

# Update everything to latest allowed by semver ranges
npm update

# Rebuild lock file from scratch
rm -rf node_modules package-lock.json && npm install

# Audit and fix vulnerabilities
npm audit fix
npm audit fix --force  # Allow breaking changes (review first!)
```

### pnpm (pnpm-lock.yaml)

```bash
pnpm update
pnpm update --latest  # Ignore semver ranges, get latest
pnpm update react --latest  # Single package to latest
```

### Go (go.sum)

```bash
go get -u ./...         # Update all dependencies
go get -u=patch ./...   # Patch updates only
go mod tidy             # Clean up unused deps
```

### Python (requirements.txt / pyproject.toml)

```bash
# pip-compile (pip-tools)
pip-compile --upgrade requirements.in

# uv
uv pip compile --upgrade requirements.in
uv lock --upgrade  # For uv.lock
```

## Automated Update Tools

### Dependabot (GitHub)

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
    groups:
      patch-updates:
        update-types: ["patch"]
      minor-updates:
        update-types: ["minor"]
    reviewers:
      - "team-lead"
    labels:
      - "dependencies"
    open-pull-requests-limit: 10
```

### Renovate

```json
// renovate.json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "packageRules": [
    {
      "matchUpdateTypes": ["patch"],
      "automerge": true,
      "groupName": "patch updates"
    },
    {
      "matchUpdateTypes": ["minor"],
      "groupName": "minor updates",
      "schedule": ["every weekend"]
    },
    {
      "matchUpdateTypes": ["major"],
      "labels": ["breaking-change"],
      "assignees": ["tech-lead"]
    }
  ]
}
```

## Peer Dependency Resolution

```bash
# Check what's wrong
npm ls --all 2>&1 | grep "WARN"
npm explain <package>

# Force resolution (package.json)
{
  "overrides": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}

# pnpm
{
  "pnpm": {
    "overrides": {
      "react": "^19.0.0"
    }
  }
}
```

## Update Verification

```bash
# 1. Run type check
npx tsc --noEmit

# 2. Run linter
npm run lint

# 3. Run tests
npm test

# 4. Run build
npm run build

# 5. Check bundle size (catch new large dependencies)
npx size-limit

# 6. Smoke test in dev
npm run dev  # Manual check of critical paths
```

## Checklist

- [ ] `npm outdated` / `pip list --outdated` run to see full picture
- [ ] `npm audit` / `pip-audit` run for security vulnerabilities
- [ ] Updates categorized by risk (patch/minor/major)
- [ ] Changelogs reviewed for breaking changes and deprecations
- [ ] Patch updates applied as a batch
- [ ] Major updates applied one at a time with migration guides followed
- [ ] Tests pass after each update batch
- [ ] TypeScript compilation clean (`tsc --noEmit`)
- [ ] Build succeeds
- [ ] Lock file committed alongside package.json changes
- [ ] Dependabot or Renovate configured for ongoing automation
