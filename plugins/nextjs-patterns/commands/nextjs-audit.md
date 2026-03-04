---
name: nextjs-audit
description: Audit a Next.js project for performance, caching, and best practices
arguments:
  - name: focus
    description: "Focus area: performance, caching, security, or all (default: all)"
    required: false
---

# Next.js Project Audit

Perform a comprehensive audit of this Next.js project. Analyze the codebase for performance issues, caching misconfigurations, security gaps, and deviations from best practices.

## Audit Steps

### 1. Project Structure Analysis

Scan the project structure to understand the architecture:

```bash
# Find the app directory and list routes
find . -path ./node_modules -prune -o -name "page.tsx" -print -o -name "page.jsx" -print | head -50
find . -path ./node_modules -prune -o -name "layout.tsx" -print -o -name "layout.jsx" -print | head -20
find . -path ./node_modules -prune -o -name "middleware.ts" -print -o -name "middleware.tsx" -print
```

Check for `next.config.ts` or `next.config.js` and review its configuration.

### 2. Performance Audit

Check for these common performance issues:

- **Image optimization**: Search for `<img>` tags that should use `next/image`
- **Font optimization**: Check if fonts are loaded via `next/font` or via `<link>` tags
- **Bundle size**: Look for large client components (`"use client"` with heavy imports)
- **Dynamic imports**: Check if heavy components use `next/dynamic` or `React.lazy`
- **LCP priority**: Verify above-the-fold images have `priority` prop
- **Sizes attribute**: Check that `fill` images have `sizes` prop

```bash
# Find img tags (should be next/image)
grep -rn '<img ' --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" -l | grep -v node_modules | grep -v .next

# Find "use client" components
grep -rn '"use client"' --include="*.tsx" --include="*.jsx" -l | grep -v node_modules

# Check for dynamic imports
grep -rn 'next/dynamic\|React.lazy' --include="*.tsx" --include="*.jsx" --include="*.ts" -l | grep -v node_modules
```

### 3. Caching Audit

Review caching configuration across the four cache layers:

- **Data Cache**: Check fetch calls for `cache` and `next.revalidate` options
- **Route Cache**: Look for `export const dynamic` and `export const revalidate` in route segments
- **Revalidation**: Check usage of `revalidatePath` and `revalidateTag`
- **Request Memoization**: Look for `React.cache()` usage for non-fetch data

```bash
# Find fetch calls and their cache config
grep -rn "fetch(" --include="*.tsx" --include="*.ts" -A 3 | grep -v node_modules | grep -v .next

# Find route segment config exports
grep -rn "export const dynamic\|export const revalidate" --include="*.tsx" --include="*.ts" | grep -v node_modules

# Find revalidation calls
grep -rn "revalidatePath\|revalidateTag" --include="*.tsx" --include="*.ts" | grep -v node_modules
```

### 4. Security Audit

Check for security best practices:

- **Security headers**: Verify `next.config` has security headers (HSTS, CSP, X-Frame-Options)
- **Environment variables**: Check for `NEXT_PUBLIC_` prefix usage — ensure secrets are NOT exposed
- **Server Actions**: Verify `"use server"` actions validate input and check auth
- **API routes**: Check for authentication/authorization in route handlers

```bash
# Check for potential secret exposure
grep -rn "NEXT_PUBLIC_.*SECRET\|NEXT_PUBLIC_.*KEY\|NEXT_PUBLIC_.*PASSWORD" --include="*.ts" --include="*.tsx" --include="*.env*" | grep -v node_modules

# Find Server Actions
grep -rn '"use server"' --include="*.tsx" --include="*.ts" -l | grep -v node_modules
```

### 5. Best Practices Check

- **Loading states**: Check for `loading.tsx` files in route segments
- **Error boundaries**: Check for `error.tsx` files
- **Not found pages**: Check for `not-found.tsx`
- **Metadata**: Verify pages export `metadata` or `generateMetadata`
- **Suspense boundaries**: Check for `<Suspense>` usage around async components

### 6. Generate Report

After analyzing, produce a structured report:

```markdown
## Next.js Audit Report

### Summary
- Overall Score: X/10
- Critical Issues: N
- Warnings: N
- Suggestions: N

### Critical Issues
(issues that affect performance, security, or correctness)

### Warnings
(deviations from best practices)

### Suggestions
(optional improvements)

### Performance Metrics
- Client components: N files
- Server components: N files
- Dynamic routes: N
- Static routes: N
- Images using next/image: N/M

### Action Items
1. [Priority] Description — file:line
```

Prioritize findings by impact: security > performance > best practices > style.
