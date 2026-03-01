---
description: When the user asks about responsive design, mobile-first layouts, breakpoints, container queries, responsive grids, fluid typography, adaptive components, or making their UI work across screen sizes
---

# Responsive Design Patterns

Modern responsive design goes beyond media queries. This skill covers fluid layouts, container queries, responsive component patterns, and mobile-first architecture.

## Mobile-First Breakpoint System

Always design mobile-first — add complexity as screen grows:

```css
/* Base: mobile (0px+) */
.layout { padding: 1rem; }

/* sm: 640px+ (large phone / small tablet) */
@media (min-width: 40rem) {
  .layout { padding: 1.5rem; }
}

/* md: 768px+ (tablet) */
@media (min-width: 48rem) {
  .layout { padding: 2rem; }
}

/* lg: 1024px+ (laptop) */
@media (min-width: 64rem) {
  .layout { max-width: 80rem; margin: 0 auto; padding: 2rem 3rem; }
}

/* xl: 1280px+ (desktop) */
@media (min-width: 80rem) {
  .layout { padding: 2rem 4rem; }
}
```

### Tailwind Responsive (mobile-first)

```html
<!-- Stack on mobile, side-by-side on md+ -->
<div class="flex flex-col md:flex-row gap-4 md:gap-8">
  <aside class="w-full md:w-64 shrink-0">Sidebar</aside>
  <main class="flex-1 min-w-0">Content</main>
</div>
```

## Fluid Typography

Scale font size smoothly between breakpoints using `clamp()`:

```css
:root {
  /* clamp(min, preferred, max) */
  --text-sm: clamp(0.8rem, 0.17vw + 0.76rem, 0.89rem);
  --text-base: clamp(1rem, 0.34vw + 0.91rem, 1.19rem);
  --text-lg: clamp(1.25rem, 0.61vw + 1.1rem, 1.58rem);
  --text-xl: clamp(1.56rem, 1vw + 1.31rem, 2.11rem);
  --text-2xl: clamp(1.95rem, 1.56vw + 1.56rem, 2.81rem);
  --text-3xl: clamp(2.44rem, 2.38vw + 1.85rem, 3.75rem);
  --text-4xl: clamp(3.05rem, 3.54vw + 2.17rem, 5rem);
}

/* Usage */
h1 { font-size: var(--text-4xl); }
h2 { font-size: var(--text-3xl); }
h3 { font-size: var(--text-2xl); }
p { font-size: var(--text-base); }
```

### Fluid Spacing

Same principle for spacing:

```css
:root {
  --space-section: clamp(3rem, 5vw, 6rem);
  --space-content: clamp(1rem, 3vw, 2rem);
  --space-gutter: clamp(1rem, 2vw, 1.5rem);
}

section { padding-block: var(--space-section); }
.container { padding-inline: var(--space-gutter); }
```

## Container Queries

Style components based on their container size, not viewport:

```css
/* Define a container */
.card-grid {
  container-type: inline-size;
  container-name: card-grid;
}

/* Query the container */
@container card-grid (min-width: 500px) {
  .card {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 1.5rem;
  }
}

@container card-grid (min-width: 800px) {
  .card {
    grid-template-columns: 250px 1fr auto;
  }
}
```

### Tailwind v4 Container Queries

```html
<div class="@container">
  <div class="flex flex-col @md:flex-row @lg:grid @lg:grid-cols-3 gap-4">
    <!-- Responds to parent container width, not viewport -->
  </div>
</div>
```

### Container Query Units

```css
.card {
  /* cqw = 1% of container width */
  font-size: clamp(0.875rem, 2cqw, 1.125rem);
  padding: clamp(0.75rem, 3cqw, 1.5rem);
}
```

## Responsive Layout Patterns

### 1. Auto-Fit Grid (no breakpoints needed)

```css
.auto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  gap: 1.5rem;
}
```

```html
<!-- Tailwind equivalent -->
<div class="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-6">
```

### 2. Sidebar Layout (sticky + scrollable)

```css
.sidebar-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 64rem) {
  .sidebar-layout {
    grid-template-columns: 16rem 1fr;
  }
  .sidebar {
    position: sticky;
    top: 5rem;
    height: fit-content;
    max-height: calc(100vh - 6rem);
    overflow-y: auto;
  }
}
```

