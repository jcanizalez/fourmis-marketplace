# Caching Strategies

Implement effective caching at every layer: browser, CDN, server, and application. Correct caching is the single biggest performance win for returning visitors.

## Cache Layers

```
User Request
  → Browser Cache (fastest — zero network)
    → CDN/Edge Cache (fast — close to user, no origin hit)
      → Server Cache (in-memory or Redis)
        → Application Cache (query results, computed data)
          → Origin (database, API)
```

## HTTP Cache Headers

### Cache-Control

```
Cache-Control: max-age=31536000, immutable
```

| Directive | Meaning |
|-----------|---------|
| `max-age=N` | Cache for N seconds |
| `s-maxage=N` | CDN cache time (overrides max-age for shared caches) |
| `no-cache` | Always revalidate with server (may still cache) |
| `no-store` | Never cache (sensitive data) |
| `immutable` | Content never changes — don't revalidate even on reload |
| `stale-while-revalidate=N` | Serve stale while revalidating in background |
| `public` | Cacheable by CDN and browser |
| `private` | Cacheable by browser only (not CDN) |

### Caching Strategy by Resource Type

| Resource | Cache-Control | Why |
|----------|--------------|-----|
| HTML pages | `no-cache` or `s-maxage=60, stale-while-revalidate=300` | Fresh content, but fast revalidation |
| JS/CSS (hashed) | `max-age=31536000, immutable` | Filename changes on content change |
| Images (hashed) | `max-age=31536000, immutable` | Same — hash in URL |
| API responses | `max-age=0, s-maxage=60, stale-while-revalidate=300` | CDN caches, browser doesn't |
| User-specific data | `private, no-cache` | Must not be cached by CDN |
| Auth tokens | `no-store` | Security-sensitive |

### Implementation Examples

```typescript
// Next.js API route caching
export async function GET() {
  const data = await fetchPosts();
  return Response.json(data, {
    headers: {
      // CDN caches for 60s, serves stale for 5min while revalidating
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}

// Express.js static files
app.use('/assets', express.static('public', {
  maxAge: '1y',
  immutable: true,
}));

// Express.js API responses
app.get('/api/posts', (req, res) => {
  res.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  res.json(posts);
});
```

```nginx
# Nginx — cache static assets for 1 year
location /assets/ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}

# Nginx — HTML pages with revalidation
location / {
  add_header Cache-Control "public, no-cache";
  # Or: add_header Cache-Control "public, s-maxage=60, stale-while-revalidate=300";
}
```

## Content Hashing (Cache Busting)

Content hashing ensures browsers fetch new versions when files change:

```
# Build output with content hash in filename
dist/
  main.a1b2c3.js       ← hash changes when code changes
  styles.d4e5f6.css     ← browser fetches new file automatically
  vendor.g7h8i9.js      ← vendor chunk cached until deps change
```

### Webpack/Next.js
Content hashing is automatic. Output filenames include hash:
```
.next/static/chunks/main-a1b2c3d4.js
.next/static/css/styles-e5f6g7h8.css
```

### Vite
Also automatic with content hashing in production build:
```javascript
// vite.config.ts — customize hash length
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
```

## Service Worker Caching

```typescript
// sw.ts — Workbox (recommended approach)
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache static assets (built files)
precacheAndRoute(self.__WB_MANIFEST);

// Cache-first for images (fast, infrequent changes)
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// Stale-while-revalidate for CSS/JS (fast + fresh)
registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script',
  new StaleWhileRevalidate({ cacheName: 'static-resources' })
);

// Network-first for API calls (fresh data, cache as fallback)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-responses',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 }),
    ],
  })
);
```

## Server-Side Caching

### In-Memory Cache (Node.js)
```typescript
// Simple LRU cache for expensive computations
const cache = new Map<string, { data: any; expiry: number }>();

function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key);

  if (entry && entry.expiry > now) {
    return Promise.resolve(entry.data as T);
  }

  return fn().then(data => {
    cache.set(key, { data, expiry: now + ttlMs });
    return data;
  });
}

// Usage
const posts = await cached('posts:all', 60_000, () => db.query('SELECT * FROM posts'));
```

### Redis Cache
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function cachedQuery<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached) as T;

  const data = await fn();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}

// Cache invalidation on write
async function updatePost(id: string, data: PostUpdate) {
  await db.posts.update(id, data);
  await redis.del(`post:${id}`);
  await redis.del('posts:all'); // Invalidate list cache too
}
```

## Next.js Caching (App Router)

```typescript
// fetch with cache control
const data = await fetch('https://api.example.com/posts', {
  next: { revalidate: 60 }, // ISR: revalidate every 60s
});

// Force no caching
const data = await fetch('https://api.example.com/user', {
  cache: 'no-store',
});

// On-demand revalidation (webhook, form submission)
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST() {
  revalidatePath('/posts');          // Revalidate by path
  revalidateTag('posts');            // Revalidate by cache tag
  return Response.json({ revalidated: true });
}

// Tag fetch requests for targeted revalidation
const data = await fetch('https://api.example.com/posts', {
  next: { tags: ['posts'] },
});
```

## ETag / Conditional Requests

```typescript
// Express.js — ETag for API responses
import crypto from 'crypto';

app.get('/api/data', async (req, res) => {
  const data = await getData();
  const json = JSON.stringify(data);
  const etag = crypto.createHash('md5').update(json).digest('hex');

  // Check if client has the latest version
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end(); // Not Modified — no body sent
  }

  res.set('ETag', etag);
  res.set('Cache-Control', 'no-cache'); // Always check, but use cache if unchanged
  res.json(data);
});
```

## Caching Checklist

1. [ ] Static assets (JS, CSS, images) have `max-age=1y, immutable` with content hashing
2. [ ] HTML pages use `no-cache` or `stale-while-revalidate`
3. [ ] API responses have appropriate `Cache-Control` (public vs private)
4. [ ] User-specific data uses `private, no-cache`
5. [ ] CDN is configured (Cloudflare, Vercel, CloudFront)
6. [ ] ETags enabled for API responses
7. [ ] Cache invalidation strategy exists (on write → purge)
8. [ ] Pre-fetching for likely-needed resources (`<link rel="prefetch">`)
9. [ ] Service Worker for offline support (if applicable)
10. [ ] Monitor cache hit rates (CDN dashboard, custom metrics)
