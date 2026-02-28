---
name: perf
description: Analyze your project for performance issues — Core Web Vitals risks, render-blocking resources, heavy dependencies, missing optimizations
allowed-tools: Read, Glob, Grep, Bash
---

# /perf — Performance Audit

Scan your project's code for common performance issues and optimization opportunities.

## Usage

```
/perf                           # Full project performance audit
/perf src/app/page.tsx          # Audit a specific page
/perf --focus cwv               # Focus on Core Web Vitals risks only
/perf --focus bundle            # Focus on bundle size only
/perf --focus images            # Focus on image optimization only
```

## Audit Workflow

1. **Detect project type**: Read `package.json`, `next.config.*`, framework configs
2. **Scan code** for performance patterns and anti-patterns:

### Core Web Vitals Risks
- **LCP**: Missing `fetchpriority="high"` on hero images, no preload hints, render-blocking CSS/JS, unoptimized fonts
- **CLS**: Images without `width`/`height`, dynamically injected content without reserved space, font-display not set
- **INP**: Long synchronous operations in event handlers, missing debounce on frequent events, no web workers for heavy computation

### Bundle & Loading
- Heavy dependencies that have lighter alternatives (moment→dayjs, lodash→native, axios→fetch)
- Barrel imports pulling in unused exports
- Missing code splitting / lazy loading on heavy components
- Missing `defer` or `async` on scripts
- Large CSS files not code-split

### Image Issues
- Non-WebP/AVIF formats for photographs
- Missing `loading="lazy"` on below-fold images
- Missing responsive `srcset` + `sizes`
- Unoptimized SVGs (no SVGO)
- Large images served at full resolution

### Caching
- Missing or incorrect `Cache-Control` headers
- No content hashing in output filenames
- Static assets not using long-term caching

3. **Report findings** by priority:

```
## Performance Audit Report

### Critical (blocking performance)
| # | Issue | File | Impact | Fix |
|---|-------|------|--------|-----|
| 1 | Hero image not preloaded | app/page.tsx | LCP +500ms | Add <link rel="preload"> |
| 2 | moment.js (72KB) imported | lib/utils.ts | Bundle +72KB | Switch to dayjs (2KB) |

### Important (significant improvement)
| # | Issue | File | Impact | Fix |
|---|-------|------|--------|-----|
| 3 | Images missing width/height | 8 files | CLS risk | Add dimensions |
| 4 | No lazy loading on images | components/ | LCP/bandwidth | Add loading="lazy" |

### Suggestions (nice to have)
| # | Issue | File | Fix |
|---|-------|------|-----|
| 5 | No content-visibility on long lists | feed.tsx | Add content-visibility: auto |

### Score: 65/100 → Estimated 85/100 after fixes
```

## What Gets Checked

| Category | Checks |
|----------|--------|
| **LCP** | Image preloading, font loading, render-blocking resources, TTFB hints |
| **CLS** | Image dimensions, skeleton loaders, font-display, dynamic content |
| **INP** | Event handler complexity, debouncing, web workers, main thread blocking |
| **Bundle** | Dependency sizes, tree shaking, code splitting, compression |
| **Images** | Format, lazy loading, responsive sizes, optimization |
| **Caching** | Cache headers, content hashing, CDN usage, service worker |
| **CSS** | Critical CSS, unused CSS, containment, will-change overuse |
