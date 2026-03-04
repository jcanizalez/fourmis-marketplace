---
description: When the user asks about REST API design, resource naming, HTTP methods, status codes, API versioning, HATEOAS, idempotency, query parameters, or RESTful API best practices
---

# REST API Design Patterns

Design clean, consistent, and predictable REST APIs. Covers resource naming, HTTP methods, status codes, versioning, idempotency, and query parameter conventions.

## Resource Naming

```
# ✅ GOOD: Plural nouns, hierarchical, lowercase, hyphens
GET    /api/v1/users
GET    /api/v1/users/123
GET    /api/v1/users/123/orders
GET    /api/v1/users/123/orders/456
POST   /api/v1/users
PUT    /api/v1/users/123
PATCH  /api/v1/users/123
DELETE /api/v1/users/123

# ✅ GOOD: Multi-word resources use hyphens
GET    /api/v1/order-items
GET    /api/v1/shipping-addresses

# ❌ BAD: Verbs in URLs, singular, camelCase, underscores
GET    /api/v1/getUser/123
GET    /api/v1/user/123
POST   /api/v1/createOrder
GET    /api/v1/order_items
GET    /api/v1/orderItems
```

### Resource Relationships

```
# Direct children
GET    /api/v1/users/123/orders          → orders belonging to user 123
POST   /api/v1/users/123/orders          → create order for user 123

# Deeply nested (avoid > 2 levels — use query params instead)
GET    /api/v1/users/123/orders/456/items → ⚠️ too deep
GET    /api/v1/order-items?orderId=456    → ✅ better

# Non-CRUD actions — use sub-resources with verbs (exception to "no verbs" rule)
POST   /api/v1/orders/456/cancel         → cancel order
POST   /api/v1/users/123/verify-email    → send verification
POST   /api/v1/orders/456/refund         → refund order
POST   /api/v1/reports/generate          → trigger report generation
```

## HTTP Methods

| Method | Purpose | Idempotent | Body | Success |
|--------|---------|------------|------|---------|
| `GET` | Read resource(s) | ✅ Yes | No | 200 |
| `POST` | Create resource | ❌ No | Yes | 201 |
| `PUT` | Replace resource entirely | ✅ Yes | Yes | 200 |
| `PATCH` | Partial update | ❌ No* | Yes | 200 |
| `DELETE` | Remove resource | ✅ Yes | No | 204 |
| `HEAD` | Same as GET, no body | ✅ Yes | No | 200 |
| `OPTIONS` | Preflight / allowed methods | ✅ Yes | No | 204 |

*PATCH can be made idempotent with merge-patch semantics.

### PUT vs PATCH

```typescript
// PUT — replaces the entire resource (all fields required)
PUT /api/v1/users/123
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "admin",
  "avatar": "https://..."
}

// PATCH — partial update (only changed fields)
PATCH /api/v1/users/123
{
  "role": "admin"
}
// Other fields remain unchanged
```

## Status Codes

### Success (2xx)

| Code | When to Use |
|------|-------------|
| `200 OK` | GET, PUT, PATCH success. Include body. |
| `201 Created` | POST success. Include `Location` header + created resource. |
| `202 Accepted` | Async operation started (job queued). Include status URL. |
| `204 No Content` | DELETE success, or PUT/PATCH with no body to return. |

### Client Error (4xx)

| Code | When to Use |
|------|-------------|
| `400 Bad Request` | Malformed syntax, invalid JSON, missing required fields. |
| `401 Unauthorized` | No auth token, or token expired/invalid. |
| `403 Forbidden` | Authenticated but not authorized for this resource. |
| `404 Not Found` | Resource doesn't exist. |
| `405 Method Not Allowed` | Valid URL but wrong HTTP method. |
| `409 Conflict` | State conflict (duplicate email, concurrent edit). |
| `410 Gone` | Resource permanently deleted (useful for deprecation). |
| `415 Unsupported Media Type` | Wrong Content-Type header. |
| `422 Unprocessable Entity` | Valid JSON but semantic errors (business logic validation). |
| `429 Too Many Requests` | Rate limit exceeded. Include `Retry-After`. |

### Server Error (5xx)

| Code | When to Use |
|------|-------------|
| `500 Internal Server Error` | Unexpected server error. Log full details, return generic message. |
| `502 Bad Gateway` | Upstream service returned invalid response. |
| `503 Service Unavailable` | Temporary overload or maintenance. Include `Retry-After`. |
| `504 Gateway Timeout` | Upstream service didn't respond in time. |

## API Versioning

### URL Path Versioning (Recommended)

```
GET /api/v1/users
GET /api/v2/users
```

```typescript
// Express
const v1Router = express.Router();
const v2Router = express.Router();

app.use("/api/v1", v1Router);
app.use("/api/v2", v2Router);

// Go
mux.Handle("/api/v1/", http.StripPrefix("/api/v1", v1Handler))
mux.Handle("/api/v2/", http.StripPrefix("/api/v2", v2Handler))
```

### Header Versioning

```
GET /api/users
Accept: application/vnd.myapp.v2+json
```

