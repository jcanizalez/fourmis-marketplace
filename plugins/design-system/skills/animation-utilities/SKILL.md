---
description: When the user asks about CSS animations, transitions, motion design, micro-interactions, loading states, entrance animations, scroll animations, or prefers-reduced-motion accessibility
---

# Animation Utilities

Production-ready CSS animations and transitions for modern UIs. Covers micro-interactions, entrance animations, loading states, scroll-driven animations, and accessibility.

## Core Transition Patterns

### Timing Functions

```css
:root {
  /* Standard easing — use for most transitions */
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);

  /* Enter — element appearing (decelerating) */
  --ease-out: cubic-bezier(0, 0, 0.2, 1);

  /* Exit — element leaving (accelerating) */
  --ease-in: cubic-bezier(0.4, 0, 1, 1);

  /* Emphasis — slight bounce/overshoot */
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Spring — natural physics feel */
  --ease-spring: cubic-bezier(0.22, 1, 0.36, 1);

  /* Duration scale */
  --duration-instant: 75ms;
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 350ms;
  --duration-slower: 500ms;
}
```

### Interactive Transitions

```css
/* Button press — scale down slightly */
.btn {
  transition: all var(--duration-fast) var(--ease-default);
}
.btn:hover {
  background-color: var(--interactive-primary-hover);
}
.btn:active {
  transform: scale(0.97);
  transition-duration: var(--duration-instant);
}

/* Card hover — subtle lift */
.card-interactive {
  transition: transform var(--duration-normal) var(--ease-default),
              box-shadow var(--duration-normal) var(--ease-default);
}
.card-interactive:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* Link underline — grow from left */
.link-animated {
  position: relative;
}
.link-animated::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 0;
  height: 2px;
  background: currentColor;
  transition: width var(--duration-normal) var(--ease-out);
}
.link-animated:hover::after {
  width: 100%;
}
```

## Entrance Animations

### Fade + Slide Variants

```css
/* Fade in from bottom (most common) */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Fade in from top (dropdowns, tooltips) */
@keyframes fade-in-down {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Fade in + scale (modals, popovers) */
@keyframes fade-in-scale {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Slide in from right (drawers, panels) */
@keyframes slide-in-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

/* Slide in from left */
@keyframes slide-in-left {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
```

### Applying Entrance Animations

```css
/* Utility classes */
.animate-fade-in-up {
  animation: fade-in-up var(--duration-normal) var(--ease-out) both;
}

.animate-fade-in-down {
  animation: fade-in-down var(--duration-normal) var(--ease-out) both;
}

.animate-fade-in-scale {
  animation: fade-in-scale var(--duration-normal) var(--ease-spring) both;
}

/* Staggered children — set --stagger-index via JS or nth-child */
.stagger-children > * {
  animation: fade-in-up var(--duration-normal) var(--ease-out) both;
  animation-delay: calc(var(--stagger-index, 0) * 50ms);
}

.stagger-children > *:nth-child(1) { --stagger-index: 0; }
.stagger-children > *:nth-child(2) { --stagger-index: 1; }
.stagger-children > *:nth-child(3) { --stagger-index: 2; }
.stagger-children > *:nth-child(4) { --stagger-index: 3; }
.stagger-children > *:nth-child(5) { --stagger-index: 4; }
```

### Tailwind Animations (v4)

```css
@theme {
  --animate-fade-in-up: fade-in-up 0.25s ease-out both;
  --animate-fade-in-down: fade-in-down 0.25s ease-out both;
  --animate-fade-in-scale: fade-in-scale 0.25s cubic-bezier(0.22, 1, 0.36, 1) both;
  --animate-slide-in-right: slide-in-right 0.3s ease-out both;
}
```

```html
<div class="animate-fade-in-up">Appears with slide up</div>
<div class="animate-fade-in-scale">Modal content</div>
```

## Loading States

### Skeleton Shimmer

