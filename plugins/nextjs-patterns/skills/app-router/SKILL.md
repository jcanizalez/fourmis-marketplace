---
description: When the user asks about Next.js App Router, file-based routing, layouts, loading states, error boundaries, parallel routes, intercepting routes, route groups, dynamic routes, not-found pages, or route handlers
---

# App Router Patterns

Master Next.js App Router — file-based routing, layouts, loading/error states, parallel routes, intercepting routes, and route handlers.

## File System Conventions

```
app/
├── layout.tsx              ← Root layout (required, wraps everything)
├── page.tsx                ← Home page (/)
├── not-found.tsx           ← Custom 404 page
├── error.tsx               ← Root error boundary
├── loading.tsx             ← Root loading UI
├── globals.css
│
├── (marketing)/            ← Route group (no URL segment)
│   ├── layout.tsx          ← Shared marketing layout
│   ├── about/page.tsx      ← /about
│   └── pricing/page.tsx    ← /pricing
│
├── (app)/                  ← Route group for authenticated area
│   ├── layout.tsx          ← Dashboard layout with sidebar
│   ├── dashboard/
│   │   ├── page.tsx        ← /dashboard
│   │   ├── loading.tsx     ← Dashboard loading skeleton
│   │   └── error.tsx       ← Dashboard error boundary
│   └── settings/
│       └── page.tsx        ← /settings
│
├── blog/
│   ├── page.tsx            ← /blog (list)
│   └── [slug]/             ← Dynamic segment
│       ├── page.tsx        ← /blog/my-post
│       └── not-found.tsx   ← Blog post 404
│
├── docs/
│   └── [...slug]/          ← Catch-all segment
│       └── page.tsx        ← /docs/a, /docs/a/b, /docs/a/b/c
│
└── api/
    └── webhooks/
        └── route.ts        ← API route handler
```

## Root Layout (Required)

```tsx
// app/layout.tsx
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: {
    template: "%s | MyApp",
    default: "MyApp — Your tagline here",
  },
  description: "A production Next.js application",
  metadataBase: new URL("https://myapp.com"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <Providers>  {/* ThemeProvider, QueryProvider, etc. */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

## Nested Layouts

```tsx
// app/(app)/layout.tsx — Dashboard layout (persists across navigation)
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
// ✅ Sidebar and Header don't re-render when navigating between /dashboard and /settings
```

## Dynamic Routes

```tsx
// app/blog/[slug]/page.tsx
interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound(); // Renders nearest not-found.tsx
  }

  return <article>{post.content}</article>;
}

// Generate static pages at build time
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

// Metadata for SEO
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  };
}
```

### Catch-All Routes

```tsx
// app/docs/[...slug]/page.tsx
interface Props {
  params: Promise<{ slug: string[] }>;
}

export default async function DocsPage({ params }: Props) {
  const { slug } = await params;
  // slug = ['getting-started'] for /docs/getting-started
  // slug = ['api', 'auth', 'jwt'] for /docs/api/auth/jwt

  const path = slug.join("/");
  const doc = await getDoc(path);

  if (!doc) notFound();
  return <DocRenderer content={doc} />;
}
```

## Loading & Error States

```tsx
// app/(app)/dashboard/loading.tsx — Shows while page.tsx is loading
export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// app/(app)/dashboard/error.tsx — Catches errors in page.tsx
"use client"; // Error components must be Client Components

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="p-8 text-center">
      <h2 className="text-xl font-bold">Something went wrong</h2>
      <p className="mt-2 text-gray-600">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}
```

## Parallel Routes

```tsx
// app/(app)/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  analytics,
  activity,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;  // @analytics slot
  activity: React.ReactNode;   // @activity slot
}) {
  return (
    <div>
      {children}
      <div className="grid grid-cols-2 gap-4 mt-4">
        {analytics}
        {activity}
      </div>
    </div>
  );
}

// app/(app)/dashboard/@analytics/page.tsx — Loads independently
export default async function AnalyticsSlot() {
  const data = await getAnalytics(); // Can be slow — doesn't block other slots
  return <AnalyticsChart data={data} />;
}

// app/(app)/dashboard/@analytics/loading.tsx — Independent loading state
export default function AnalyticsLoading() {
  return <ChartSkeleton />;
}

// app/(app)/dashboard/@activity/page.tsx
export default async function ActivitySlot() {
  const events = await getRecentActivity();
  return <ActivityFeed events={events} />;
}
```

## Intercepting Routes

```tsx
// Show a modal when navigating client-side, full page on hard navigation

// app/(app)/dashboard/@modal/(.)photo/[id]/page.tsx  ← Intercepting route (modal)
// app/photo/[id]/page.tsx                            ← Full page (direct URL)

// Convention: (.) = same level, (..) = one level up, (...) = root

// app/(app)/dashboard/@modal/(.)photo/[id]/page.tsx
export default async function PhotoModal({ params }: Props) {
  const { id } = await params;
  const photo = await getPhoto(id);

  return (
    <Dialog>
      <img src={photo.url} alt={photo.title} />
    </Dialog>
  );
}

// app/photo/[id]/page.tsx (full page for direct navigation)
export default async function PhotoPage({ params }: Props) {
  const { id } = await params;
  const photo = await getPhoto(id);

  return (
    <main>
      <img src={photo.url} alt={photo.title} />
      <h1>{photo.title}</h1>
    </main>
  );
}
```

## Route Handlers (API Routes)

```tsx
// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");

  const users = await getUsers({ page, limit: 20 });

  return NextResponse.json({ data: users });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Validate
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const user = await createUser(parsed.data);

  return NextResponse.json({ data: user }, { status: 201 });
}

// app/api/users/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUser(id);

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: user });
}
```

## Route Groups

```tsx
// Route groups organize routes without affecting the URL

// (marketing) group — public pages with marketing layout
// app/(marketing)/layout.tsx    ← Navbar + Footer
// app/(marketing)/about/page.tsx    → /about
// app/(marketing)/pricing/page.tsx  → /pricing

// (app) group — authenticated pages with dashboard layout
// app/(app)/layout.tsx          ← Sidebar + Auth check
// app/(app)/dashboard/page.tsx      → /dashboard
// app/(app)/settings/page.tsx       → /settings

// (auth) group — auth pages with minimal layout
// app/(auth)/layout.tsx         ← Centered card layout
// app/(auth)/login/page.tsx         → /login
// app/(auth)/register/page.tsx      → /register
```

## not-found.tsx

```tsx
// app/not-found.tsx — Global 404 page
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="mt-4 text-xl text-gray-600">Page not found</p>
      <Link
        href="/"
        className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Go Home
      </Link>
    </div>
  );
}
```
