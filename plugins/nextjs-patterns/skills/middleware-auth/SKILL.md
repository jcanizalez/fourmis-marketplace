---
description: When the user asks about Next.js middleware, authentication in Next.js, protected routes, NextAuth, Auth.js, session cookies, role-based access, middleware redirect, middleware rewrite, or Next.js auth patterns
---

# Middleware & Authentication Patterns

Protect routes, handle redirects, and implement authentication in Next.js. Covers middleware patterns, session cookies, Auth.js (NextAuth), role-based access, and protected API routes.

## Middleware Basics

```tsx
// middleware.ts (root of project — runs on EVERY request)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Example: redirect /old-path to /new-path
  if (pathname === "/old-path") {
    return NextResponse.redirect(new URL("/new-path", request.url));
  }

  // Example: rewrite /blog to /posts (internal rewrite, URL stays /blog)
  if (pathname === "/blog") {
    return NextResponse.rewrite(new URL("/posts", request.url));
  }

  // Example: add custom headers
  const response = NextResponse.next();
  response.headers.set("x-custom-header", "my-value");
  return response;
}

// Only run middleware on specific paths
export const config = {
  matcher: [
    // Match all paths except static files and API routes
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
```

## Auth Middleware (Session Cookie)

```tsx
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/", "/login", "/register", "/about", "/pricing"];
const AUTH_PATHS = ["/login", "/register"]; // Redirect to dashboard if already logged in

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets
  if (pathname.startsWith("/_next") || pathname.startsWith("/api/webhooks")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("session-token")?.value;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthPath = AUTH_PATHS.includes(pathname);

  // Verify session
  let session: { userId: string; role: string } | null = null;
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
      const { payload } = await jwtVerify(token, secret);
      session = { userId: payload.sub as string, role: payload.role as string };
    } catch {
      // Invalid/expired token — clear it
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("session-token");
      return response;
    }
  }

  // Already logged in → redirect away from auth pages
  if (session && isAuthPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Not logged in → redirect to login (unless public path)
  if (!session && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Add user info to headers (accessible in Server Components)
  const response = NextResponse.next();
  if (session) {
    response.headers.set("x-user-id", session.userId);
    response.headers.set("x-user-role", session.role);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

## Auth.js (NextAuth v5) Integration

```tsx
// auth.ts
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { comparePassword } from "@/lib/password";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    Google({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user || !user.password) return null;

        const valid = await comparePassword(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
```

### Auth.js Middleware

```tsx
// middleware.ts
export { auth as middleware } from "@/auth";

// OR custom middleware with auth
import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isPublicPage = ["/", "/login", "/register"].includes(req.nextUrl.pathname);

  if (!isLoggedIn && !isPublicPage) {
    return Response.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

### Auth.js in Server Components

```tsx
// app/(app)/dashboard/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div>
      <h1>Welcome, {session.user.name}</h1>
      <p>Role: {session.user.role}</p>
    </div>
  );
}
```

### Auth.js in Server Actions

```tsx
"use server";

import { auth } from "@/auth";

export async function createPost(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  await db.post.create({
    data: {
      title: formData.get("title") as string,
      authorId: session.user.id,
    },
  });
}
```

### Sign In / Sign Out

```tsx
// app/login/page.tsx
import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <div>
      <form
        action={async () => {
          "use server";
          await signIn("github", { redirectTo: "/dashboard" });
        }}
      >
        <button type="submit">Sign in with GitHub</button>
      </form>

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/dashboard" });
        }}
      >
        <button type="submit">Sign in with Google</button>
      </form>

      {/* Credentials form */}
      <form
        action={async (formData: FormData) => {
          "use server";
          await signIn("credentials", {
            email: formData.get("email"),
            password: formData.get("password"),
            redirectTo: "/dashboard",
          });
        }}
      >
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Password" required />
        <button type="submit">Sign in</button>
      </form>
    </div>
  );
}

// Sign out button
import { signOut } from "@/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button type="submit">Sign out</button>
    </form>
  );
}
```

## Role-Based Access

```tsx
// lib/auth.ts — Helper for role checks
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const session = await auth();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(role: string) {
  const session = await requireAuth();
  if (session.user.role !== role) {
    redirect("/unauthorized");
  }
  return session;
}

// Usage in pages
export default async function AdminPage() {
  const session = await requireRole("admin");
  return <AdminDashboard user={session.user} />;
}

// Usage in Server Actions
export async function deleteUser(userId: string) {
  const session = await requireRole("admin");
  await db.user.delete({ where: { id: userId } });
}
```

## Protecting API Route Handlers

```tsx
// app/api/admin/users/route.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await db.user.findMany();
  return NextResponse.json({ data: users });
}
```

## Middleware Best Practices

| Practice | Details |
|----------|---------|
| Keep middleware lightweight | It runs on every matched request — don't do DB queries |
| Use edge-compatible libraries | Middleware runs on Edge Runtime (no Node.js APIs) |
| Use `matcher` to exclude static files | `/((?!_next/static\|_next/image\|favicon.ico).*)` |
| Pass user info via headers | Set `x-user-id` in middleware, read in Server Components |
| Handle token refresh in middleware | Check expiry, refresh if needed, set new cookie |
| Don't block public pages | Check path before requiring auth |