```css
@keyframes shimmer {
  from { background-position: -200% 0; }
  to { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-gray-200) 25%,
    var(--color-gray-100) 50%,
    var(--color-gray-200) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-md);
}

/* Dark mode */
.dark .skeleton {
  background: linear-gradient(
    90deg,
    var(--color-gray-700) 25%,
    var(--color-gray-600) 50%,
    var(--color-gray-700) 75%
  );
  background-size: 200% 100%;
}
```

```html
<!-- Skeleton card -->
<div class="space-y-3 p-4">
  <div class="skeleton h-4 w-3/4"></div>
  <div class="skeleton h-4 w-1/2"></div>
  <div class="skeleton h-32 w-full"></div>
</div>
```

### Spinner

```css
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--color-gray-200);
  border-top-color: var(--color-brand-600);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
```

### Pulse Dot

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-green-500);
  animation: pulse 2s ease-in-out infinite;
}
```

## Scroll-Driven Animations

### CSS Scroll-Driven (modern browsers)

```css
/* Fade in as element scrolls into view */
@keyframes appear {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.scroll-reveal {
  animation: appear linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}

/* Progress bar driven by scroll position */
.scroll-progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: var(--color-brand-600);
  transform-origin: left;
  animation: grow-width linear both;
  animation-timeline: scroll();
}

@keyframes grow-width {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

### Intersection Observer Fallback (wider support)

```typescript
function useScrollReveal(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('animate-fade-in-up');
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}
```

## Modal / Dialog Animations

```css
/* Backdrop */
dialog::backdrop {
  background: rgb(0 0 0 / 0);
  transition: background var(--duration-normal) var(--ease-default);
}

dialog[open]::backdrop {
  background: rgb(0 0 0 / 0.5);
}

/* Dialog content */
dialog {
  opacity: 0;
  transform: scale(0.95) translateY(8px);
  transition: opacity var(--duration-normal) var(--ease-spring),
              transform var(--duration-normal) var(--ease-spring),
              display var(--duration-normal) allow-discrete,
              overlay var(--duration-normal) allow-discrete;
}

dialog[open] {
  opacity: 1;
  transform: scale(1) translateY(0);
}

/* Starting style for entry animation (requires @starting-style support) */
@starting-style {
  dialog[open] {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }
  dialog[open]::backdrop {
    background: rgb(0 0 0 / 0);
  }
}
```

## Prefers-Reduced-Motion (Accessibility)

**Always respect this preference.** Some users experience motion sickness.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Selective Reduction (better approach)

```css
/* Keep meaningful transitions, remove decorative motion */
@media (prefers-reduced-motion: reduce) {
  /* Remove entrance animations */
  .animate-fade-in-up,
  .animate-fade-in-down,
  .animate-fade-in-scale {
    animation: none;
    opacity: 1;
    transform: none;
  }

  /* Keep opacity transitions (non-vestibular) */
  .card-interactive:hover {
    transform: none; /* Remove movement */
    /* box-shadow still transitions — that's fine */
  }

  /* Simplify loading to opacity only */
  .skeleton {
    animation: pulse 2s ease-in-out infinite; /* Subtle pulse instead of shimmer */
  }
}
```

### React Hook

```typescript
function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefers(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefers(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefers;
}
```

## Checklist

- [ ] Consistent timing functions defined as CSS variables
- [ ] Duration scale: instant (75ms), fast (150ms), normal (250ms), slow (350ms)
- [ ] Entrance animations use `ease-out`, exits use `ease-in`
- [ ] Staggered animations for lists/grids
- [ ] Loading skeletons match content layout
- [ ] `prefers-reduced-motion` respected — removes non-essential motion
- [ ] Scroll-driven animations have Intersection Observer fallback
- [ ] Modals animate in and out (not just appear/disappear)
- [ ] No animation on `transform` properties that trigger layout (width, height, top, left)
- [ ] Animations use `transform` and `opacity` only (GPU-composited)
