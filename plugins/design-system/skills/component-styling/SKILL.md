---
description: When the user asks about component styling architecture, CSS architecture, styling methodology, CSS-in-JS vs Tailwind, BEM, CSS modules, component variants, compound components, or organizing styles in a design system
---

# Component Styling Architecture

How to structure styles for scalable UI component libraries. Covers styling methodologies, variant patterns, compound components, and the styling spectrum from CSS Modules to Tailwind.

## Styling Methodology Comparison

| Approach | Best For | Trade-offs |
|----------|----------|------------|
| **Tailwind CSS** | Rapid prototyping, utility-first teams | Verbose JSX, learning curve |
| **CSS Modules** | Scoped styles, SSR, no runtime | File overhead per component |
| **Vanilla Extract** | Type-safe CSS, zero runtime | Build step, TS-only |
| **CSS-in-JS (styled)** | Dynamic theming, component libraries | Runtime cost, bundle size |
| **Plain CSS + BEM** | Simple projects, legacy codebases | Global scope, naming discipline |

**Recommendation**: Tailwind CSS for applications, CSS Modules or Vanilla Extract for shared component libraries.

## Component Variant Pattern (CVA)

Class Variance Authority (CVA) — the standard for component variants:

```typescript
// components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  // Base styles (always applied)
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
        secondary: 'bg-surface-alt text-foreground hover:bg-gray-200 dark:hover:bg-gray-700',
        outline: 'border border-border bg-transparent hover:bg-surface-alt',
        ghost: 'hover:bg-surface-alt',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        link: 'text-brand-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

// Usage
<Button variant="primary" size="lg">Save</Button>
<Button variant="outline">Cancel</Button>
<Button variant="destructive" size="sm">Delete</Button>
<Button variant="ghost" size="icon"><Icon /></Button>
```

## Compound Component Pattern

Components that share implicit state:

```tsx
// components/ui/card.tsx
import { cn } from '@/lib/cn';

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface shadow-card',
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col gap-1.5 p-6 pb-0', className)} {...props} />
  );
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-semibold leading-snug', className)} {...props} />
  );
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-foreground-muted', className)} {...props} />
  );
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6', className)} {...props} />
  );
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center gap-2 p-6 pt-0', className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };

// Usage
<Card>
  <CardHeader>
    <CardTitle>Notifications</CardTitle>
    <CardDescription>Manage your notification preferences.</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Content here</p>
  </CardContent>
  <CardFooter>
    <Button variant="outline">Cancel</Button>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

## Input Component with States

```tsx
// components/ui/input.tsx
import { cn } from '@/lib/cn';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export function Input({ className, label, error, hint, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'h-10 w-full rounded-lg border bg-surface px-3 text-sm',
          'placeholder:text-foreground-subtle',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-red-500 focus:ring-red-500/20'
            : 'border-border focus:border-brand-500',
          className
        )}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-sm text-foreground-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
```

## Badge Component

```tsx
// components/ui/badge.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
        success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        outline: 'border border-border text-foreground-muted',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-sm',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}
```

## CSS Modules (Alternative Approach)

```css
/* Button.module.css */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: var(--radius-lg);
  font-weight: 500;
  transition: background-color 150ms, color 150ms;
}

.button:focus-visible {
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
}

/* Variants */
.primary { background: var(--interactive-primary); color: white; }
.primary:hover { background: var(--interactive-primary-hover); }

.secondary { background: var(--surface-secondary); color: var(--text-primary); }
.secondary:hover { background: var(--color-gray-200); }

/* Sizes */
.sm { height: 2rem; padding: 0 0.75rem; font-size: 0.875rem; }
.md { height: 2.5rem; padding: 0 1rem; font-size: 0.875rem; }
.lg { height: 3rem; padding: 0 1.5rem; font-size: 1rem; }
```

```tsx
import styles from './Button.module.css';

function Button({ variant = 'primary', size = 'md', className, ...props }) {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${styles[size]} ${className ?? ''}`}
      {...props}
    />
  );
}
```

## Component File Organization

```
components/
  ui/
    button.tsx          # Button + buttonVariants
    input.tsx           # Input with label, error, hint
    badge.tsx           # Badge + badgeVariants
    card.tsx            # Card compound components
    dialog.tsx          # Dialog + DialogContent + DialogHeader...
    dropdown-menu.tsx   # DropdownMenu compound components
    avatar.tsx          # Avatar + AvatarFallback
    separator.tsx       # Horizontal/vertical separator
    skeleton.tsx        # Loading skeleton
    index.ts            # Barrel export
  layout/
    header.tsx
    sidebar.tsx
    footer.tsx
    page-layout.tsx
  composed/
    user-card.tsx       # Combines Avatar + Card + Badge
    data-table.tsx      # Table with sorting, pagination
    command-palette.tsx # Search + keyboard navigation
```

### Barrel Export

```typescript
// components/ui/index.ts
export { Button, type ButtonProps } from './button';
export { Input, type InputProps } from './input';
export { Badge, type BadgeProps } from './badge';
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
```

## Checklist

- [ ] CVA used for component variants (variant + size props)
- [ ] `cn()` utility available (clsx + tailwind-merge)
- [ ] All components accept `className` prop for overrides
- [ ] Components are accessible (proper ARIA, keyboard, focus)
- [ ] Error states visually distinct (red border, error message)
- [ ] Disabled states reduce opacity and block interaction
- [ ] Focus-visible ring for keyboard navigation
- [ ] Compound components for complex UI (Card, Dialog, Table)
- [ ] Components use semantic color tokens, not hardcoded values
- [ ] File organization: ui/ for primitives, composed/ for combinations
