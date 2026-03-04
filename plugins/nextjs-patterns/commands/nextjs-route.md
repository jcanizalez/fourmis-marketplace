---
name: nextjs-route
description: Scaffold a new Next.js route with page, layout, loading, and error files
arguments:
  - name: path
    description: "Route path to create (e.g., /dashboard/settings, /blog/[slug])"
    required: true
  - name: type
    description: "Route type: page, api, or parallel (default: page)"
    required: false
---

# Scaffold Next.js Route

Create a complete Next.js App Router route at the specified path with all recommended files.

## Instructions

Based on the route path `$ARGUMENTS`, generate the appropriate files.

### 1. Determine Route Type

Analyze the path to determine:
- **Static route**: `/dashboard`, `/about` — no dynamic segments
- **Dynamic route**: `/blog/[slug]`, `/users/[id]` — has `[param]` segments
- **Catch-all**: `/docs/[...slug]` — matches any depth
- **API route**: if type is `api`, create `route.ts` instead of `page.tsx`
- **Parallel route**: if type is `parallel`, create `@slot` directories

### 2. Generate Files

For a **page route**, create these files in the `app/` directory:

#### page.tsx
```tsx
// Server Component by default
// Include generateMetadata for SEO
// Include generateStaticParams for dynamic routes
// Use proper TypeScript types for params and searchParams

export async function generateMetadata({ params }: Props) {
  return { title: "..." };
}

export default async function Page({ params, searchParams }: Props) {
  // Fetch data here (Server Component)
  return <div>...</div>;
}
```

#### layout.tsx (if the route needs its own layout)
```tsx
export default function Layout({ children }: { children: React.ReactNode }) {
  return <section>{children}</section>;
}
```

#### loading.tsx
```tsx
// Skeleton UI that shows while page loads
export default function Loading() {
  return <div className="animate-pulse">...</div>;
}
```

#### error.tsx
```tsx
"use client"; // Error boundaries must be Client Components

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

#### not-found.tsx (for dynamic routes)
```tsx
export default function NotFound() {
  return (
    <div>
      <h2>Not Found</h2>
      <p>Could not find the requested resource.</p>
    </div>
  );
}
```

For an **API route**, create:

#### route.ts
```tsx
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.json({ data: [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json({ data: body }, { status: 201 });
}
```

### 3. Dynamic Route Extras

If the route has dynamic segments like `[slug]` or `[id]`:

- Add `generateStaticParams` for static generation at build time
- Add `notFound()` call when the resource doesn't exist
- Add proper TypeScript types for the params

```tsx
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const items = await getItems();
  return items.map((item) => ({ slug: item.slug }));
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const item = await getItem(slug);
  if (!item) notFound();
  return <div>{item.title}</div>;
}
```

### 4. Adapt to Project

Before generating code:
1. Check the existing project structure for patterns (styling approach, data fetching patterns, component conventions)
2. Match the existing code style (semicolons, quotes, imports)
3. Use the project's existing UI components if available (e.g., shadcn/ui, Chakra, MUI)
4. Follow the project's data fetching approach (direct DB, API calls, ORM)

### 5. Output

Create all files and provide a summary:
- Files created
- Route URL that will be accessible
- Any additional setup needed (e.g., database queries, API endpoints)
