---
description: When the user asks about API authentication, API keys, Bearer tokens, webhook signature verification, API key generation, API key rotation, scoped API keys, or authentication middleware for REST APIs
---

# API Authentication

## API Key Authentication

### Key Generation
```typescript
import crypto from "crypto";

// Generate a prefixed API key (prefix helps identify key type)
function generateAPIKey(prefix: string = "sk"): { key: string; hash: string } {
  const rawKey = crypto.randomBytes(32).toString("base64url");
  const key = `${prefix}_${rawKey}`; // sk_aB3dE5fG7hI9jK...

  // Store ONLY the hash — never store the raw key
  const hash = crypto.createHash("sha256").update(key).digest("hex");

  return { key, hash };
}

// Usage
const { key, hash } = generateAPIKey("sk");
// Show `key` to user ONCE
// Store `hash` in database
```

### Key Storage Schema
```sql
CREATE TABLE api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  name        VARCHAR(255) NOT NULL,           -- "Production API Key"
  key_prefix  VARCHAR(10) NOT NULL,            -- "sk_aB3d" (for display)
  key_hash    VARCHAR(64) NOT NULL UNIQUE,     -- SHA-256 hash
  scopes      TEXT[] DEFAULT '{}',             -- ["read", "write"]
  last_used   TIMESTAMP,
  expires_at  TIMESTAMP,                       -- NULL = never expires
  created_at  TIMESTAMP DEFAULT NOW(),
  revoked_at  TIMESTAMP                        -- NULL = active
);
```

### Key Validation Middleware
```typescript
async function authenticateAPIKey(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing API key" });
  }

  const apiKey = authHeader.slice(7); // Remove "Bearer "
  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  const key = await db.apiKeys.findUnique({
    where: { keyHash, revokedAt: null },
    include: { user: true },
  });

  if (!key) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  if (key.expiresAt && key.expiresAt < new Date()) {
    return res.status(401).json({ error: "API key expired" });
  }

  // Update last used timestamp (async, don't block response)
  db.apiKeys.update({
    where: { id: key.id },
    data: { lastUsed: new Date() },
  }).catch(() => {}); // Fire and forget

  req.user = key.user;
  req.apiKey = key;
  next();
}
```

### Scoped Keys
```typescript
function requireScope(...scopes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return res.status(401).json({ error: "API key required" });
    }

    const hasAllScopes = scopes.every((s) => req.apiKey.scopes.includes(s));
    if (!hasAllScopes) {
      return res.status(403).json({
        error: "Insufficient scope",
        required: scopes,
        current: req.apiKey.scopes,
      });
    }

    next();
  };
}

// Usage
app.get("/api/data", authenticateAPIKey, requireScope("read"), getData);
app.post("/api/data", authenticateAPIKey, requireScope("write"), createData);
app.delete("/api/data/:id", authenticateAPIKey, requireScope("delete"), deleteData);
```

### Key Rotation
```typescript
// Create new key, give grace period, then revoke old
async function rotateAPIKey(oldKeyId: string, userId: string) {
  const { key: newKey, hash: newHash } = generateAPIKey("sk");

  // Create new key
  const newKeyRecord = await db.apiKeys.create({
    data: {
      userId,
      name: "Rotated key",
      keyPrefix: newKey.slice(0, 7),
      keyHash: newHash,
      scopes: (await db.apiKeys.findUnique({ where: { id: oldKeyId } }))!.scopes,
    },
  });

  // Schedule old key revocation (24h grace period)
  await scheduleRevocation(oldKeyId, new Date(Date.now() + 24 * 60 * 60 * 1000));

  return { newKey, newKeyId: newKeyRecord.id };
}
```

---

## Webhook Signature Verification

Verify that webhook requests come from the expected sender.

### Signing (Sender Side)
```typescript
function signWebhook(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  return `t=${timestamp},v1=${signature}`;
}

// Set header when sending webhook
const payload = JSON.stringify(eventData);
const signature = signWebhook(payload, webhookSecret);

await fetch(webhookUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Webhook-Signature": signature,
  },
  body: payload,
});
```

