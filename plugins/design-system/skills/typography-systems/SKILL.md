---
description: When the user asks about typography, font systems, type scales, line height, letter spacing, font loading, web fonts, text styling, prose styling, or building a typographic hierarchy
---

# Typography Systems

Typography is the foundation of UI readability. This skill covers type scales, font loading, vertical rhythm, prose styling, and responsive typography.

## Type Scale

### Modular Scale (1.25 ratio — Major Third)

```css
:root {
  --text-xs: 0.75rem;      /* 12px */
  --text-sm: 0.875rem;     /* 14px */
  --text-base: 1rem;       /* 16px */
  --text-lg: 1.125rem;     /* 18px */
  --text-xl: 1.25rem;      /* 20px */
  --text-2xl: 1.5rem;      /* 24px */
  --text-3xl: 1.875rem;    /* 30px */
  --text-4xl: 2.25rem;     /* 36px */
  --text-5xl: 3rem;        /* 48px */
  --text-6xl: 3.75rem;     /* 60px */

  /* Line heights — tighter for headings, looser for body */
  --leading-tight: 1.15;
  --leading-snug: 1.3;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  --leading-loose: 1.75;

  /* Letter spacing */
  --tracking-tight: -0.025em;
  --tracking-normal: 0;
  --tracking-wide: 0.025em;
  --tracking-wider: 0.05em;
  --tracking-widest: 0.1em;

  /* Font weights */
  --font-regular: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

### Fluid Type Scale

```css
:root {
  /* Fluid scale that adapts between 320px and 1280px viewport */
  --text-sm: clamp(0.8rem, 0.17vw + 0.76rem, 0.875rem);
  --text-base: clamp(1rem, 0.21vw + 0.95rem, 1.125rem);
  --text-lg: clamp(1.125rem, 0.35vw + 1.04rem, 1.35rem);
  --text-xl: clamp(1.25rem, 0.56vw + 1.11rem, 1.65rem);
  --text-2xl: clamp(1.5rem, 0.83vw + 1.29rem, 2rem);
  --text-3xl: clamp(1.875rem, 1.39vw + 1.53rem, 2.75rem);
  --text-4xl: clamp(2.25rem, 2.08vw + 1.73rem, 3.5rem);
  --text-5xl: clamp(3rem, 3.33vw + 2.17rem, 5rem);
}
```

## Text Styles (Semantic)

Define composite text styles that combine size, weight, line-height, and tracking:

```css
/* Headings */
.heading-1 {
  font-size: var(--text-5xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
}

.heading-2 {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
}

.heading-3 {
  font-size: var(--text-3xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-snug);
  letter-spacing: var(--tracking-tight);
}

.heading-4 {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-snug);
}

.heading-5 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-snug);
}

.heading-6 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  line-height: var(--leading-normal);
}

/* Body text */
.body-lg {
  font-size: var(--text-lg);
  line-height: var(--leading-relaxed);
}

.body {
  font-size: var(--text-base);
  line-height: var(--leading-normal);
}

.body-sm {
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
}

/* UI text */
.label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  line-height: var(--leading-normal);
}

.caption {
  font-size: var(--text-xs);
  line-height: var(--leading-normal);
  color: var(--text-secondary);
}

.overline {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  line-height: var(--leading-normal);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
}
```

## Font Loading Strategy

### Optimal Font Loading (no FOUT/FOIT)

```html
<!-- Preload critical fonts in <head> -->
<link rel="preload" href="/fonts/inter-latin-var.woff2" as="font" type="font/woff2" crossorigin />
```

```css
/* @font-face with font-display: swap */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-latin-var.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+2000-206F;
}

@font-face {
  font-family: 'JetBrains Mono';
  src: url('/fonts/jetbrains-mono-var.woff2') format('woff2');
  font-weight: 100 800;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF;
}
```

### Variable Fonts

```css
/* Variable font with custom axis */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Variable.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: swap;
}

/* Use font-variation-settings for fine control */
.fine-weight {
  font-variation-settings: 'wght' 450; /* Between regular and medium */
}
```

### Next.js Font Loading

```typescript
// app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

### Self-Hosted Font Stack

