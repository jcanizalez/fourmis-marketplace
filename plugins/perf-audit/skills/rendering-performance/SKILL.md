# Rendering Performance

Optimize how the browser renders your application. Covers the rendering pipeline, layout thrashing, paint optimization, compositing, and React/framework-specific patterns.

## The Rendering Pipeline

```
JavaScript → Style → Layout → Paint → Composite
```

| Stage | What Happens | Cost |
|-------|-------------|------|
| **JavaScript** | Run JS, modify DOM, change styles | Variable |
| **Style** | Calculate computed styles for each element | Low-Medium |
| **Layout** | Calculate position/size of each element | High |
| **Paint** | Fill in pixels (colors, borders, shadows, text) | Medium-High |
| **Composite** | Combine layers and draw to screen | Low |

### Which CSS Properties Trigger What?

| Triggers All (Layout) | Triggers Paint+Composite | Triggers Composite Only |
|----------------------|-------------------------|------------------------|
| `width`, `height` | `color`, `background` | `transform` |
| `margin`, `padding` | `box-shadow` | `opacity` |
| `top`, `left`, `right`, `bottom` | `border-radius` | `filter` |
| `font-size`, `line-height` | `outline` | `will-change` |
| `display`, `position` | `visibility` | `clip-path` |

**Rule**: Animate only `transform` and `opacity` for 60fps animations.

## Layout Thrashing

Layout thrashing happens when you read layout properties and write styles alternately, forcing the browser to recalculate layout repeatedly:

```javascript
// BAD: layout thrashing — N forced reflows
elements.forEach(el => {
  const width = el.offsetWidth;      // READ → forces layout
  el.style.width = width * 2 + 'px'; // WRITE → invalidates layout
  // Next iteration: READ forces layout AGAIN
});

// GOOD: batch reads, then batch writes
const widths = elements.map(el => el.offsetWidth); // All READs first
elements.forEach((el, i) => {
  el.style.width = widths[i] * 2 + 'px';          // All WRITEs after
});

// GOOD: use requestAnimationFrame to separate read/write phases
function updateLayout() {
  // READ phase
  const measurements = elements.map(el => el.getBoundingClientRect());

  // WRITE phase (in next frame)
  requestAnimationFrame(() => {
    elements.forEach((el, i) => {
      el.style.transform = `translateX(${measurements[i].width}px)`;
    });
  });
}
```

### Properties That Trigger Forced Layout
Reading any of these after a DOM write forces a synchronous reflow:
- `offsetTop/Left/Width/Height`
- `clientTop/Left/Width/Height`
- `scrollTop/Left/Width/Height`
- `getComputedStyle()`
- `getBoundingClientRect()`
- `scrollIntoView()`

## CSS Containment

Tell the browser what parts of the page are independent, allowing it to skip work:

```css
/* contain: layout — element's layout doesn't affect its siblings */
/* contain: paint — nothing inside paints outside its box */
/* contain: style — counters/quotes don't escape */
/* contain: size — element's size doesn't depend on children */

/* Best for cards, list items, isolated sections */
.card {
  contain: layout style paint;
}

/* content-visibility: auto — skip rendering for off-screen elements */
.section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px; /* Estimated height for scrollbar */
}
```

### Real-World Impact
```css
/* Long article with many sections */
article section {
  content-visibility: auto;
  contain-intrinsic-size: 0 800px;
}
/* Result: initial render time drops 50-70% for long pages */
```

## Animation Performance

### CSS Animations (Preferred)
```css
/* GOOD: only animates transform (composite-only) — 60fps */
.slide-in {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Promote to own layer for complex animations */
.animated-element {
  will-change: transform;
  /* Or: transform: translateZ(0); — forces GPU layer */
}
```

### JavaScript Animations
```typescript
// GOOD: requestAnimationFrame for JS animations
function animate(element: HTMLElement, from: number, to: number, duration: number) {
  const start = performance.now();

  function frame(time: number) {
    const elapsed = time - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

    element.style.transform = `translateX(${from + (to - from) * eased}px)`;

    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}

// BAD: using setInterval for animations
setInterval(() => {
  element.style.left = pos++ + 'px'; // Forces layout, not synced with display
}, 16);
```

### Respecting User Preferences
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## React Performance Patterns

### Prevent Unnecessary Re-renders
```tsx
// BAD: new object/array on every render — children always re-render
function Parent() {
  return <Child style={{ color: 'red' }} items={[1, 2, 3]} />;
}

// GOOD: memoize objects and arrays
function Parent() {
  const style = useMemo(() => ({ color: 'red' }), []);
  const items = useMemo(() => [1, 2, 3], []);
  return <Child style={style} items={items} />;
}

// GOOD: memo for expensive child components
const ExpensiveChild = React.memo(function ExpensiveChild({ data }: Props) {
  return <div>{/* complex rendering */}</div>;
});
```

### Virtualize Long Lists
```tsx
// BAD: rendering 10,000 items
function ItemList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map(item => <li key={item.id}>{item.name}</li>)}
    </ul>
  );
}

// GOOD: virtualize — only render visible items
import { useVirtualizer } from '@tanstack/react-virtual';

function ItemList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
  });

  return (
    <div ref={parentRef} style={{ height: '500px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(row => (
          <div key={row.key} style={{
            position: 'absolute',
            top: row.start,
            height: row.size,
          }}>
            {items[row.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Code Splitting
```tsx
// Lazy-load heavy components
const HeavyChart = React.lazy(() => import('./HeavyChart'));

function Dashboard() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <HeavyChart data={chartData} />
    </Suspense>
  );
}

// Route-based code splitting (Next.js does this automatically)
// In plain React with React Router:
const AdminPage = React.lazy(() => import('./pages/Admin'));
```

### Debounce Expensive Operations
```tsx
function SearchInput() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  // Debounce search — don't fire on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) fetchResults(query).then(setResults);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

## Performance Budget

Set performance budgets to prevent regressions:

```json
// .lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "interactive": ["error", { "maxNumericValue": 3500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-byte-weight": ["warning", { "maxNumericValue": 500000 }]
      }
    }
  }
}
```

## Profiling Checklist

1. Open Chrome DevTools → Performance tab
2. Check "Screenshots" and "Web Vitals" options
3. Click Record → Reload page → Stop recording
4. Look for:
   - Red bars (long tasks > 50ms)
   - Layout shift events (CLS markers)
   - LCP marker timing
   - Main thread blocking during interactions
5. Flame chart: identify expensive functions
6. Bottom-up view: sort by "Self Time" to find hotspots