### Verification (Receiver Side)
```typescript
function verifyWebhookSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
  toleranceSec: number = 300, // 5 minutes
): boolean {
  // Parse signature header
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("=") as [string, string]),
  );

  const timestamp = parseInt(parts.t);
  const signature = parts.v1;

  // Check timestamp (prevents replay attacks)
  const age = Math.floor(Date.now() / 1000) - timestamp;
  if (age > toleranceSec) {
    throw new Error("Webhook signature too old");
  }

  // Verify signature
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected),
  );
}

// Express middleware
function webhookMiddleware(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers["x-webhook-signature"] as string;
    if (!signature) {
      return res.status(401).json({ error: "Missing signature" });
    }

    const rawBody = req.body; // Need raw body — use express.raw()
    try {
      const valid = verifyWebhookSignature(rawBody.toString(), signature, secret);
      if (!valid) {
        return res.status(401).json({ error: "Invalid signature" });
      }
    } catch (e) {
      return res.status(401).json({ error: (e as Error).message });
    }

    next();
  };
}
```

### Verifying Stripe Webhooks
```typescript
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"]!;

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );

      switch (event.type) {
        case "checkout.session.completed":
          handleCheckoutComplete(event.data.object);
          break;
        case "invoice.payment_failed":
          handlePaymentFailed(event.data.object);
          break;
      }

      res.json({ received: true });
    } catch (err) {
      res.status(400).json({ error: `Webhook Error: ${(err as Error).message}` });
    }
  },
);
```

---

## Rate Limiting by API Key

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "60 s"), // 100 req/min
});

async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const identifier = req.apiKey?.id || req.ip;

  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  res.setHeader("X-RateLimit-Limit", limit);
  res.setHeader("X-RateLimit-Remaining", remaining);
  res.setHeader("X-RateLimit-Reset", reset);

  if (!success) {
    return res.status(429).json({
      error: "Rate limit exceeded",
      retryAfter: Math.ceil((reset - Date.now()) / 1000),
    });
  }

  next();
}
```

### Tiered Rate Limits
```typescript
const TIER_LIMITS: Record<string, { requests: number; window: string }> = {
  free:       { requests: 100,   window: "60 s" },
  pro:        { requests: 1000,  window: "60 s" },
  enterprise: { requests: 10000, window: "60 s" },
};

async function tieredRateLimit(req: Request, res: Response, next: NextFunction) {
  const tier = req.apiKey?.tier || "free";
  const config = TIER_LIMITS[tier];

  const limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
  });

  const { success, remaining, reset } = await limiter.limit(req.apiKey!.id);
  // ...
}
```

---

## Auth Middleware Stack

### Complete Express Auth Setup
```typescript
// Order matters — apply from broadest to narrowest
app.use(rateLimitMiddleware);              // 1. Rate limit all requests
app.use(authenticateAPIKey);                // 2. Identify the caller

// Public routes
app.get("/api/status", getStatus);

// Authenticated routes
app.get("/api/data", requireScope("read"), getData);
app.post("/api/data", requireScope("write"), createData);

// Admin routes
app.delete("/api/data/:id",
  requireScope("admin"),
  authorize(canDeleteResource),
  deleteData,
);
```

---

## Quick Reference

| Pattern | Use Case |
|---------|----------|
| API key (Bearer) | Third-party API access |
| Scoped keys | Limit what each key can do |
| Key rotation with grace period | Zero-downtime key changes |
| Webhook signatures (HMAC) | Verify webhook authenticity |
| Tiered rate limiting | Usage-based API tiers |
| `timingSafeEqual` | Prevent timing attacks on secrets |
| Key prefix display | Show `sk_aB3d...` in dashboards |
| Hash-only storage | Stolen DB can't compromise keys |
