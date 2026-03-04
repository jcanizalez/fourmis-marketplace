---
description: When the user asks about rate limiting, API throttling, token bucket, sliding window, rate limit headers, X-RateLimit, Redis rate limiting, per-key limits, or retry-after
---

# Rate Limiting Patterns

Protect your API from abuse with rate limiting. Covers token bucket, sliding window, fixed window algorithms, Redis-based distributed limiting, per-key/per-IP strategies, and proper HTTP headers.

## Rate Limiting Algorithms

### Fixed Window

Simplest approach. Count requests per time window (e.g., 100 per minute).

```
Window: 12:00 - 12:01 → 100 requests allowed
Window: 12:01 - 12:02 → counter resets
Problem: Burst at boundary (100 at 12:00:59 + 100 at 12:01:00 = 200 in 2 seconds)
```

### Sliding Window Log

Precise but memory-heavy. Store timestamp of every request.

```
Window: last 60 seconds from NOW
→ Remove entries older than 60s
→ Count remaining
→ If count >= limit → reject
```

### Sliding Window Counter

Compromise between fixed window and sliding log. Weighted average of current and previous window.

```
Previous window: 80 requests (40% of window elapsed)
Current window: 30 requests (60% of window elapsed)
Weighted count: 80 × 0.4 + 30 = 62 requests
```

### Token Bucket (Recommended)

Best for APIs — allows bursts while enforcing average rate.

```
Bucket: 100 tokens max (burst capacity)
Refill: 10 tokens per second (sustained rate)
Each request: consumes 1 token
Empty bucket: reject (429)
```

## Node.js — In-Memory Rate Limiter

```typescript
// Simple token bucket for single-instance apps
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillRate: number // tokens per second
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  consume(count = 1): { allowed: boolean; remaining: number; retryAfter?: number } {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return { allowed: true, remaining: Math.floor(this.tokens) };
    }

    const waitTime = Math.ceil((count - this.tokens) / this.refillRate);
    return { allowed: false, remaining: 0, retryAfter: waitTime };
  }

  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}
```

## Redis — Distributed Sliding Window

```typescript
import { Redis } from "ioredis";

const redis = new Redis();

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // Unix timestamp
  retryAfter?: number; // seconds
}

async function slidingWindowRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;
  const resetAt = Math.ceil((now + windowMs) / 1000);

  // Lua script for atomicity
  const script = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local window_start = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    local window_ms = tonumber(ARGV[4])

    -- Remove expired entries
    redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

    -- Count current entries
    local count = redis.call('ZCARD', key)

    if count < limit then
      -- Add this request
      redis.call('ZADD', key, now, now .. '-' .. math.random(1000000))
      redis.call('PEXPIRE', key, window_ms)
      return {1, limit - count - 1}  -- allowed, remaining
    else
      return {0, 0}  -- rejected
    end
  `;

  const [allowed, remaining] = (await redis.eval(
    script, 1, key, now, windowStart, limit, windowMs
  )) as [number, number];

  if (allowed === 1) {
    return { allowed: true, limit, remaining, resetAt };
  }

  return {
    allowed: false,
    limit,
    remaining: 0,
    resetAt,
    retryAfter: Math.ceil(windowMs / 1000),
  };
}
```

## Express Rate Limit Middleware

```typescript
interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
  keyGenerator: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  message?: string;
}

function rateLimitMiddleware(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `ratelimit:${config.keyGenerator(req)}`;

    const result = await slidingWindowRateLimit(key, config.limit, config.windowSeconds);

    // Always set rate limit headers
    res.set("X-RateLimit-Limit", config.limit.toString());
    res.set("X-RateLimit-Remaining", result.remaining.toString());
    res.set("X-RateLimit-Reset", result.resetAt.toString());

    if (!result.allowed) {
      res.set("Retry-After", (result.retryAfter || config.windowSeconds).toString());
      return res.status(429).json({
        type: "https://api.example.com/errors/rate-limit-exceeded",
        title: "Too Many Requests",
        status: 429,
        detail: config.message || `Rate limit of ${config.limit} requests per ${config.windowSeconds}s exceeded.`,
        retryAfter: result.retryAfter,
      });
    }

    next();
  };
}

// Key generators
const byIP = (req: Request) => req.ip || req.socket.remoteAddress || "unknown";
const byUser = (req: Request) => req.user?.id || byIP(req);
const byAPIKey = (req: Request) => req.headers["x-api-key"] as string || byIP(req);
const byRoute = (req: Request) => `${req.method}:${req.route?.path || req.path}:${byIP(req)}`;
```

### Apply to Routes

```typescript
// Global rate limit — 100 req/min per IP
app.use(rateLimitMiddleware({
  limit: 100,
  windowSeconds: 60,
  keyGenerator: byIP,
}));

// Strict limit on auth endpoints — 5 req/min per IP
app.use("/api/v1/auth/login", rateLimitMiddleware({
  limit: 5,
  windowSeconds: 60,
  keyGenerator: byIP,
  message: "Too many login attempts. Please try again later.",
}));

