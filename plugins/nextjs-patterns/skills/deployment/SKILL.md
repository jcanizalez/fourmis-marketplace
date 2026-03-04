---
description: When the user asks about Next.js deployment, next.config.js, image optimization, font optimization, bundle analysis, Docker deployment, Vercel deployment, self-hosted Next.js, environment variables, or security headers
---

# Deployment & Optimization Patterns

Deploy and optimize Next.js applications — configuration, image/font optimization, bundle analysis, Docker, Vercel, self-hosted, environment variables, and security headers.

## next.config.js

```js
// next.config.ts (TypeScript supported in Next.js 15+)
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strict mode for catching bugs
  reactStrictMode: true,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.example.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Redirects
  async redirects() {
    return [
      {
        source: "/old-blog/:slug",
        destination: "/blog/:slug",
        permanent: true, // 308
      },
    ];
  },

  // Headers (security)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // Environment variable validation
  env: {},

  // Experimental features
  experimental: {
    // Enable PPR (Partial Prerendering) when stable
    // ppr: true,
  },
};

export default nextConfig;
```

## Security Headers

```ts
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Tighten in production
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.example.com",
    ].join("; "),
  },
];
```

## Image Optimization

```tsx
import Image from "next/image";

// Local image (auto-sized at build time)
import heroImage from "@/public/hero.jpg";

export function Hero() {
  return (
    <Image
      src={heroImage}
      alt="Hero image"
      placeholder="blur"    // Blur-up effect while loading
      priority               // Preload (above the fold)
      className="w-full h-auto"
    />
  );
}

// Remote image (must specify dimensions or use fill)
export function UserAvatar({ url, name }: { url: string; name: string }) {
  return (
    <Image
      src={url}
      alt={name}
      width={48}
      height={48}
      className="rounded-full"
    />
  );
}

// Fill parent container
export function CoverImage({ url, alt }: { url: string; alt: string }) {
  return (
    <div className="relative aspect-video">
      <Image
        src={url}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover rounded-lg"
      />
    </div>
  );
}

// ⚠️ Always provide 'sizes' with 'fill' — prevents downloading oversized images
// ⚠️ Use 'priority' only for above-the-fold images (LCP)
```

## Font Optimization

```tsx
// app/layout.tsx — Google Fonts (zero layout shift, self-hosted)
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",            // Prevent invisible text during load
  variable: "--font-inter",   // CSS variable for Tailwind
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}

// tailwind.config.ts
// fontFamily: {
//   sans: ["var(--font-inter)", ...defaultTheme.fontFamily.sans],
//   mono: ["var(--font-mono)", ...defaultTheme.fontFamily.mono],
// }

// Local font
import localFont from "next/font/local";

const myFont = localFont({
  src: [
    { path: "../fonts/MyFont-Regular.woff2", weight: "400" },
    { path: "../fonts/MyFont-Bold.woff2", weight: "700" },
  ],
  variable: "--font-custom",
});
```

## Bundle Analysis

```bash
# Install analyzer
npm install @next/bundle-analyzer

# next.config.ts
import withBundleAnalyzer from "@next/bundle-analyzer";

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withAnalyzer(nextConfig);

# Run analysis
ANALYZE=true npm run build
# Opens browser with bundle visualization
```

### Common Bundle Issues

```tsx
// ❌ Importing entire library
import { format } from "date-fns";
// Pulls in ALL of date-fns

// ✅ Import specific function (tree-shakeable)
import format from "date-fns/format";

// ❌ Large client component
"use client";
import { Editor } from "@/components/editor"; // 500KB!

// ✅ Dynamic import with loading state
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@/components/editor"), {
  loading: () => <EditorSkeleton />,
  ssr: false, // Client-only component
});
```

## Environment Variables

```bash
# .env.local (git-ignored, local development)
DATABASE_URL=postgresql://localhost/mydb
JWT_SECRET=dev-secret-key

# .env (checked into git, defaults)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# .env.production (production overrides)
NEXT_PUBLIC_APP_URL=https://myapp.com
```

```tsx
// Server-side only (no NEXT_PUBLIC_ prefix)
const dbUrl = process.env.DATABASE_URL;         // ✅ Only on server
const secret = process.env.JWT_SECRET;           // ✅ Only on server

// Client-side (NEXT_PUBLIC_ prefix required)
const appUrl = process.env.NEXT_PUBLIC_APP_URL;  // ✅ Available on client

// ❌ This will be undefined on the client
const secret = process.env.JWT_SECRET;           // undefined in "use client" components
```

### Validation with Zod

```tsx
// lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "production", "test"]),
});

export const env = envSchema.parse(process.env);
// Throws at startup if any env var is missing/invalid
```

## Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Don't run as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

```js
// next.config.ts — enable standalone output for Docker
const nextConfig: NextConfig = {
  output: "standalone", // Creates minimal server.js
};
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/mydb
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mydb
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel                    # Preview deployment
vercel --prod             # Production deployment

# Environment variables
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
```

## Performance Checklist

- [ ] Use `next/image` for all images (auto-optimization, lazy loading)
- [ ] Use `next/font` for fonts (zero CLS, self-hosted)
- [ ] Set `priority` on LCP image only
- [ ] Use `sizes` attribute on all `fill` images
- [ ] Dynamic import heavy client components (`next/dynamic`)
- [ ] Use Server Components by default (smaller bundle)
- [ ] Use Suspense for streaming slow data
- [ ] Set `revalidate` on cacheable pages (ISR)
- [ ] Check bundle size with `@next/bundle-analyzer`
- [ ] Set security headers in `next.config.ts`
- [ ] Validate env vars at startup with Zod
- [ ] Use `standalone` output for Docker