### Query Parameter Versioning

```
GET /api/users?version=2
```

### Versioning Best Practices

1. Start with `/api/v1/` from day one — retrofitting is painful
2. Only bump versions for breaking changes (removing/renaming fields, changing types)
3. Non-breaking changes (adding fields, new endpoints) don't need a new version
4. Deprecate old versions with `Sunset` and `Deprecation` headers
5. Give consumers at least 6 months to migrate

```typescript
// Deprecation headers
res.set("Deprecation", "true");
res.set("Sunset", "Sat, 01 Jun 2027 00:00:00 GMT");
res.set("Link", '</api/v2/users>; rel="successor-version"');
```

## Idempotency

Idempotency ensures that repeating the same request produces the same result — critical for payment processing, order creation, and any operation that must not be duplicated.

```typescript
// Client sends a unique idempotency key
POST /api/v1/orders
Idempotency-Key: ord_req_abc123def
Content-Type: application/json

{"items": [...], "total": 99.99}
```

### Server Implementation

```typescript
import { Redis } from "ioredis";

const redis = new Redis();
const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24 hours

async function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.method !== "POST" && req.method !== "PUT") return next();

  const key = req.headers["idempotency-key"] as string;
  if (!key) return next(); // Optional: require for POST

  const cacheKey = `idempotency:${req.path}:${key}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    const { statusCode, body } = JSON.parse(cached);
    return res.status(statusCode).json(body);
  }

  // Intercept response to cache it
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    redis.setex(cacheKey, IDEMPOTENCY_TTL, JSON.stringify({
      statusCode: res.statusCode,
      body,
    }));
    return originalJson(body);
  };

  next();
}
```

## Response Envelope

```typescript
// ✅ Consistent response structure
interface ApiResponse<T> {
  data: T;                          // The actual payload
  meta?: {                          // Pagination, counts
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

interface ApiError {
  error: {
    type: string;                   // Machine-readable error code
    title: string;                  // Human-readable summary
    detail: string;                 // Detailed explanation
    status: number;                 // HTTP status code
    errors?: ValidationError[];     // Field-level validation errors
  };
}

// Success response
{
  "data": {
    "id": "usr_123",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "createdAt": "2026-03-03T12:00:00Z"
  }
}

// Collection response
{
  "data": [
    { "id": "usr_123", "name": "Jane Doe" },
    { "id": "usr_456", "name": "John Smith" }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "perPage": 20,
    "totalPages": 8
  }
}
```

## Field Naming Conventions

```jsonc
// ✅ camelCase (JavaScript/TypeScript APIs)
{
  "id": "usr_123",
  "firstName": "Jane",
  "lastName": "Doe",
  "createdAt": "2026-03-03T12:00:00Z",    // ISO 8601 dates
  "updatedAt": "2026-03-03T14:30:00Z",
  "isActive": true,                         // boolean prefix: is/has/can
  "orderCount": 42                          // counts: noun + Count
}

// ✅ snake_case (Go, Python, Ruby APIs)
{
  "id": "usr_123",
  "first_name": "Jane",
  "created_at": "2026-03-03T12:00:00Z"
}

// Pick ONE convention and use it everywhere
```

## Request/Response Headers

```typescript
// Standard request headers
"Content-Type": "application/json"
"Accept": "application/json"
"Authorization": "Bearer eyJ..."
"Idempotency-Key": "req_abc123"
"X-Request-ID": "req_uuid_here"

// Standard response headers
"Content-Type": "application/json"
"X-Request-ID": "req_uuid_here"           // Echo back for debugging
"X-RateLimit-Limit": "100"                // Rate limit ceiling
"X-RateLimit-Remaining": "95"             // Requests remaining
"X-RateLimit-Reset": "1709475600"         // Reset timestamp
"Cache-Control": "public, max-age=3600"   // Caching policy
"ETag": "\"abc123\""                       // Content hash for conditional requests
"Location": "/api/v1/orders/789"          // After POST (201 Created)
```

## Conditional Requests (ETags)

```typescript
// GET with If-None-Match — avoid re-downloading unchanged data
GET /api/v1/users/123
If-None-Match: "etag_abc123"

// Server: data unchanged → 304 Not Modified (no body, saves bandwidth)
// Server: data changed  → 200 OK with new ETag

// PUT with If-Match — optimistic concurrency control
PUT /api/v1/users/123
If-Match: "etag_abc123"
{ "name": "Updated Name" }

// Server: ETag matches → apply update, return 200
// Server: ETag mismatch → 412 Precondition Failed (someone else modified)
```

## URL Design Checklist

- [ ] Use plural nouns for collections (`/users`, not `/user`)
- [ ] Use hyphens, not underscores (`/order-items`, not `/order_items`)
- [ ] Lowercase everything
- [ ] No file extensions (`.json`, `.xml`)
- [ ] No trailing slashes
- [ ] Max 2 levels of nesting
- [ ] Use query params for filtering, sorting, pagination
- [ ] Version in URL path (`/api/v1/`)
- [ ] Consistent ID format (prefixed: `usr_123`, `ord_456`)