// Per-user limit on expensive operations — 10 req/hour
app.use("/api/v1/reports/generate", rateLimitMiddleware({
  limit: 10,
  windowSeconds: 3600,
  keyGenerator: byUser,
}));
```

## Go — Rate Limiting

### In-Memory (golang.org/x/time/rate)

```go
import "golang.org/x/time/rate"

// Per-IP rate limiters
type IPRateLimiter struct {
    mu       sync.RWMutex
    limiters map[string]*rate.Limiter
    rate     rate.Limit
    burst    int
}

func NewIPRateLimiter(r rate.Limit, b int) *IPRateLimiter {
    return &IPRateLimiter{
        limiters: make(map[string]*rate.Limiter),
        rate:     r,
        burst:    b,
    }
}

func (l *IPRateLimiter) GetLimiter(ip string) *rate.Limiter {
    l.mu.Lock()
    defer l.mu.Unlock()

    limiter, exists := l.limiters[ip]
    if !exists {
        limiter = rate.NewLimiter(l.rate, l.burst)
        l.limiters[ip] = limiter
    }
    return limiter
}

// Middleware
func RateLimitMiddleware(limiter *IPRateLimiter) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            ip := realIP(r)
            l := limiter.GetLimiter(ip)

            if !l.Allow() {
                w.Header().Set("Retry-After", "60")
                w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", limiter.burst))
                w.Header().Set("X-RateLimit-Remaining", "0")
                writeError(w, apierr.RateLimited(60))
                return
            }

            next.ServeHTTP(w, r)
        })
    }
}

// 10 requests per second, burst of 20
limiter := NewIPRateLimiter(10, 20)
mux.Handle("/api/v1/", RateLimitMiddleware(limiter)(apiHandler))
```

### Redis-Based (Distributed)

```go
func SlidingWindowLimit(ctx context.Context, rdb *redis.Client, key string, limit int, window time.Duration) (bool, int, error) {
    now := time.Now().UnixMilli()
    windowStart := now - window.Milliseconds()

    pipe := rdb.Pipeline()
    pipe.ZRemRangeByScore(ctx, key, "-inf", fmt.Sprintf("%d", windowStart))
    countCmd := pipe.ZCard(ctx, key)

    if _, err := pipe.Exec(ctx); err != nil {
        return false, 0, err
    }

    count := int(countCmd.Val())
    if count >= limit {
        return false, 0, nil
    }

    member := fmt.Sprintf("%d-%d", now, rand.Int63())
    rdb.ZAdd(ctx, key, redis.Z{Score: float64(now), Member: member})
    rdb.PExpire(ctx, key, window)

    remaining := limit - count - 1
    return true, remaining, nil
}
```

## Tiered Rate Limits

```typescript
// Different limits per plan
interface TierConfig {
  free: { limit: number; window: number };
  pro: { limit: number; window: number };
  enterprise: { limit: number; window: number };
}

const tiers: TierConfig = {
  free: { limit: 100, window: 3600 },       // 100/hour
  pro: { limit: 1000, window: 3600 },       // 1,000/hour
  enterprise: { limit: 10000, window: 3600 }, // 10,000/hour
};

function tieredRateLimit(req: Request, res: Response, next: NextFunction) {
  const plan = req.user?.plan || "free";
  const config = tiers[plan as keyof TierConfig];

  return rateLimitMiddleware({
    limit: config.limit,
    windowSeconds: config.window,
    keyGenerator: byAPIKey,
  })(req, res, next);
}
```

## Rate Limit Headers (Standard)

```
HTTP/1.1 200 OK
X-RateLimit-Limit: 100          ← Maximum requests per window
X-RateLimit-Remaining: 95       ← Requests remaining
X-RateLimit-Reset: 1709475600   ← Unix timestamp when window resets

HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1709475600
Retry-After: 45                 ← Seconds until client should retry
```

### IETF Draft Headers (Newer Standard)

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 45             ← Seconds until reset (not timestamp)
RateLimit-Policy: 100;w=3600    ← 100 requests per 3600s window
```

## Rate Limit Bypass

```typescript
// Skip rate limiting for internal services and health checks
function shouldSkipRateLimit(req: Request): boolean {
  // Health checks
  if (req.path === "/health" || req.path === "/ready") return true;

  // Internal services (trusted IPs or service mesh)
  if (req.headers["x-internal-service"] === process.env.INTERNAL_SECRET) return true;

  // Admin users
  if (req.user?.role === "admin") return true;

  return false;
}
```

## Best Practices

| Practice | Details |
|----------|---------|
| Always return rate limit headers | Clients need to know their limits |
| Use Redis for distributed apps | In-memory only works for single instance |
| Different limits per endpoint | Auth endpoints: strict. Read endpoints: generous |
| Include `Retry-After` on 429 | Tells clients exactly when to retry |
| Key by API key > user > IP | Most specific identifier available |
| Don't rate limit health checks | Monitoring needs unrestricted access |
| Log rate limit events | Track who hits limits and how often |
| Exponential backoff on client side | Double wait time on each 429 |
