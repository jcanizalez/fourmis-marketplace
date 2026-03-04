---
description: When the user asks about Next.js caching, request memoization, Data Cache, Full Route Cache, Router Cache, cache invalidation, revalidatePath, revalidateTag, unstable_cache, or Next.js cache strategies
---

# Caching Patterns

Understand and control Next.js caching — the four cache layers, cache invalidation strategies, and when to opt out.

## The Four Cache Layers

```
Request → Router Cache (client) → Full Route Cache (server) → Data Cache (server) → Data Source
          ↑ in-memory             ↑ rendered HTML/RSC         ↑ fetch results        ↑ DB/API
          ↑ 30s-5min              ↑ until revalidated         ↑ until revalidated
```

| Cache | Where | What | Duration | Opt Out |
|-------|-------|------|----------|---------|
| **Request Memoization** | Server | Dedupe identical fetches in single render | Per request | N/A |
| **Data Cache** | Server | fetch() response cache | Indefinite (until revalidated) | `cache: "no-store"` |
| **Full Route Cache** | Server | Rendered HTML + RSC payload | Indefinite (until revalidated) | `dynamic = "force-dynamic"` |
| **Router Cache** | Client | RSC payload of visited routes | 30s (dynamic), 5min (static) | `router.refresh()` |

## Request Memoization

```tsx
// Automatic for fetch() — identical requests are deduplicated within one render

// layout.tsx calls getUser()
// page.tsx calls getUser()
// component.tsx calls getUser()
// → Only ONE actual fetch happens

// For non-fetch functions, use React.cache()
import { cache } from "react";

export const getUser = cache(async (id: string) => {
  // This runs only once per render, even if called multiple times
  return db.user.findUnique({ where: { id } });
});

// ⚠️ Memoization only lasts for the current render pass
// Next request = fresh memoization
```

## Data Cache

```tsx
// Cached indefinitely (default for fetch in Server Components)
const data = await fetch("https://api.example.com/data");

// Revalidate after 60 seconds
const data = await fetch("https://api.example.com/data", {
  next: { revalidate: 60 },
});

// Skip Data Cache entirely
const data = await fetch("https://api.example.com/data", {
  cache: "no-store",
});

// Tag for on-demand revalidation
const data = await fetch("https://api.example.com/products", {
  next: { tags: ["products"] },
});
```

### Caching Non-fetch Data

```tsx
import { unstable_cache } from "next/cache";

// Cache a database query
const getProducts = unstable_cache(
  async (category: string) => {
    return db.product.findMany({
      where: { category, status: "active" },
      orderBy: { createdAt: "desc" },
    });
  },
  ["products"],               // Cache key parts
  {
    revalidate: 3600,         // 1 hour
    tags: ["products"],       // For revalidateTag()
  }
);

// Usage
const products = await getProducts("electronics");

// Invalidate
revalidateTag("products"); // All cached getProducts calls are invalidated
```

## Full Route Cache

```tsx
// Static routes are rendered at build time and cached
// Dynamic routes are rendered at request time

// Force static (cached at build)
export const dynamic = "force-static";

// Force dynamic (never cached)
export const dynamic = "force-dynamic";

// Auto-detect (default) — static unless dynamic features used
// Dynamic features: cookies(), headers(), searchParams, uncached fetch

// These make a page dynamic automatically:
import { cookies, headers } from "next/headers";

export default async function Page() {
  const cookieStore = await cookies();  // ← Dynamic: reads cookies
  const session = cookieStore.get("session");
  // This page is now dynamically rendered
}
```

### What Makes a Route Dynamic

| Feature | Static? | Dynamic? |
|---------|---------|----------|
| No dynamic features | ✅ | |
| `cookies()` or `headers()` | | ✅ |
| `searchParams` prop | | ✅ |
| `fetch()` with `cache: "no-store"` | | ✅ |
| `dynamic = "force-dynamic"` | | ✅ |
| `revalidate = 0` | | ✅ |
| `fetch()` with `next: { revalidate: N }` | ✅ (ISR) | |

## Router Cache (Client-Side)

