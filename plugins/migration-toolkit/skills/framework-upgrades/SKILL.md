---
description: When the user asks about upgrading frameworks, migrating from one version to another, Next.js upgrade, React upgrade, Express 4 to 5, Vue 2 to 3, Angular upgrade, Python 2 to 3, Go version upgrade, or following framework migration guides
---

# Framework Upgrades

Step-by-step guides for upgrading major frameworks. Covers preparation, codemods, manual changes, testing, and common pitfalls.

## Upgrade Process (Universal)

```
1. READ the official migration guide (always the first step)
2. CHECK compatibility of all dependencies with the new version
3. BRANCH — create a dedicated upgrade branch
4. RUN codemods (automated transformations)
5. FIX manual breaking changes
6. TEST thoroughly (unit, integration, E2E)
7. BUILD and verify bundle
8. DEPLOY to staging first
9. MONITOR for 24-48 hours in production
```

## Next.js Upgrade (14 → 15 → 15.x)

### Automated Upgrade

```bash
# Use the official codemod CLI
npx @next/codemod@latest upgrade latest

# Or specific version
npx @next/codemod@latest upgrade 15
```

### Manual Changes Checklist

| Change | From | To | Action |
|--------|------|-----|--------|
| Async Request APIs | `params` is sync | `params` is async | `await` all `params`, `searchParams`, `cookies()`, `headers()` |
| Caching | Fetch cached by default | Fetch NOT cached by default | Add `cache: 'force-cache'` where needed |
| `next.config` | `.js` | `.ts` supported | Optionally migrate to TypeScript |
| React 19 | React 18 | React 19 | Update `react` and `react-dom` |
| Turbopack | Webpack default | Turbopack default (dev) | Test with `--turbopack` flag |

### Common Fix Pattern

```typescript
// Before (Next.js 14) — params is synchronous
export default function Page({ params }: { params: { id: string } }) {
  return <div>{params.id}</div>;
}

// After (Next.js 15) — params is a Promise
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div>{id}</div>;
}
```

## React Upgrade (18 → 19)

### Key Changes

| Feature | React 18 | React 19 |
|---------|----------|----------|
| Ref handling | `forwardRef` required | Ref is a regular prop |
| Context | `<Context.Provider>` | `<Context>` (provider is the context) |
| Use hook | N/A | `use(promise)`, `use(context)` |
| Actions | N/A | `useActionState`, `useFormStatus` |
| Metadata | `react-helmet` | Native `<title>`, `<meta>` in components |
| Suspense | Basic | Full streaming SSR support |

### Migration Steps

```bash
# 1. Update packages
npm install react@19 react-dom@19

# 2. Update types
npm install -D @types/react@19 @types/react-dom@19

# 3. Run codemod
npx codemod@latest react/19/migration-recipe

# 4. Manual fixes
# - Remove forwardRef wrappers
# - Replace Context.Provider with Context
# - Update deprecated string refs
# - Check createRoot (already required since 18)
```

### Common Fix Pattern

```typescript
// Before (React 18) — forwardRef
const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return <input ref={ref} {...props} />;
});

// After (React 19) — ref is a prop
function Input({ ref, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}
```

## Express Upgrade (4 → 5)

### Key Changes

| Change | Express 4 | Express 5 |
|--------|-----------|-----------|
| Path syntax | `:name` optional regex | Strict, no regex in path |
| `req.query` | Returns parsed object | May need explicit parser |
| Rejected promises | Unhandled | Auto-passed to error handler |
| Removed methods | Various deprecated methods | `res.json(obj, status)`, `app.del()` removed |
| Node.js | 0.10+ | 18+ |

### Migration Steps

```bash
# 1. Update
npm install express@5

# 2. Fix path patterns
# Before: app.get('/user/:id(\\d+)', ...)
# After:  app.get('/user/:id', ...)  (validate in handler)

# 3. Remove deprecated method usage
# Before: res.json(data, 200)
# After:  res.status(200).json(data)

# Before: app.del('/resource/:id', ...)
# After:  app.delete('/resource/:id', ...)

# 4. Promise rejection is now auto-caught
# Before: needed express-async-errors or try/catch in every handler
// After: async errors automatically go to error handler
```

## Go Version Upgrade

```bash
# 1. Update go.mod
go mod edit -go=1.23

# 2. Update toolchain
go install golang.org/dl/go1.23@latest
go1.23 download

# 3. Run vet with new version
go vet ./...

# 4. Check for deprecated features
go build ./...  # Compiler warnings

# 5. Update dependencies
go get -u ./...
go mod tidy
```

### Go Module Migration Patterns

```go
// Check minimum Go version in go.mod
module myapp

go 1.23

// Use new features conditionally with build tags
//go:build go1.23

package main
```

## Python Upgrade (3.11 → 3.12 → 3.13)

```bash
# 1. Install new Python version
uv python install 3.13

# 2. Update pyproject.toml
[project]
requires-python = ">=3.12"

# 3. Run tests with new version
uv run --python 3.13 pytest

# 4. Check for removed deprecations
python -W error::DeprecationWarning -m pytest

# 5. Update CI
# Update Python version in GitHub Actions matrix
```

## Upgrade Planning Template

```markdown
## Upgrade Plan: [Framework] [Current] → [Target]

### Pre-Upgrade
- [ ] Read official migration guide: [link]
- [ ] Check all dependencies for compatibility
- [ ] Note breaking changes that affect our codebase
- [ ] Estimate effort: [T-shirt size]
- [ ] Create upgrade branch: `upgrade/[framework]-[version]`

### Execution
- [ ] Run automated codemods
- [ ] Fix compiler/type errors
- [ ] Fix runtime errors (test suite)
- [ ] Fix deprecation warnings
- [ ] Update configuration files
- [ ] Update CI/CD pipeline

### Verification
- [ ] Unit tests pass: `npm test`
- [ ] Type check passes: `tsc --noEmit`
- [ ] Build succeeds: `npm run build`
- [ ] E2E tests pass
- [ ] Bundle size acceptable
- [ ] Performance benchmarks stable
- [ ] Deployed to staging and smoke tested

### Post-Upgrade
- [ ] Monitor error rates for 48 hours
- [ ] Update documentation
- [ ] Remove compatibility shims
- [ ] Close upgrade tracking issue
```

## Incremental Migration Strategy

For large codebases, migrate gradually:

```
1. Set up dual-version support (compatibility layer)
2. Migrate one module/page at a time
3. Run both versions in CI
4. Remove old version when 100% migrated
```

### Next.js Pages Router → App Router (Incremental)

```
app/                    # New routes (App Router)
  layout.tsx
  page.tsx
  dashboard/
    page.tsx
pages/                  # Legacy routes (Pages Router)
  api/                  # API routes stay here until migrated
  old-page.tsx          # Migrate one at a time
```

## Checklist

- [ ] Official migration guide read completely
- [ ] Dedicated upgrade branch created
- [ ] All dependencies checked for compatibility with new version
- [ ] Automated codemods run first (before manual changes)
- [ ] Breaking changes fixed and tested
- [ ] Deprecation warnings resolved
- [ ] CI pipeline updated for new version
- [ ] Deployed to staging before production
- [ ] Rollback plan documented (revert branch if needed)
- [ ] Post-deploy monitoring for 24-48 hours
