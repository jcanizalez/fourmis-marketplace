---
description: When the user asks about React performance, React.memo, useMemo, useCallback optimization, virtualization, code splitting, lazy loading, React Compiler, useTransition, useDeferredValue, concurrent rendering, non-blocking updates, React DevTools Profiler, re-render debugging, @tanstack/react-virtual, dynamic imports, React.lazy, Suspense for performance, bundle size optimization, or how to optimize React app performance
---

# Performance Patterns

## React.memo

Memoize a component so it only re-renders when its props change.

### When to Use
```tsx
// ✅ Use: expensive render that receives stable-ish props
const ExpensiveChart = memo(function ExpensiveChart({ data }: { data: DataPoint[] }) {
  // Expensive SVG rendering
  return <svg>{/* complex chart */}</svg>;
});

// ✅ Use: list item rendered many times
const TodoItem = memo(function TodoItem({
  todo,
  onToggle,
}: {
  todo: Todo;
  onToggle: (id: string) => void;
}) {
  return (
    <li>
      <input type="checkbox" checked={todo.done} onChange={() => onToggle(todo.id)} />
      {todo.title}
    </li>
  );
});

// ❌ Skip: simple components, primitive props, few instances
function Badge({ count }: { count: number }) {
  return <span>{count}</span>; // Not worth memoizing
}
```

### Custom Comparison
```tsx
const UserCard = memo(
  function UserCard({ user }: { user: User }) {
    return <div>{user.name}</div>;
  },
  // Only re-render if id changes (ignore other user fields)
  (prev, next) => prev.user.id === next.user.id,
);
```

---

## Avoiding Re-renders

### Problem: Object/Array Props
```tsx
// ❌ Bad — creates new object every render, breaks memo
function Parent() {
  return <Child style={{ color: "red" }} items={[1, 2, 3]} />;
}

// ✅ Good — stable references
const STYLE = { color: "red" } as const;
const ITEMS = [1, 2, 3] as const;

function Parent() {
  return <Child style={STYLE} items={ITEMS} />;
}

// ✅ Good — useMemo for dynamic values
function Parent({ color }: { color: string }) {
  const style = useMemo(() => ({ color }), [color]);
  return <Child style={style} />;
}
```

### Problem: Inline Callbacks
```tsx
// ❌ Bad — new function every render
function Parent() {
  const [items, setItems] = useState<Item[]>([]);

  return (
    <List
      items={items}
      onDelete={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
    />
  );
}

// ✅ Good — stable callback
function Parent() {
  const [items, setItems] = useState<Item[]>([]);

  const onDelete = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return <List items={items} onDelete={onDelete} />;
}
```

### State Splitting
```tsx
// ❌ Bad — all children re-render when any field changes
function Form() {
  const [state, setState] = useState({ name: "", email: "", bio: "" });
  // Updating name re-renders email and bio fields too
}

// ✅ Good — independent state
function Form() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  // Updating name doesn't affect email or bio
}
```

---

## Virtualization

Only render visible items in long lists. Essential for 100+ items.

### With @tanstack/react-virtual
```tsx
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Estimated row height in px
    overscan: 5, // Render 5 extra items above/below viewport
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{ height: virtualizer.getTotalSize(), position: "relative" }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: virtualItem.size,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <ItemRow item={item} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### When to Virtualize
| List Size | Approach |
|-----------|----------|
| < 50 items | Plain `.map()` — no virtualization needed |
| 50-200 items | Consider if rendering is slow |
| 200+ items | Always virtualize |
| Infinite scroll | Virtualize + infinite query |

---

## Code Splitting

### React.lazy + Suspense
```tsx
import { lazy, Suspense } from "react";

// Lazy-load heavy components
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const Analytics = lazy(() => import("./pages/Analytics"));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Suspense>
  );
}
```

### Named Exports with Lazy
```tsx
// React.lazy only works with default exports
// For named exports, create a wrapper:
const MyComponent = lazy(() =>
  import("./MyComponent").then((mod) => ({ default: mod.MyComponent })),
);
```

### Conditional Lazy Loading
```tsx
// Only load when needed
function FeaturePanel() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Chart</button>
      {showChart && (
        <Suspense fallback={<ChartSkeleton />}>
          <HeavyChart />
        </Suspense>
      )}
    </div>
  );
}

