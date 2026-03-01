---
description: When the user asks about design tokens, CSS custom properties, theme variables, color scales, spacing scales, shadow systems, or building a design token architecture for their project
---

# Design Tokens

Design tokens are the atomic values of a design system — colors, spacing, typography, shadows, borders, and motion. They create a single source of truth that keeps UI consistent across components, themes, and platforms.

## Token Architecture

Organize tokens in three tiers:

```
Global Tokens → Semantic Tokens → Component Tokens
(raw values)    (meaning)         (specific usage)
```

### Tier 1 — Global (Primitive) Tokens

Raw values with no semantic meaning:

```css
:root {
  /* Colors — neutral scale */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
  --color-gray-950: #030712;

  /* Colors — brand scale */
  --color-blue-50: #eff6ff;
  --color-blue-100: #dbeafe;
  --color-blue-200: #bfdbfe;
  --color-blue-300: #93c5fd;
  --color-blue-400: #60a5fa;
  --color-blue-500: #3b82f6;
  --color-blue-600: #2563eb;
  --color-blue-700: #1d4ed8;
  --color-blue-800: #1e40af;
  --color-blue-900: #1e3a8a;

  /* Colors — semantic raw */
  --color-red-500: #ef4444;
  --color-green-500: #22c55e;
  --color-amber-500: #f59e0b;

  /* Spacing scale (4px base) */
  --space-0: 0;
  --space-0-5: 0.125rem;  /* 2px */
  --space-1: 0.25rem;     /* 4px */
  --space-1-5: 0.375rem;  /* 6px */
  --space-2: 0.5rem;      /* 8px */
  --space-3: 0.75rem;     /* 12px */
  --space-4: 1rem;        /* 16px */
  --space-5: 1.25rem;     /* 20px */
  --space-6: 1.5rem;      /* 24px */
  --space-8: 2rem;        /* 32px */
  --space-10: 2.5rem;     /* 40px */
  --space-12: 3rem;       /* 48px */
  --space-16: 4rem;       /* 64px */
  --space-20: 5rem;       /* 80px */
  --space-24: 6rem;       /* 96px */

  /* Border radius */
  --radius-none: 0;
  --radius-sm: 0.25rem;   /* 4px */
  --radius-md: 0.375rem;  /* 6px */
  --radius-lg: 0.5rem;    /* 8px */
  --radius-xl: 0.75rem;   /* 12px */
  --radius-2xl: 1rem;     /* 16px */
  --radius-full: 9999px;

  /* Shadows */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

  /* Z-index scale */
  --z-dropdown: 1000;
  --z-sticky: 1100;
  --z-overlay: 1200;
  --z-modal: 1300;
  --z-popover: 1400;
  --z-toast: 1500;
  --z-tooltip: 1600;

  /* Transitions */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 350ms;
  --easing-default: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-in: cubic-bezier(0.4, 0, 1, 1);
  --easing-out: cubic-bezier(0, 0, 0.2, 1);
  --easing-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Tier 2 — Semantic Tokens

Map global tokens to meaningful names:

```css
:root {
  /* Surface colors */
  --surface-primary: var(--color-white, #ffffff);
  --surface-secondary: var(--color-gray-50);
  --surface-tertiary: var(--color-gray-100);
  --surface-elevated: var(--color-white, #ffffff);
  --surface-overlay: rgb(0 0 0 / 0.5);

  /* Text colors */
  --text-primary: var(--color-gray-900);
  --text-secondary: var(--color-gray-600);
  --text-tertiary: var(--color-gray-400);
  --text-inverse: var(--color-white, #ffffff);
  --text-link: var(--color-blue-600);
  --text-link-hover: var(--color-blue-700);

  /* Border colors */
  --border-default: var(--color-gray-200);
  --border-strong: var(--color-gray-300);
  --border-focus: var(--color-blue-500);

  /* Status colors */
  --status-success: var(--color-green-500);
  --status-warning: var(--color-amber-500);
  --status-error: var(--color-red-500);
  --status-info: var(--color-blue-500);

  /* Interactive */
  --interactive-primary: var(--color-blue-600);
  --interactive-primary-hover: var(--color-blue-700);
  --interactive-primary-active: var(--color-blue-800);
  --interactive-secondary: var(--color-gray-100);
  --interactive-secondary-hover: var(--color-gray-200);
  --interactive-destructive: var(--color-red-500);
  --interactive-destructive-hover: var(--color-red-600);
}
```

### Tier 3 — Component Tokens

Per-component overrides:

```css
:root {
  /* Button */
  --button-padding-x: var(--space-4);
  --button-padding-y: var(--space-2);
  --button-radius: var(--radius-lg);
  --button-font-weight: 600;
  --button-sm-padding-x: var(--space-3);
  --button-sm-padding-y: var(--space-1-5);
  --button-lg-padding-x: var(--space-6);
  --button-lg-padding-y: var(--space-3);

  /* Input */
  --input-padding-x: var(--space-3);
  --input-padding-y: var(--space-2);
  --input-radius: var(--radius-lg);
  --input-border: var(--border-default);
  --input-border-focus: var(--border-focus);
  --input-ring: 0 0 0 3px rgb(59 130 246 / 0.15);

  /* Card */
  --card-padding: var(--space-6);
  --card-radius: var(--radius-xl);
  --card-shadow: var(--shadow-sm);
  --card-border: var(--border-default);
}
```

## Dark Mode with Semantic Tokens

The power of semantic tokens — dark mode is just a token remap:

```css
@media (prefers-color-scheme: dark) {
  :root {
    /* Surfaces flip */
    --surface-primary: var(--color-gray-900);
    --surface-secondary: var(--color-gray-800);
    --surface-tertiary: var(--color-gray-700);
    --surface-elevated: var(--color-gray-800);

    /* Text flips */
    --text-primary: var(--color-gray-50);
    --text-secondary: var(--color-gray-400);
    --text-tertiary: var(--color-gray-500);

    /* Borders adjust */
    --border-default: var(--color-gray-700);
    --border-strong: var(--color-gray-600);

    /* Shadows darken */
    --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.3);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4);
  }
}

/* Class-based toggle (preferred for manual control) */
.dark {
  --surface-primary: var(--color-gray-900);
  --surface-secondary: var(--color-gray-800);
  --text-primary: var(--color-gray-50);
  --text-secondary: var(--color-gray-400);
  --border-default: var(--color-gray-700);
}
```

## Generating Color Scales

### From a single brand color, generate a full scale:

```typescript
import { oklch } from 'culori';

function generateScale(baseHex: string): Record<string, string> {
  const base = oklch(baseHex);
  const lightnesses = {
    50: 0.97, 100: 0.93, 200: 0.87, 300: 0.78,
    400: 0.67, 500: 0.55, 600: 0.48, 700: 0.40,
    800: 0.33, 900: 0.27, 950: 0.20
  };

  const scale: Record<string, string> = {};
  for (const [step, l] of Object.entries(lightnesses)) {
    scale[step] = formatHex({ ...base, l });
  }
  return scale;
}
```

### P3 wide-gamut colors (modern displays):

```css
:root {
  --color-brand-500: #3b82f6;
}

@supports (color: color(display-p3 1 1 1)) {
  :root {
    --color-brand-500: color(display-p3 0.231 0.51 0.965);
  }
}
```

## Token File Formats

### JSON (for tooling and multi-platform):

```json
{
  "color": {
    "brand": {
      "primary": { "$value": "#3b82f6", "$type": "color" },
      "secondary": { "$value": "#8b5cf6", "$type": "color" }
    },
    "neutral": {
      "50": { "$value": "#f9fafb", "$type": "color" },
      "900": { "$value": "#111827", "$type": "color" }
    }
  },
  "space": {
    "1": { "$value": "0.25rem", "$type": "dimension" },
    "2": { "$value": "0.5rem", "$type": "dimension" },
    "4": { "$value": "1rem", "$type": "dimension" }
  }
}
```

This follows the [W3C Design Tokens Format](https://design-tokens.github.io/community-group/format/) specification.

### TypeScript (type-safe tokens):

```typescript
export const tokens = {
  color: {
    brand: { primary: '#3b82f6', secondary: '#8b5cf6' },
    neutral: { 50: '#f9fafb', 900: '#111827' },
  },
  space: { 1: '0.25rem', 2: '0.5rem', 4: '1rem' },
  radius: { sm: '0.25rem', md: '0.375rem', lg: '0.5rem' },
} as const;

export type ColorToken = keyof typeof tokens.color.brand;
export type SpaceToken = keyof typeof tokens.space;
```

## Checklist

- [ ] All colors defined as global primitives with numeric scales
- [ ] Semantic tokens map meaning, not raw values
- [ ] Dark mode achieved by remapping semantic tokens only
- [ ] Spacing uses consistent 4px base unit
- [ ] Shadow scale progresses from subtle to dramatic
- [ ] Z-index uses named scale (no magic numbers)
- [ ] Tokens exported in both CSS and JS/TS
- [ ] Component tokens reference semantic tokens, not globals
- [ ] Wide-gamut P3 colors provided as progressive enhancement
