---
name: responsive
description: Audit and fix responsive design issues — checks breakpoints, fluid sizing, touch targets, container queries, and mobile-first patterns in your components
allowed-tools: Read, Glob, Grep
---

# /responsive — Responsive Design Auditor

Audit your UI code for responsive design issues and generate fixes.

## Usage

```
/responsive                         # Audit all components for responsive issues
/responsive src/components/         # Audit specific directory
/responsive --fix                   # Auto-fix common responsive issues
/responsive --report                # Generate full responsive audit report
```

## Workflow

1. **Scan components**: Find all TSX/JSX/Vue/HTML files
2. **Check breakpoint usage**: Are breakpoints consistent and mobile-first?
3. **Check fluid values**: Are there hardcoded px values that should use clamp()?
4. **Check touch targets**: Are interactive elements at least 44×44px on mobile?
5. **Check layout patterns**: Are grids responsive? Do tables have mobile fallbacks?
6. **Check viewport units**: Using `dvh` instead of `vh`? `100%` instead of `100vw`?
7. **Report and fix**: Show issues with code suggestions

## What Gets Checked

| Category | Checks |
|----------|--------|
| **Breakpoints** | Mobile-first (`min-width`), consistent breakpoint values, no orphaned breakpoints |
| **Layout** | Flex wrapping, grid auto-fit, no fixed widths on mobile |
| **Typography** | Fluid `clamp()` for heading sizes, readable line length (≤ 75ch) |
| **Images** | `srcset`/`sizes` present, `loading="lazy"`, `width`/`height` set |
| **Touch** | Buttons/links ≥ 44×44px, adequate tap spacing |
| **Overflow** | No horizontal scroll, `overflow-x: hidden` on body |
| **Viewport** | `dvh` over `vh`, no `100vw` (scrollbar issue) |
| **Container Queries** | Reusable components using `@container` where appropriate |

## Output

```
## Responsive Audit — src/components/

### Score: 78/100

### Issues (12)

#### Critical (2)
1. **Fixed width on mobile** — `Dashboard.tsx:45`
   `width: 800px` breaks on viewports < 800px
   → Fix: `max-width: 800px; width: 100%`

2. **No mobile layout** — `DataTable.tsx`
   Table has no responsive fallback below `md` breakpoint
   → Fix: Add card layout for mobile (see responsive-patterns skill)

#### Warnings (5)
3. **Hardcoded font-size** — `Hero.tsx:12`
   `font-size: 3.5rem` doesn't scale on mobile
   → Fix: `font-size: clamp(2rem, 5vw, 3.5rem)`

4. **Small touch target** — `IconButton.tsx:8`
   Button is 32×32px (below 44×44px minimum)
   → Fix: `min-width: 44px; min-height: 44px`

5. **Using 100vh** — `FullScreen.tsx:3`
   `height: 100vh` causes issues on mobile Safari
   → Fix: `min-height: 100dvh`

#### Info (5)
6-10. Minor suggestions...

### Breakpoint Usage
| Breakpoint | Occurrences | Mobile-First |
|------------|-------------|--------------|
| sm (640px) | 23 | ✅ min-width |
| md (768px) | 45 | ✅ min-width |
| lg (1024px) | 31 | ✅ min-width |
| xl (1280px) | 12 | ✅ min-width |
| 600px | 3 | ❌ max-width (non-standard) |
```

## Important

- Mobile-first is enforced — `max-width` queries are flagged as warnings
- Touch target minimum follows WCAG 2.2 Target Size criterion (44×44px)
- `100vw` is flagged because it includes scrollbar width on desktop
- Container queries are suggested for components reused in different layouts
- Fluid typography suggestions use the project's existing type scale
