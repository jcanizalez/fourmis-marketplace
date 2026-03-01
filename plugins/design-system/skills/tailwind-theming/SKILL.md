---
description: When the user asks about Tailwind CSS theming, custom Tailwind themes, Tailwind v4 configuration, CSS-first Tailwind config, extending Tailwind, creating a Tailwind design system, or dark mode with Tailwind
---

# Tailwind CSS Theming

Build custom Tailwind themes using CSS-first configuration (v4) and JavaScript config (v3). Covers theme extension, custom utilities, dark mode, and multi-brand theming.

## Tailwind v4 — CSS-First Configuration

Tailwind v4 uses `@theme` in CSS instead of `tailwind.config.js`:

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* Colors — brand */
  --color-brand-50: #eff6ff;
  --color-brand-100: #dbeafe;
  --color-brand-200: #bfdbfe;
  --color-brand-300: #93c5fd;
  --color-brand-400: #60a5fa;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;
  --color-brand-800: #1e40af;
  --color-brand-900: #1e3a8a;

  /* Colors — accent */
  --color-accent-50: #faf5ff;
  --color-accent-500: #a855f7;
  --color-accent-600: #9333ea;
  --color-accent-700: #7e22ce;

  /* Colors — surface (semantic) */
  --color-surface: #ffffff;
  --color-surface-alt: #f9fafb;
  --color-surface-elevated: #ffffff;

  /* Colors — text (semantic) */
  --color-foreground: #111827;
  --color-foreground-muted: #6b7280;
  --color-foreground-subtle: #9ca3af;

  /* Colors — border */
  --color-border: #e5e7eb;
  --color-ring: #3b82f6;

  /* Spacing overrides */
  --spacing: 0.25rem; /* 4px base unit */

  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;

  /* Shadows */
  --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06);
  --shadow-dropdown: 0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-modal: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.05);

  /* Typography */
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Font sizes — custom scale */
  --text-2xs: 0.625rem;
  --text-2xs--line-height: 1rem;

  /* Animations */
  --animate-slide-in: slide-in 0.25s ease-out;
  --animate-fade-in: fade-in 0.2s ease-out;

  /* Breakpoints (default is fine, customize if needed) */
  /* --breakpoint-sm: 40rem; */
  /* --breakpoint-md: 48rem; */
  /* --breakpoint-lg: 64rem; */
  /* --breakpoint-xl: 80rem; */
  /* --breakpoint-2xl: 96rem; */
}

@keyframes slide-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### Dark Mode (v4)

```css
/* Option 1: Media query (automatic) */
@media (prefers-color-scheme: dark) {
  @theme {
    --color-surface: #0f172a;
    --color-surface-alt: #1e293b;
    --color-surface-elevated: #1e293b;
    --color-foreground: #f1f5f9;
    --color-foreground-muted: #94a3b8;
    --color-foreground-subtle: #64748b;
    --color-border: #334155;
    --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.2);
  }
}

/* Option 2: Class-based toggle (manual control) */
.dark {
  --color-surface: #0f172a;
  --color-surface-alt: #1e293b;
  --color-foreground: #f1f5f9;
  --color-foreground-muted: #94a3b8;
  --color-border: #334155;
}
```

### Using Theme Tokens in Components

```tsx
// These "just work" as Tailwind classes
<div className="bg-surface text-foreground border-border rounded-xl shadow-card">
  <h2 className="text-brand-600 font-semibold">Title</h2>
  <p className="text-foreground-muted">Description</p>
  <button className="bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2">
    Action
  </button>
</div>
```

## Tailwind v3 — JavaScript Configuration

```javascript
// tailwind.config.js (v3)
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          alt: 'var(--color-surface-alt)',
          elevated: 'var(--color-surface-elevated)',
        },
        foreground: {
          DEFAULT: 'var(--color-foreground)',
          muted: 'var(--color-foreground-muted)',
          subtle: 'var(--color-foreground-subtle)',
        },
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
      },
      borderRadius: {
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        dropdown: '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
      },
      animation: {
        'slide-in': 'slide-in 0.25s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        'slide-in': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
```

## Multi-Brand Theming

Support multiple brands/clients with CSS custom properties:

```css
/* Base theme (shared structure) */
@theme {
  --color-brand-500: var(--theme-brand-500, #3b82f6);
  --color-brand-600: var(--theme-brand-600, #2563eb);
  --color-surface: var(--theme-surface, #ffffff);
  --color-foreground: var(--theme-foreground, #111827);
  --radius-lg: var(--theme-radius, 0.5rem);
  --font-sans: var(--theme-font, "Inter", system-ui, sans-serif);
}

/* Brand A — blue, rounded */
[data-theme="brand-a"] {
  --theme-brand-500: #3b82f6;
  --theme-brand-600: #2563eb;
  --theme-radius: 0.75rem;
  --theme-font: "Inter", system-ui, sans-serif;
}

/* Brand B — green, sharp corners */
[data-theme="brand-b"] {
  --theme-brand-500: #22c55e;
  --theme-brand-600: #16a34a;
  --theme-radius: 0.25rem;
  --theme-font: "DM Sans", system-ui, sans-serif;
}
```

### Theme Switcher (React)

```tsx
function ThemeSwitcher() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
```

### Persist Theme Preference

```tsx
function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return (localStorage.getItem('theme') as 'light' | 'dark')
      ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  return { theme, setTheme, toggle: () => setTheme(t => t === 'light' ? 'dark' : 'light') };
}
```

## Tailwind Plugin — Custom Utilities

```javascript
// tailwind-plugins/prose.js
import plugin from 'tailwindcss/plugin';

export const prosePlugin = plugin(({ addComponents, theme }) => {
  addComponents({
    '.prose-custom': {
      maxWidth: '65ch',
      color: theme('colors.foreground.DEFAULT'),
      '& h1': { fontSize: theme('fontSize.3xl'), fontWeight: '700', marginBottom: theme('spacing.4') },
      '& h2': { fontSize: theme('fontSize.2xl'), fontWeight: '600', marginBottom: theme('spacing.3') },
      '& p': { marginBottom: theme('spacing.4'), lineHeight: '1.75' },
      '& a': { color: theme('colors.brand.600'), textDecoration: 'underline' },
      '& code': {
        backgroundColor: theme('colors.surface.alt'),
        padding: '0.125rem 0.375rem',
        borderRadius: theme('borderRadius.md'),
        fontSize: '0.875em',
      },
    },
  });
});
```

## cn() Utility — Conditional Classes

Every Tailwind project needs a class merge utility:

```typescript
// lib/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage
<div className={cn(
  "px-4 py-2 rounded-lg",
  isActive && "bg-brand-600 text-white",
  isDisabled && "opacity-50 cursor-not-allowed",
  className  // allow overrides from props
)} />
```

## Checklist

- [ ] Theme uses `@theme` (v4) or `tailwind.config.js` (v3)
- [ ] Semantic color tokens (surface, foreground, border) — not raw colors in components
- [ ] Dark mode implemented via class toggle or media query
- [ ] Theme preference persisted in localStorage
- [ ] `cn()` utility (clsx + tailwind-merge) available project-wide
- [ ] Custom shadows, radius, and spacing defined in theme
- [ ] Font families loaded and configured (Inter, JetBrains Mono, etc.)
- [ ] Animations defined in theme, not inline
- [ ] Multi-brand support uses CSS custom properties for easy swapping
