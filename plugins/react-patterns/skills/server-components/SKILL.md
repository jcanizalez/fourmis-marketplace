---
description: When the user asks about React Server Components, RSC, "use server", "use client", server and client component boundaries, streaming, Suspense for data fetching, loading.tsx, async Server Components, server actions, React.cache deduplication, parallel data fetching, Promise.all in RSC, passing server components as children, revalidatePath, or when to use client vs server components in Next.js App Router
---

# React Server Components

## Server vs Client Components

### Default: Server Components
In Next.js App Router, all components are **Server Components** by default. They run on the server only — never shipped to the client bundle.

```tsx
// app/page.tsx — Server Component (default)
// ✅ Direct database access, no API needed
import { db } from "@/lib/db";

export default async function HomePage() {
  const posts = await db.posts.findMany({ take: 10 });

  return (
    <main>
      <h1>Latest Posts</h1>
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </main>
  );
}
```

### When to Add "use client"
```tsx
"use client"; // Add ONLY when you need browser APIs or React state

import { useState } from "react";

export function LikeButton({ postId }: { postId: string }) {
  const [liked, setLiked] = useState(false);

  return (
    <button onClick={() => setLiked(!liked)}>
      {liked ? "❤️" : "🤍"} Like
    </button>
  );
}
```

### Decision Rule
```
Does this component need:
├── useState, useEffect, useRef, or other hooks? → "use client"
├── onClick, onChange, or other event handlers? → "use client"
├── Browser APIs (window, document, localStorage)? → "use client"
├── Third-party libs that use hooks (framer-motion, react-hook-form)? → "use client"
└── None of the above? → Server Component (default)
```

---

## The Boundary Pattern

The `"use client"` directive creates a **boundary**. Everything imported by a Client Component is also client-side. Push the boundary as deep as possible.

### ❌ Bad — Entire page is client
```tsx
"use client"; // Makes everything client-side

import { db } from "@/lib/db"; // ❌ Can't use server code

export default function Page() {
  const [search, setSearch] = useState("");
  // ...all children are now client components too
}
```

### ✅ Good — Leaf component is client
```tsx
// app/posts/page.tsx — Server Component
import { db } from "@/lib/db";
import { SearchBar } from "./SearchBar"; // Client Component

export default async function PostsPage() {
  const posts = await db.posts.findMany();

  return (
    <main>
      <SearchBar /> {/* Only this is client-side */}
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
        </article>
      ))}
    </main>
  );
}
```

```tsx
// app/posts/SearchBar.tsx — Client Component (leaf)
"use client";

import { useState } from "react";

export function SearchBar() {
  const [query, setQuery] = useState("");
  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

### Passing Server Components as Children
```tsx
// Server Component children can pass through Client Components
// This keeps them server-rendered!

// Client wrapper
"use client";
export function Sidebar({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return open ? <aside>{children}</aside> : null;
}

// Server Component page
import { Sidebar } from "./Sidebar";
import { NavLinks } from "./NavLinks"; // Server Component

export default async function Layout({ children }: { children: ReactNode }) {
  const links = await db.navLinks.findMany();

  return (
    <Sidebar>
      <NavLinks links={links} /> {/* Still server-rendered! */}
    </Sidebar>
  );
}
```

---

## Data Fetching in Server Components

### Direct Database Access
```tsx
// app/users/[id]/page.tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await db.users.findUnique({ where: { id } });

  if (!user) notFound();

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

### Parallel Data Fetching
```tsx
// ✅ Fetch in parallel — don't await sequentially
export default async function Dashboard() {
  const [user, posts, notifications] = await Promise.all([
    getUser(),
    getPosts(),
    getNotifications(),
  ]);

  return (
    <>
      <UserCard user={user} />
      <PostList posts={posts} />
      <NotificationBell count={notifications.length} />
    </>
  );
}
```

### Deduplication with cache()
```tsx
import { cache } from "react";
import { db } from "@/lib/db";

// React.cache deduplicates within a single request
export const getUser = cache(async (id: string) => {
  return db.users.findUnique({ where: { id } });
});

// Multiple components can call getUser("123") —
// only one database query executes per request
```

---

## Streaming with Suspense

### Basic Streaming
```tsx
import { Suspense } from "react";

export default function DashboardPage() {
  return (
    <main>
      <h1>Dashboard</h1>

      {/* This renders immediately */}
      <WelcomeMessage />

      {/* This streams in when ready */}
      <Suspense fallback={<ChartSkeleton />}>
        <AnalyticsChart /> {/* Async Server Component */}
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <RecentOrders /> {/* Async Server Component */}
      </Suspense>
    </main>
  );
}

// Slow data? No problem — streams in when ready
async function AnalyticsChart() {
  const data = await fetchAnalytics(); // Takes 2 seconds
  return <Chart data={data} />;
}

async function RecentOrders() {
  const orders = await fetchOrders(); // Takes 1 second
  return <OrderTable orders={orders} />;
}
```

### Loading UI with loading.tsx
```tsx
// app/dashboard/loading.tsx
// Automatically wraps the page in Suspense
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded mb-4" />
      <div className="h-64 bg-gray-200 rounded" />
    </div>
  );
}
```

---

## Server Actions

### Basic Server Action
```tsx
// app/posts/actions.ts
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
});

export async function createPost(formData: FormData) {
  const result = CreatePostSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });

  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  await db.posts.create({ data: result.data });
  revalidatePath("/posts");
}
```

### Form with Server Action
```tsx
// Server Component — no "use client" needed for basic forms
import { createPost } from "./actions";

export default function NewPostPage() {
  return (
    <form action={createPost}>
      <input name="title" placeholder="Title" required />
      <textarea name="body" placeholder="Write your post..." required />
      <button type="submit">Publish</button>
    </form>
  );
}
```

### Enhanced Form with useActionState
```tsx
"use client";

import { useActionState } from "react";
import { createPost } from "./actions";

export function PostForm() {
  const [state, formAction, isPending] = useActionState(createPost, null);

  return (
    <form action={formAction}>
      <input name="title" placeholder="Title" />
      {state?.error?.title && <p className="text-red-500">{state.error.title}</p>}

      <textarea name="body" placeholder="Body" />
      {state?.error?.body && <p className="text-red-500">{state.error.body}</p>}

      <button type="submit" disabled={isPending}>
        {isPending ? "Publishing..." : "Publish"}
      </button>
    </form>
  );
}
```

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Adding `"use client"` to every component | Only add when hooks/events/browser APIs are needed |
| Fetching data in Client Components via useEffect | Fetch in Server Components or use TanStack Query |
| Putting `"use client"` at the page level | Push the boundary to leaf components |
| Passing functions from server to client | Use Server Actions instead |
| Using `window`/`document` in Server Components | Move to Client Component or use `typeof window !== "undefined"` |
| Sequential awaits in Server Components | Use `Promise.all()` for parallel fetching |
| Not using Suspense for slow data | Wrap async Server Components in `<Suspense>` |
