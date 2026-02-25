---
name: Dependency Audit
description: Checks project dependencies for outdated packages, security concerns, and bloat. Activates when reviewing package.json, go.mod, Cargo.toml, requirements.txt, or when asked about dependency health.
version: 1.0.0
---

# Dependency Audit

This skill activates when reviewing project dependencies or when asked about package health.

## When to Activate

- User asks about outdated dependencies
- User asks to audit or review packages
- User asks "are my dependencies up to date?"
- The `/health` or `/deps` commands are invoked
- When you notice a package.json, go.mod, Cargo.toml, or requirements.txt during work

## Audit Process

### 1. Identify Dependency Files

| File | Ecosystem | Lock File |
|------|-----------|-----------|
| `package.json` | Node.js/npm | `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb` |
| `go.mod` | Go | `go.sum` |
| `Cargo.toml` | Rust | `Cargo.lock` |
| `requirements.txt` / `pyproject.toml` | Python | `poetry.lock`, `uv.lock` |
| `Gemfile` | Ruby | `Gemfile.lock` |
| `composer.json` | PHP | `composer.lock` |

### 2. Check for Outdated Packages

Run the appropriate check command:

```bash
# Node.js
npm outdated 2>/dev/null || yarn outdated 2>/dev/null

# Go
go list -m -u all 2>/dev/null

# Python
pip list --outdated 2>/dev/null

# Rust
cargo outdated 2>/dev/null
```

If the CLI tools aren't available, read the dependency file and note major version pins that may be outdated.

### 3. Identify Concerns

Flag these issues:

| Issue | Severity | Example |
|-------|----------|---------|
| **Major version behind** | High | React 17 when 19 is current |
| **Security advisory** | Critical | Known CVE in installed version |
| **Deprecated package** | High | Package archived or unmaintained |
| **Duplicate functionality** | Medium | Both lodash and underscore installed |
| **Excessive dependencies** | Medium | >100 direct deps in package.json |
| **Unpinned versions** | Low | `"*"` or `">= 1.0"` ranges |
| **Dev deps in production** | Medium | Testing tools not in devDependencies |

### 4. Dependency Bloat Detection

Flag potential bloat:
- Packages installed but never imported in source code
- Multiple packages solving the same problem (e.g., axios + got + node-fetch)
- Heavy packages with lighter alternatives (moment.js → date-fns, lodash → native ES methods)
- Packages that could be replaced with a few lines of code

## Report Format

```
## Dependency Health

### Summary
- Total dependencies: X direct, Y transitive
- Outdated: Z packages
- Security issues: W advisories

### Critical Updates
| Package | Current | Latest | Why Update |
|---------|---------|--------|------------|
| express | 4.18 | 5.1 | Major update, security fixes |

### Potential Bloat
- `moment` (295KB) → consider `date-fns` (tree-shakeable) or `Intl` API
- `lodash` (72KB) → most methods available natively in ES2024

### Unused Dependencies
These are installed but not imported in source:
- `@types/jest` (no test files found)
- `husky` (no git hooks configured)
```

## Recommendations

When suggesting updates:
1. **Don't recommend updating everything at once** — prioritize security and major version updates
2. **Flag breaking changes** — major version bumps often have migration steps
3. **Suggest lock file audit** — `npm audit` / `yarn audit` for known vulnerabilities
4. **Recommend removal** before addition — removing unused deps is always safe and reduces surface area
