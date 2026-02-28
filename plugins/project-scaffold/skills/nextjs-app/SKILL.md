# Next.js App Scaffolding

Generate production-ready Next.js applications with App Router, TypeScript, Tailwind CSS, and modern tooling.

## Project Structure

```
my-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with metadata
│   │   ├── page.tsx            # Home page
│   │   ├── loading.tsx         # Loading UI
│   │   ├── error.tsx           # Error boundary
│   │   ├── not-found.tsx       # 404 page
│   │   ├── globals.css         # Global styles + Tailwind
│   │   ├── api/
│   │   │   └── health/
│   │   │       └── route.ts    # Health check endpoint
│   │   └── (auth)/
│   │       ├── login/
│   │       │   └── page.tsx
│   │       └── layout.tsx      # Auth group layout
│   ├── components/
│   │   ├── ui/                 # Reusable UI primitives
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   └── card.tsx
│   │   └── layout/
│   │       ├── header.tsx
│   │       ├── footer.tsx
│   │       └── sidebar.tsx
│   ├── lib/
│   │   ├── utils.ts            # Utility functions (cn, formatDate, etc.)
│   │   ├── constants.ts        # App constants
│   │   └── validations.ts      # Zod schemas
│   ├── hooks/
│   │   └── use-media-query.ts  # Custom hooks
│   ├── types/
│   │   └── index.ts            # Shared TypeScript types
│   └── styles/
│       └── fonts.ts            # Font configuration
├── public/
│   ├── favicon.ico
│   └── images/
├── tests/
│   ├── setup.ts
│   └── components/
├── .github/
│   └── workflows/
│       └── ci.yml
├── .env.example
├── .env.local                  # (gitignored)
├── .gitignore
├── .eslintrc.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── package.json
└── README.md
```

## Key Files

### package.json

```json
{
  "name": "my-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0",
    "prettier": "^3.4.0",
    "prettier-plugin-tailwindcss": "^0.6.0",
    "vitest": "^3.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "@testing-library/react": "^16.0.0",
    "jsdom": "^25.0.0"
  }
}
```

### next.config.ts

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Add remote image domains here
      // { protocol: "https", hostname: "example.com" },
    ],
  },

  // Redirect www to non-www (or vice versa)
  // async redirects() {
  //   return [
  //     { source: "/:path*", has: [{ type: "host", value: "www.example.com" }], destination: "https://example.com/:path*", permanent: true },
  //   ];
  // },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### Root Layout

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "My App",
    template: "%s | My App",
  },
  description: "A Next.js application",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "My App",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
```

### Utility: cn() helper

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function absoluteUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${path}`;
}
```

### Tailwind v4 globals.css

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --color-background: #ffffff;
  --color-foreground: #0a0a0a;
  --color-primary: #2563eb;
  --color-primary-foreground: #ffffff;
  --color-muted: #f5f5f5;
  --color-muted-foreground: #737373;
  --color-border: #e5e5e5;
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
}

@media (prefers-color-scheme: dark) {
  @theme {
    --color-background: #0a0a0a;
    --color-foreground: #ededed;
    --color-primary: #3b82f6;
    --color-muted: #1a1a1a;
    --color-muted-foreground: #a3a3a3;
    --color-border: #2a2a2a;
  }
}
```

### .env.example

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Database (uncomment when ready)
# DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# Auth (uncomment when ready)
# NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
# NEXTAUTH_URL=http://localhost:3000
```

### GitHub Actions CI

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run format:check
      - run: npm run build
      - run: npm test -- --run
```

## Variants

### With Database (Drizzle + PostgreSQL)

Add to the scaffold:
- `src/db/schema.ts` — Drizzle schema
- `src/db/index.ts` — Database connection
- `drizzle.config.ts` — Migration config
- `drizzle/` — Migration directory

```typescript
// src/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connection = postgres(process.env.DATABASE_URL!);
export const db = drizzle(connection, { schema });
```

### With Authentication (NextAuth.js v5)

Add to the scaffold:
- `src/auth.ts` — Auth configuration
- `src/app/api/auth/[...nextauth]/route.ts` — Auth API route
- `src/middleware.ts` — Protected route middleware

### With tRPC

Add to the scaffold:
- `src/trpc/client.ts` — tRPC client
- `src/trpc/server.ts` — tRPC server caller
- `src/trpc/routers/` — tRPC routers
- `src/app/api/trpc/[trpc]/route.ts` — tRPC handler

## Checklist After Scaffolding

1. Replace "my-app" with actual project name in package.json
2. Update metadata in layout.tsx (title, description, OG image)
3. Set up `.env.local` from `.env.example`
4. Run `npm install`
5. Run `npm run dev` to verify
6. Customize Tailwind theme colors
7. Add database if needed (Drizzle + PostgreSQL recommended)
8. Set up deployment (Vercel recommended for Next.js)