const HeavyChart = lazy(() => import("./HeavyChart"));
```

### Next.js Dynamic Imports
```tsx
import dynamic from "next/dynamic";

// Client-only component (no SSR)
const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

// Heavy component with loading state
const Editor = dynamic(() => import("./Editor"), {
  loading: () => <EditorSkeleton />,
});
```

---

## React Compiler (React 19+)

React Compiler auto-memoizes components and hooks. When enabled, you can remove most manual `useMemo`, `useCallback`, and `memo` calls.

### What it Does
```tsx
// Before (manual memoization):
const MemoizedComponent = memo(function Component({ items }: Props) {
  const sorted = useMemo(() => items.sort(compare), [items]);
  const handleClick = useCallback(() => { /* ... */ }, []);
  return <List items={sorted} onClick={handleClick} />;
});

// After (with React Compiler):
function Component({ items }: Props) {
  const sorted = items.sort(compare);
  const handleClick = () => { /* ... */ };
  return <List items={sorted} onClick={handleClick} />;
}
// Compiler adds memoization automatically
```

### Setup (Next.js)
```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    reactCompiler: true,
  },
};
```

### Setup (Vite / Babel)
```bash
npm install babel-plugin-react-compiler
```

```javascript
// babel.config.js
module.exports = {
  plugins: [["babel-plugin-react-compiler"]],
};
```

### Rules for React Compiler
The compiler requires code that follows the **Rules of React**:
1. Components must be pure (same props → same output)
2. Hooks must follow Rules of Hooks
3. No mutating props or state directly
4. Side effects only in useEffect

If the compiler can't optimize a component, it silently skips it — your code still works, just without auto-memoization.

---

## Concurrent Rendering

### useTransition — Non-Blocking State Updates

Mark a state update as non-urgent so React can keep the UI responsive during expensive re-renders.

```tsx
import { useState, useTransition } from "react";

function FilterableList({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState(items);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value); // Urgent — update input immediately

    startTransition(() => {
      // Non-urgent — can be interrupted if user types again
      setFilteredItems(
        items.filter((item) =>
          item.name.toLowerCase().includes(value.toLowerCase()),
        ),
      );
    });
  };

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}
      <ul>
        {filteredItems.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### useDeferredValue — Defer Expensive Renders

Let React defer re-rendering a value until more urgent updates are done. Simpler than `useTransition` when you don't control the state update.

```tsx
import { useDeferredValue, useMemo } from "react";

function SearchResults({ query }: { query: string }) {
  // Deferred value lags behind the actual query during rapid typing
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  const results = useMemo(
    () => heavySearch(deferredQuery), // Only re-computes when deferred value updates
    [deferredQuery],
  );

  return (
    <div style={{ opacity: isStale ? 0.7 : 1 }}>
      {results.map((r) => (
        <ResultCard key={r.id} result={r} />
      ))}
    </div>
  );
}
```

### When to Use Which

| Pattern | Use Case |
|---------|----------|
| `useTransition` | You control the state update and want to mark it non-urgent |
| `useDeferredValue` | You receive a value as a prop and want to defer its effect |
| Neither | The update is fast enough (<16ms) that blocking is fine |

---

## Performance Debugging

### React DevTools Profiler
1. Open React DevTools → Profiler tab
2. Click Record → interact with your app → Stop
3. Look for:
   - **Long bars** = slow renders
   - **Gray bars** = components that didn't re-render (good!)
   - **Why did this render?** (enable in settings)

### Highlight Re-renders
```tsx
// React DevTools → Settings → General → ✅ "Highlight updates when components render"
// Shows green/yellow/red flashes on re-rendering components
```

### Quick Performance Checklist
- [ ] Lists > 100 items use virtualization
- [ ] Route-level code splitting with lazy()
- [ ] Images use `<Image>` (Next.js) or lazy loading
- [ ] Heavy third-party libs are lazy-loaded
- [ ] Context values are memoized
- [ ] Expensive computations use useMemo
- [ ] Callbacks passed to memo'd children use useCallback
- [ ] State is colocated (not unnecessarily lifted)
- [ ] Frequent updates are isolated (don't re-render siblings)
- [ ] React Compiler enabled (React 19+)
