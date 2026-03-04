---
description: When the user asks about Next.js data fetching, Server Component fetching, fetch caching, revalidation, ISR, generateStaticParams, streaming, Suspense, parallel data fetching, or Next.js fetch options
---

# Data Fetching Patterns

Fetch data in Next.js — Server Components, caching, revalidation, static generation, streaming with Suspense, and parallel fetching.

## Server Component Fetching (Default)

```tsx
// app/dashboard/page.tsx — Server Component (default, no "use client")
// This runs on the server only — no client bundle, no useEffect needed

export default async function DashboardPage() {
  // Direct async/await — no hooks, no loading state management
  const stats = await getStats();
  const recentOrders = await getRecentOrders();

  return (
    <div>
      <StatsCards stats={stats} />
      <OrdersTable orders={recentOrders} />
    </div>
  );
}

// ✅ No useEffect, no useState, no loading states
// ✅ Direct database/API access — no API route needed
// ✅ Sensitive data (API keys, DB connections) never reaches client
// ✅ Automatic request deduplication during render
```

## Fetch Caching & Revalidation

### fetch() Options

```tsx
// Default: cached indefinitely (static)
const data = await fetch("https://api.example.com/data");

// Revalidate every 60 seconds (ISR — Incremental Static Regeneration)
const data = await fetch("https://api.example.com/data", {
  next: { revalidate: 60 },
});

// No caching — always fresh (dynamic)
const data = await fetch("https://api.example.com/data", {
  cache: "no-store",
});

// Tag-based revalidation
const data = await fetch("https://api.example.com/products", {
  next: { tags: ["products"] },
});
// Then in a Server Action:
// revalidateTag("products");
```

### Non-fetch Data Sources

```tsx
import { unstable_cache } from "next/cache";

// Cache database queries (not using fetch)
const getCachedUser = unstable_cache(
  async (userId: string) => {
    return db.query("SELECT * FROM users WHERE id = $1", [userId]);
  },
  ["user"],                   // Cache key prefix
  {
    revalidate: 3600,         // 1 hour
    tags: ["users"],          // Tag for manual invalidation
  }
);

// Usage
const user = await getCachedUser("usr_123");
```

### Request Memoization

```tsx
// React automatically deduplicates identical fetch calls during a single render

// layout.tsx
async function Layout({ children }) {
  const user = await getUser(); // fetch #1
  return <Header user={user}>{children}</Header>;
}

// page.tsx
async function Page() {
  const user = await getUser(); // fetch #2 — SAME request, deduplicated!
  return <Dashboard user={user} />;
}

// Only ONE actual fetch happens — React memoizes within the same render pass

// For non-fetch functions, use React.cache()
import { cache } from "react";

export const getUser = cache(async (userId: string) => {
  const user = await db.user.findUnique({ where: { id: userId } });
  return user;
});
```

## Static Generation (generateStaticParams)

```tsx
// app/blog/[slug]/page.tsx
// Build all blog post pages at build time

export async function generateStaticParams() {
  const posts = await db.post.findMany({ select: { slug: true } });

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

// Dynamic params behavior
export const dynamicParams = true;  // true = generate on-demand if not pre-built
                                     // false = 404 for paths not in generateStaticParams

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return <article>{post.content}</article>;
}
```

### ISR (Incremental Static Regeneration)

```tsx
// Time-based revalidation
export const revalidate = 3600; // Revalidate page every hour

// OR per-fetch revalidation
async function getProducts() {
  const res = await fetch("https://api.example.com/products", {
    next: { revalidate: 60 }, // Every 60 seconds
  });
  return res.json();
}
```

## On-Demand Revalidation

```tsx
// app/actions.ts
"use server";

import { revalidatePath, revalidateTag } from "next/cache";

// Revalidate by path
export async function updateProduct(id: string, data: ProductInput) {
  await db.product.update({ where: { id }, data });

  revalidatePath("/products");          // Revalidate product listing
  revalidatePath(`/products/${id}`);    // Revalidate specific product page
}

// Revalidate by tag (more granular)
export async function updateInventory(productId: string, stock: number) {
  await db.product.update({
    where: { id: productId },
    data: { stock },
  });

  revalidateTag("products");     // All fetches tagged "products" are invalidated
  revalidateTag(`product-${productId}`); // Specific product
}

// Tag your fetches
async function getProduct(id: string) {
  const res = await fetch(`https://api.example.com/products/${id}`, {
    next: { tags: ["products", `product-${id}`] },
  });
  return res.json();
}
```

## Streaming with Suspense

```tsx
// app/dashboard/page.tsx
import { Suspense } from "react";

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* These load independently — fast parts show first */}
      <Suspense fallback={<StatsSkeleton />}>
        <Stats />     {/* Async Server Component */}
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />  {/* Slow — streams in when ready */}
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <RecentOrders />  {/* Independent loading */}
      </Suspense>
    </div>
  );
}

// Each component fetches its own data
async function Stats() {
  const stats = await getStats();         // Fast query
  return <StatsCards stats={stats} />;
}

async function RevenueChart() {
  const revenue = await getMonthlyRevenue(); // Slow aggregation
  return <Chart data={revenue} />;
}

async function RecentOrders() {
  const orders = await getRecentOrders();
  return <OrdersTable orders={orders} />;
}
```

## Parallel Data Fetching

```tsx
// ❌ SLOW: Sequential fetching (waterfall)
export default async function Page() {
  const user = await getUser();       // 100ms
  const orders = await getOrders();   // 200ms
  const stats = await getStats();     // 150ms
  // Total: 450ms (sequential)
}

// ✅ FAST: Parallel fetching
export default async function Page() {
  const [user, orders, stats] = await Promise.all([
    getUser(),       // 100ms ─┐
    getOrders(),     // 200ms ─┤ All start at the same time
    getStats(),      // 150ms ─┘
  ]);
  // Total: 200ms (parallel, limited by slowest)

  return (
    <div>
      <UserCard user={user} />
      <OrdersTable orders={orders} />
      <StatsCards stats={stats} />
    </div>
  );
}

// ✅ BEST: Suspense streaming (each part appears independently)
export default function Page() {
  return (
    <div>
      <Suspense fallback={<UserSkeleton />}>
        <UserCard />
      </Suspense>
      <Suspense fallback={<OrdersSkeleton />}>
        <OrdersTable />
      </Suspense>
      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />
      </Suspense>
    </div>
  );
}
```

## Route Segment Config

```tsx
// Control caching behavior per route segment

// Force dynamic rendering (no caching)
export const dynamic = "force-dynamic";

// Force static rendering (error if dynamic features used)
export const dynamic = "force-static";

// Default — auto-detect
export const dynamic = "auto";

// Revalidation interval
export const revalidate = 3600; // 1 hour
export const revalidate = 0;    // Always fresh
export const revalidate = false; // Cache indefinitely

// Runtime
export const runtime = "nodejs";  // Default
export const runtime = "edge";    // Edge runtime (lighter, faster cold start)

// Max duration for serverless functions
export const maxDuration = 30; // seconds
```

## Preloading Pattern

```tsx
// lib/data.ts — Preload function triggers fetch early
import { cache } from "react";

export const getUser = cache(async (id: string) => {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
});

export function preloadUser(id: string) {
  void getUser(id); // Start fetching but don't await
}

// app/user/[id]/page.tsx
import { getUser, preloadUser } from "@/lib/data";

export default async function UserPage({ params }: Props) {
  const { id } = await params;
  preloadUser(id); // Start fetch immediately

  // ... other work ...

  const user = await getUser(id); // Already fetching (or cached)
  return <UserProfile user={user} />;
}
```