### 3. Holy Grail (header, sidebar, main, aside, footer)

```css
.holy-grail {
  display: grid;
  grid-template:
    "header  header  header"  auto
    "sidebar main   aside"   1fr
    "footer  footer  footer"  auto
    / 14rem  1fr     14rem;
  min-height: 100dvh;
}

/* Collapse to single column on mobile */
@media (max-width: 64rem) {
  .holy-grail {
    grid-template:
      "header" auto
      "main"   1fr
      "footer" auto
      / 1fr;
  }
  .sidebar, .aside { display: none; }
}
```

### 4. Responsive Navigation

```html
<!-- Mobile: hamburger, Desktop: horizontal nav -->
<nav class="flex items-center justify-between px-4 py-3">
  <a href="/" class="font-bold text-xl">Logo</a>

  <!-- Desktop nav -->
  <ul class="hidden md:flex items-center gap-6">
    <li><a href="/features" class="text-foreground-muted hover:text-foreground">Features</a></li>
    <li><a href="/pricing" class="text-foreground-muted hover:text-foreground">Pricing</a></li>
    <li><a href="/docs" class="text-foreground-muted hover:text-foreground">Docs</a></li>
  </ul>

  <!-- Mobile menu button -->
  <button class="md:hidden p-2" aria-label="Menu">
    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
    </svg>
  </button>
</nav>
```

### 5. Responsive Table → Cards

```html
<!-- Desktop: table, Mobile: stacked cards -->
<div class="overflow-x-auto">
  <table class="hidden md:table w-full">
    <thead>...</thead>
    <tbody>...</tbody>
  </table>

  <!-- Mobile cards -->
  <div class="md:hidden space-y-4">
    <div class="bg-surface border border-border rounded-xl p-4">
      <div class="flex justify-between">
        <span class="text-foreground-muted text-sm">Name</span>
        <span class="font-medium">Alice</span>
      </div>
      <div class="flex justify-between mt-2">
        <span class="text-foreground-muted text-sm">Status</span>
        <span class="text-green-600">Active</span>
      </div>
    </div>
  </div>
</div>
```

## Responsive Images

```html
<!-- Art direction with <picture> -->
<picture>
  <source media="(min-width: 1024px)" srcset="/hero-wide.avif" type="image/avif" />
  <source media="(min-width: 640px)" srcset="/hero-medium.avif" type="image/avif" />
  <img src="/hero-mobile.avif" alt="Hero" class="w-full h-auto" loading="eager" />
</picture>

<!-- Resolution switching with srcset -->
<img
  srcset="/photo-400w.avif 400w, /photo-800w.avif 800w, /photo-1200w.avif 1200w"
  sizes="(min-width: 1024px) 50vw, 100vw"
  src="/photo-800w.avif"
  alt="Photo"
  class="w-full rounded-xl"
  loading="lazy"
  decoding="async"
/>
```

## Viewport Units

```css
/* dvh = dynamic viewport height (accounts for mobile browser chrome) */
.full-screen {
  min-height: 100dvh;
}

/* svh = smallest viewport height (always visible area) */
.hero {
  height: 100svh;
}

/* lvh = largest viewport height (when browser chrome is hidden) */
.content {
  min-height: 100lvh;
}
```

## Testing Responsive Design

| Tool | Purpose |
|------|---------|
| Chrome DevTools Device Mode | Quick viewport testing |
| `@container` + resize observer | Component-level testing |
| Playwright `page.setViewportSize()` | Automated screenshot tests |
| `prefers-reduced-motion` | Motion sensitivity testing |
| Real devices | Touch, scroll, keyboard behavior |

## Checklist

- [ ] Mobile-first approach — base styles are mobile, complexity added via `min-width`
- [ ] Fluid typography with `clamp()` — no abrupt size jumps
- [ ] Auto-fit grids used where possible (fewer breakpoints)
- [ ] Container queries for reusable components
- [ ] Images use `srcset`/`sizes` for resolution switching
- [ ] `100dvh` used instead of `100vh` for full-height on mobile
- [ ] Navigation pattern works on both mobile and desktop
- [ ] Tables have mobile fallback (cards or horizontal scroll)
- [ ] Touch targets are at least 44×44px on mobile
- [ ] Tested on real devices, not just browser resize
