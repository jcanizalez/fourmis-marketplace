---
description: When the user asks about React state management, React Context, Zustand, TanStack Query, React Query, global state, server state, state colocation, or choosing a state management approach in React
---

# State Management

## State Colocation Principle

Put state as close as possible to where it's used. Don't hoist state to a global store unless multiple distant components need it.

```
Where should this state live?
├── Used by one component? → useState in that component
├── Used by parent + children? → useState in parent, pass via props
├── Used by siblings? → Lift to nearest common ancestor
├── Used by many distant components? → Context or global store
└── Comes from a server? → TanStack Query / SWR
```

---

## React Context

Best for: low-frequency updates (theme, auth, locale, feature flags).

### Basic Context
```tsx
import { createContext, useContext, useState, ReactNode } from "react";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Custom hook with null check
function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    const user = await loginApi(email, password);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    logoutApi();
  }, []);

  // Memoize to prevent unnecessary re-renders
  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

### Split Context Pattern
```tsx
// Separate state from dispatch to avoid unnecessary re-renders
const ThemeStateContext = createContext<"light" | "dark">("light");
const ThemeDispatchContext = createContext<() => void>(() => {});

function useTheme() {
  return useContext(ThemeStateContext);
}

function useThemeToggle() {
  return useContext(ThemeDispatchContext);
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const toggle = useCallback(() => setTheme((t) => (t === "light" ? "dark" : "light")), []);

  return (
    <ThemeStateContext.Provider value={theme}>
      <ThemeDispatchContext.Provider value={toggle}>
        {children}
      </ThemeDispatchContext.Provider>
    </ThemeStateContext.Provider>
  );
}

// Now components that only toggle don't re-render when theme changes
function ToggleButton() {
  const toggle = useThemeToggle(); // Doesn't re-render on theme change
  return <button onClick={toggle}>Toggle</button>;
}
```

### Context Limitations
- **Every consumer re-renders** when the context value changes — even if they only use part of it
- **No selectors** — can't subscribe to a slice of context
- **Not suitable for high-frequency updates** (mouse position, form state with many fields)
- Use split context or Zustand for these cases

---

## Zustand

Best for: global client state, high-frequency updates, multiple selectors.

### Basic Store
```tsx
import { create } from "zustand";

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  total: () => number;
}

const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity: 1 }] };
    }),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),

  clearCart: () => set({ items: [] }),

  total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}));
```

### Selectors (Prevent Re-renders)
```tsx
// ✅ Select only what you need — component re-renders only when that slice changes
function CartCount() {
  const count = useCartStore((state) => state.items.length);
  return <span>{count}</span>;
}

function CartTotal() {
  const total = useCartStore((state) => state.total());
  return <span>${total.toFixed(2)}</span>;
}

// ❌ Don't destructure the whole store
function Bad() {
  const store = useCartStore(); // Re-renders on ANY store change
  return <span>{store.items.length}</span>;
}
```

### Zustand with Persist
```tsx
import { create } from "zustand";
import { persist } from "zustand/middleware";

const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: "light" as const,
      fontSize: 16,
      setTheme: (theme: "light" | "dark") => set({ theme }),
      setFontSize: (fontSize: number) => set({ fontSize }),
    }),
    {
      name: "settings", // localStorage key
    },
  ),
);
```

### Zustand with Immer
```tsx
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

const useTodoStore = create<TodoStore>()(
  immer((set) => ({
    todos: [] as Todo[],

    addTodo: (text: string) =>
      set((state) => {
        state.todos.push({ id: crypto.randomUUID(), text, done: false });
      }),

    toggleTodo: (id: string) =>
      set((state) => {
        const todo = state.todos.find((t) => t.id === id);
        if (todo) todo.done = !todo.done;
      }),
  })),
);
```

---

## TanStack Query (Server State)

Best for: data from APIs/databases — fetching, caching, revalidation, optimistic updates.

### Basic Query
```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
  });

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return <div>{user.name}</div>;
}
```

### Mutation with Cache Update
```tsx
function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserInput) => updateUser(data),

    // Optimistic update
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ["user", newData.id] });

      const previousUser = queryClient.getQueryData<User>(["user", newData.id]);

      queryClient.setQueryData(["user", newData.id], (old: User) => ({
        ...old,
        ...newData,
      }));

      return { previousUser };
    },

    // Rollback on error
    onError: (_err, newData, context) => {
      queryClient.setQueryData(["user", newData.id], context?.previousUser);
    },

    // Refetch after settle
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user", variables.id] });
    },
  });
}
```

### Query Keys Convention
```tsx
// Hierarchical keys for automatic invalidation
const queryKeys = {
  users: {
    all: ["users"] as const,
    lists: () => [...queryKeys.users.all, "list"] as const,
    list: (filters: Filters) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },
};

// Usage
useQuery({ queryKey: queryKeys.users.detail(userId), queryFn: ... });

// Invalidate all user queries
queryClient.invalidateQueries({ queryKey: queryKeys.users.all });

// Invalidate just lists (not details)
queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
```

### Infinite Query (Pagination)
```tsx
function InfiniteList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["posts"],
    queryFn: ({ pageParam }) => fetchPosts({ cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const allPosts = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      {allPosts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? "Loading..." : "Load more"}
        </button>
      )}
    </>
  );
}
```

---

## Decision Matrix

| Need | Solution |
|------|----------|
| Theme, locale, auth status | React Context |
| Cart, UI preferences, client filters | Zustand |
| API data, server state | TanStack Query |
| URL state (search, filters, page) | URL params (useSearchParams) |
| Form state | React Hook Form / useReducer |
| Single component state | useState |
| Animation values | useRef (no re-render needed) |

### Key Rule
**Server state ≠ Client state.** Never store API data in useState or Zustand. Use TanStack Query/SWR — they handle caching, revalidation, stale data, and loading states for you.