```tsx
"use client";

import { useRouter } from "next/navigation";

export function RefreshButton() {
  const router = useRouter();

  return (
    <button onClick={() => router.refresh()}>
      Refresh Data
    </button>
  );
  // router.refresh() invalidates the Router Cache for the current route
  // Re-fetches data from the server without a full page reload
}
```

## Cache Invalidation Strategies

### Path-Based

```tsx
"use server";

import { revalidatePath } from "next/cache";

export async function updateProduct(id: string, data: ProductInput) {
  await db.product.update({ where: { id }, data });

  // Revalidate specific pages
  revalidatePath("/products");              // Product listing
  revalidatePath(`/products/${id}`);        // Product detail
  revalidatePath("/", "layout");            // Everything from root layout down

  // Revalidate with "page" (default) or "layout" type
  revalidatePath("/products", "page");      // Only the page segment
  revalidatePath("/products", "layout");    // Page + all nested routes
}
```

### Tag-Based (Recommended)

```tsx
// 1. Tag your fetches
async function getProduct(id: string) {
  return fetch(`/api/products/${id}`, {
    next: { tags: [`product-${id}`, "products"] },
  }).then((r) => r.json());
}

async function getProducts() {
  return fetch("/api/products", {
    next: { tags: ["products"] },
  }).then((r) => r.json());
}

// 2. Invalidate by tag
"use server";

import { revalidateTag } from "next/cache";

export async function updateProduct(id: string, data: ProductInput) {
  await db.product.update({ where: { id }, data });

  revalidateTag(`product-${id}`);    // Invalidate this product only
  revalidateTag("products");          // Invalidate all product listings
}

export async function deleteProduct(id: string) {
  await db.product.delete({ where: { id } });

  revalidateTag("products");          // Invalidate everything tagged "products"
}
```

### On-Demand via Route Handler (Webhook)

```tsx
// app/api/revalidate/route.ts
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidation-secret");
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const { tag } = await request.json();
  revalidateTag(tag);

  return NextResponse.json({ revalidated: true, tag, now: Date.now() });
}

// Call from CMS webhook:
// POST /api/revalidate
// { "tag": "blog-posts" }
```

## Cache Debugging

```tsx
// next.config.js — enable logging
const nextConfig = {
  logging: {
    fetches: {
      fullUrl: true, // Log full fetch URLs and cache status
    },
  },
};

// Output:
// GET https://api.example.com/products 200 in 45ms (cache: HIT)
// GET https://api.example.com/users/123 200 in 120ms (cache: SKIP — no-store)
```

## Common Caching Patterns

### Static Page + Dynamic Component

```tsx
// Page is static (fast), but one section is dynamic
export default function ProductPage({ params }: Props) {
  return (
    <div>
      {/* Static: cached product info */}
      <ProductInfo productId={params.id} />

      {/* Dynamic: real-time stock */}
      <Suspense fallback={<StockSkeleton />}>
        <StockLevel productId={params.id} />
      </Suspense>

      {/* Dynamic: personalized recommendations */}
      <Suspense fallback={<RecsSkeleton />}>
        <Recommendations />
      </Suspense>
    </div>
  );
}

// This component opts out of cache
async function StockLevel({ productId }: { productId: string }) {
  const stock = await fetch(`/api/products/${productId}/stock`, {
    cache: "no-store", // Always fresh
  }).then((r) => r.json());

  return <p>{stock.available} in stock</p>;
}
```

### Stale-While-Revalidate

```tsx
// ISR: serve cached version, revalidate in background
export const revalidate = 60; // Every 60 seconds

export default async function ProductsPage() {
  // First request: renders and caches
  // Next 60s: serves cached version instantly
  // After 60s: serves stale, triggers background revalidation
  // Next request after revalidation: serves fresh version

  const products = await getProducts();
  return <ProductGrid products={products} />;
}
```

## Caching Decision Tree

```
Is the data the same for all users?
├── YES → Can it be stale for a few seconds/minutes?
│         ├── YES → ISR (revalidate: N) ← BEST PERFORMANCE
│         └── NO  → Dynamic with Suspense streaming
└── NO  → Is it personalized?
          ├── YES → Dynamic (force-dynamic or cookies()/headers())
          └── NO  → Check auth in middleware, cache per-role
```
