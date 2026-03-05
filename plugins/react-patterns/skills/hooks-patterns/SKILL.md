---
description: When the user asks about React hooks, custom hooks, useCallback, useMemo, useRef, useReducer, useId, useFormStatus, hook composition, how to write reusable hooks in React, the use() hook for reading promises/context, React 19 hooks, stale closures, hook dependency arrays, debounce hook, useLocalStorage, usePrevious, useAsync, useToggle, useInterval, or Rules of Hooks
---

# Hooks Patterns

## Custom Hook Fundamentals

### Basic Custom Hook
```tsx
import { useState, useEffect } from "react";

// Convention: always prefix with "use"
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

// Usage
function Settings() {
  const [theme, setTheme] = useLocalStorage("theme", "light");
  return <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme}</button>;
}
```

### Return Value Patterns
```tsx
// Tuple — for simple state-like hooks (matches useState convention)
function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return [value, toggle] as const;
}

// Object — for complex hooks with many values
function useForm<T>(initialValues: T) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const handleChange = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setValues((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const reset = useCallback(() => setValues(initialValues), [initialValues]);

  return { values, errors, handleChange, reset, setErrors };
}
```

---

## useCallback & useMemo

### When to Use useCallback
```tsx
// ✅ Use: passing callbacks to memoized children
function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    setCount((c) => c + 1);
  }, []); // Stable reference — ExpensiveChild won't re-render

  return (
    <>
      <span>{count}</span>
      <ExpensiveChild onClick={handleClick} />
    </>
  );
}

const ExpensiveChild = memo(function ExpensiveChild({
  onClick,
}: {
  onClick: () => void;
}) {
  return <button onClick={onClick}>Click</button>;
});

// ❌ Don't use: inline handlers on plain HTML elements
function Simple() {
  const [count, setCount] = useState(0);
  // No memo needed — <button> doesn't benefit from stable reference
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>;
}
```

### When to Use useMemo
```tsx
// ✅ Use: expensive computation
function ProductList({ products, filter }: Props) {
  const filtered = useMemo(
    () => products.filter((p) => p.category === filter).sort((a, b) => a.price - b.price),
    [products, filter],
  );

  return (
    <ul>
      {filtered.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}

// ✅ Use: stable object identity for context or deps
function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">("light");

  const value = useMemo(
    () => ({ mode, toggle: () => setMode((m) => (m === "light" ? "dark" : "light")) }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ❌ Don't use: simple values or inexpensive operations
function Badge({ count }: { count: number }) {
  // This is just a comparison — useMemo is overhead for no gain
  const label = count > 99 ? "99+" : String(count);
  return <span>{label}</span>;
}
```

### Decision Rule
```
Is the value passed to a memoized child or used as a dependency?
├── Yes → useMemo / useCallback
└── No
    └── Is the computation expensive (>1ms)?
        ├── Yes → useMemo
        └── No → skip it
```

---

## useRef Patterns

### DOM Refs
```tsx
function AutoFocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} />;
}
```

### Previous Value Ref
```tsx
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  });

  return ref.current;
}

// Usage
function Counter() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);

  return (
    <p>
      Now: {count}, Before: {prevCount}
    </p>
  );
}
```

### Mutable Ref (No Re-render)
```tsx
function useInterval(callback: () => void, delayMs: number | null) {
  const savedCallback = useRef(callback);

  // Update ref on every render — callback always has fresh closure
  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    if (delayMs === null) return;

    const id = setInterval(() => savedCallback.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}
```

---

## useReducer for Complex State