```css
/* System font stack (zero network requests) */
:root {
  --font-system: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";

  --font-mono-system: ui-monospace, "Cascadia Code", "Source Code Pro",
    Menlo, Consolas, "DejaVu Sans Mono", monospace;
}
```

## Prose / Long-Form Typography

```css
.prose {
  max-width: 65ch;  /* Optimal line length */
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--text-primary);
}

/* Headings */
.prose h1 { font-size: var(--text-4xl); font-weight: var(--font-bold); margin-top: 2.5em; margin-bottom: 0.5em; line-height: var(--leading-tight); }
.prose h2 { font-size: var(--text-3xl); font-weight: var(--font-semibold); margin-top: 2em; margin-bottom: 0.5em; line-height: var(--leading-tight); }
.prose h3 { font-size: var(--text-2xl); font-weight: var(--font-semibold); margin-top: 1.5em; margin-bottom: 0.5em; line-height: var(--leading-snug); }

/* Paragraphs */
.prose p { margin-bottom: 1.25em; }
.prose p + p { margin-top: 0; }

/* Lists */
.prose ul, .prose ol { padding-left: 1.5em; margin-bottom: 1.25em; }
.prose li { margin-bottom: 0.375em; }
.prose li::marker { color: var(--text-tertiary); }

/* Links */
.prose a {
  color: var(--text-link);
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-thickness: 1px;
}
.prose a:hover {
  text-decoration-thickness: 2px;
}

/* Code */
.prose code {
  font-family: var(--font-mono);
  font-size: 0.875em;
  background: var(--surface-secondary);
  padding: 0.125em 0.375em;
  border-radius: var(--radius-sm);
}

.prose pre {
  background: var(--color-gray-900);
  color: var(--color-gray-100);
  padding: 1.25em 1.5em;
  border-radius: var(--radius-lg);
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 0.875em;
  line-height: 1.7;
}

.prose pre code {
  background: none;
  padding: 0;
  font-size: inherit;
}

/* Blockquotes */
.prose blockquote {
  border-left: 3px solid var(--border-strong);
  padding-left: 1em;
  margin: 1.5em 0;
  color: var(--text-secondary);
  font-style: italic;
}

/* Tables */
.prose table { width: 100%; border-collapse: collapse; margin: 1.5em 0; }
.prose th { text-align: left; font-weight: var(--font-semibold); padding: 0.5em 1em; border-bottom: 2px solid var(--border-default); }
.prose td { padding: 0.5em 1em; border-bottom: 1px solid var(--border-default); }

/* Images */
.prose img { border-radius: var(--radius-lg); margin: 1.5em 0; }

/* Horizontal rule */
.prose hr { border: none; border-top: 1px solid var(--border-default); margin: 2em 0; }
```

## Recommended Font Pairings

| Heading Font | Body Font | Style |
|-------------|-----------|-------|
| Inter | Inter | Clean, neutral (SaaS, dashboards) |
| Plus Jakarta Sans | Inter | Modern, friendly (marketing) |
| DM Serif Display | DM Sans | Editorial, elegant (blogs, magazines) |
| Space Grotesk | Inter | Technical, geometric (dev tools) |
| Fraunces | Source Sans 3 | Warm, distinctive (creative) |
| Geist | Geist Mono | Vercel-style, sharp (dev tools) |

## Text Rendering

```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* Prevent text overflow */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Balanced headings (prevent orphans) */
h1, h2, h3 {
  text-wrap: balance;
}

/* Pretty paragraphs (better line breaking) */
p {
  text-wrap: pretty;
}
```

## Checklist

- [ ] Type scale defined with consistent ratios (1.25 or 1.2)
- [ ] Fluid typography using `clamp()` for key sizes
- [ ] Line-height: tight for headings (1.15-1.3), relaxed for body (1.5-1.75)
- [ ] Font loading uses `font-display: swap` and `preload`
- [ ] Variable fonts used where available (fewer requests)
- [ ] Max line length: 65ch for prose content
- [ ] `text-wrap: balance` on headings, `pretty` on paragraphs
- [ ] `-webkit-font-smoothing: antialiased` set globally
- [ ] Font pairings use max 2 font families
- [ ] Prose styles handle all markdown elements (headings, lists, code, tables, quotes)
