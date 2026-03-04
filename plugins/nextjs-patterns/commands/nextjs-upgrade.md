---
name: nextjs-upgrade
description: Guide for upgrading between Next.js versions with breaking changes and codemods
arguments:
  - name: version
    description: "Target Next.js version (e.g., 15, 14, latest)"
    required: false
---

# Next.js Upgrade Guide

Analyze the current Next.js project and provide a step-by-step upgrade plan to the target version.

## Instructions

### 1. Detect Current Version

```bash
# Check current Next.js version
cat package.json | grep '"next"'
cat package.json | grep '"react"'
cat package.json | grep '"react-dom"'
```

### 2. Identify Breaking Changes

Based on the current and target versions, identify all breaking changes that affect this project.

#### Next.js 14 → 15 Breaking Changes

**Async Request APIs** (most impactful):
- `cookies()`, `headers()`, `params`, `searchParams` are now **async**
- Must `await` them: `const cookieStore = await cookies()`
- `params` in pages/layouts is now a Promise: `const { slug } = await params`
- `searchParams` in pages is now a Promise: `const { q } = await searchParams`

```bash
# Find files affected by async APIs
grep -rn "cookies()\|headers()\|params\." --include="*.tsx" --include="*.ts" -l | grep -v node_modules | grep -v .next

# Run the official codemod
npx @next/codemod@latest upgrade
```

**Caching changes**:
- `fetch()` requests are no longer cached by default (was cached in 14)
- Must explicitly add `cache: "force-cache"` or `next: { revalidate: N }` for caching
- `GET` route handlers are no longer cached by default

**React 19**:
- Next.js 15 requires React 19
- `useFormState` → `useActionState` (renamed)
- `ref` is now a regular prop (no more `forwardRef` needed)
- New hooks: `useOptimistic`, `use`

**Other changes**:
- `next.config.js` → `next.config.ts` (TypeScript config supported)
- `NextRequest.geo` and `NextRequest.ip` removed (use hosting provider's headers)
- `<Link>` no longer requires `<a>` child (already changed in 13)
- `next/image` — `squoosh` replaced with `sharp` as default optimizer

#### Next.js 13 → 14 Breaking Changes

- Minimum Node.js 18.17
- `next export` command removed — use `output: "export"` in next.config
- `next/server` `ImageResponse` → import from `next/og`
- `@next/font` removed — use `next/font`
- WASM target for Server Actions removed

### 3. Scan Project for Affected Code

Analyze the project to determine exactly which files need changes:

```bash
# Files using cookies/headers (async change in 15)
grep -rn "cookies()\|headers()" --include="*.tsx" --include="*.ts" -l | grep -v node_modules

# Files using useFormState (renamed in 15)
grep -rn "useFormState" --include="*.tsx" --include="*.ts" -l | grep -v node_modules

# Files using forwardRef (no longer needed in React 19)
grep -rn "forwardRef" --include="*.tsx" --include="*.ts" -l | grep -v node_modules

# Files with uncached fetch relying on default caching (14 behavior)
grep -rn "await fetch(" --include="*.tsx" --include="*.ts" | grep -v "cache:" | grep -v "revalidate" | grep -v node_modules

# Check for removed APIs
grep -rn "NextRequest.geo\|NextRequest.ip\|next/server.*ImageResponse" --include="*.tsx" --include="*.ts" | grep -v node_modules
```

### 4. Generate Upgrade Plan

Produce a step-by-step plan:

```markdown
## Upgrade Plan: Next.js {current} → {target}

### Prerequisites
- [ ] Node.js version check (minimum required)
- [ ] Backup / create a branch
- [ ] Run existing tests to establish baseline

### Step 1: Update Dependencies
npm install next@{target} react@latest react-dom@latest

### Step 2: Run Official Codemods
npx @next/codemod@latest upgrade

### Step 3: Manual Changes Required
(List each file that needs manual changes with specific instructions)

### Step 4: Caching Review
(List fetch calls that relied on default caching behavior)

### Step 5: Type Updates
npm install -D @types/react@latest @types/react-dom@latest

### Step 6: Test
npm run build
npm run test
npm run lint

### Migration Checklist
- [ ] Dependencies updated
- [ ] Codemods applied
- [ ] Async APIs awaited (cookies, headers, params, searchParams)
- [ ] useFormState → useActionState
- [ ] forwardRef removed where possible
- [ ] Fetch caching explicitly configured
- [ ] Build succeeds
- [ ] Tests pass
- [ ] Manual QA on critical paths
```

### 5. Execute with User Approval

After presenting the plan, ask the user if they want to proceed. Apply changes incrementally:
1. Update dependencies
2. Run codemods
3. Fix remaining issues file by file
4. Verify build and tests after each major change

Always create changes on a new branch: `git checkout -b upgrade/nextjs-{version}`