### Basic Reducer
```tsx
type State = {
  items: Item[];
  loading: boolean;
  error: string | null;
};

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; items: Item[] }
  | { type: "FETCH_ERROR"; error: string }
  | { type: "ADD_ITEM"; item: Item }
  | { type: "REMOVE_ITEM"; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: null };
    case "FETCH_SUCCESS":
      return { ...state, loading: false, items: action.items };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.error };
    case "ADD_ITEM":
      return { ...state, items: [...state.items, action.item] };
    case "REMOVE_ITEM":
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
  }
}

function ItemList() {
  const [state, dispatch] = useReducer(reducer, {
    items: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    dispatch({ type: "FETCH_START" });
    fetchItems()
      .then((items) => dispatch({ type: "FETCH_SUCCESS", items }))
      .catch((e) => dispatch({ type: "FETCH_ERROR", error: e.message }));
  }, []);

  if (state.loading) return <p>Loading...</p>;
  if (state.error) return <p>Error: {state.error}</p>;
  return (
    <ul>
      {state.items.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

### When useReducer > useState
| Use `useState` | Use `useReducer` |
|----------------|------------------|
| 1-2 independent values | 3+ related values |
| Simple updates | State machine logic |
| No action history needed | Actions need to be logged/tested |
| Primitive values | Object/array state with multiple update patterns |

---

## Hook Composition

### Composing Multiple Hooks
```tsx
function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth().then(setUser).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const user = await loginApi(email, password);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    await logoutApi();
    setUser(null);
  }, []);

  return { user, loading, login, logout, isAuthenticated: !!user };
}

// Compose with other hooks
function useProtectedData<T>(fetcher: () => Promise<T>) {
  const { user, isAuthenticated } = useAuth();

  const query = useQuery({
    queryKey: ["protected", user?.id],
    queryFn: fetcher,
    enabled: isAuthenticated,
  });

  return { ...query, user };
}
```

### Async Hook Pattern
```tsx
function useAsync<T>(asyncFn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    setState((s) => ({ ...s, loading: true, error: null }));

    asyncFn()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, loading: false, error });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
```

### Debounce Hook
```tsx
function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

// Usage — search with debounce
function Search() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  const results = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => searchApi(debouncedQuery),
    enabled: debouncedQuery.length > 2,
  });

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

---

## React 19 Hooks

### use() — Read Promises and Context

The `use()` hook reads a resource (Promise or Context) during render. Unlike other hooks, it can be called conditionally.

```tsx
import { use, Suspense } from "react";

// Read a promise — replaces useEffect + useState for data fetching
function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // Suspends until resolved
  return <h1>{user.name}</h1>;
}

// Usage — parent creates the promise, child reads it
function Page({ userId }: { userId: string }) {
  const userPromise = fetchUser(userId); // Start fetching immediately

  return (
    <Suspense fallback={<Skeleton />}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}
```

```tsx
// Conditional context reading (only use() allows this)
function StatusMessage({ showDetails }: { showDetails: boolean }) {
  if (showDetails) {
    const theme = use(ThemeContext); // ✅ Valid — use() works in conditionals
    return <p style={{ color: theme.primary }}>Details shown</p>;
  }
  return <p>Summary view</p>;
}
```

### useId — Stable IDs for Accessibility

Generates unique IDs that are stable across server/client rendering.

```tsx
function FormField({ label }: { label: string }) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} />
    </div>
  );
}

// Multiple related IDs
function PasswordField() {
  const id = useId();

  return (
    <div>
      <label htmlFor={`${id}-password`}>Password</label>
      <input id={`${id}-password`} type="password" aria-describedby={`${id}-hint`} />
      <p id={`${id}-hint`}>Must be at least 8 characters</p>
    </div>
  );
}
```

### useFormStatus — Form Submission State

Access the pending state of a parent `<form>` without prop drilling.

```tsx
"use client";

import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending, data, method, action } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

// Usage — must be inside a <form>
function EditForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action}>
      <input name="title" />
      <SubmitButton /> {/* Automatically knows when form is submitting */}
    </form>
  );
}
```

---

## Rules of Hooks — Quick Reference

1. **Only call hooks at the top level** — no if/for/while
2. **Only call hooks from React functions** — components or custom hooks
3. **Exhaustive deps** — include all referenced values in dependency arrays
4. **Naming**: custom hooks MUST start with `use`
5. **No side effects in render** — use useEffect for async, subscriptions, DOM
