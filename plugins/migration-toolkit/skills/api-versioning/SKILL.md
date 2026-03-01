---
description: When the user asks about API versioning, API version strategies, deprecating API endpoints, sunset headers, breaking changes in APIs, backward compatibility, consumer migration, or managing API evolution
---

# API Versioning

Strategies for evolving APIs without breaking consumers. Covers versioning schemes, deprecation headers, migration communication, and backward compatibility patterns.

## Versioning Strategies

### Strategy 1: URL Path Versioning (Most Common)

```
GET /api/v1/users
GET /api/v2/users
```

```typescript
// Express / Node.js
import { Router } from 'express';

const v1Router = Router();
const v2Router = Router();

// v1 — original response shape
v1Router.get('/users', (req, res) => {
  const users = await getUsers();
  res.json(users); // Array of users
});

// v2 — paginated response with metadata
v2Router.get('/users', (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const { users, total } = await getUsersPaginated(page, limit);
  res.json({ data: users, total, page, limit }); // Envelope
});

app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);
```

| Pros | Cons |
|------|------|
| Easy to understand | URL pollution |
| Cache-friendly | Code duplication |
| Easy to route | Hard to deprecate cleanly |

### Strategy 2: Header Versioning

```
GET /api/users
Accept: application/vnd.myapp.v2+json
```

```typescript
app.get('/api/users', (req, res) => {
  const version = parseApiVersion(req.headers.accept); // 'v1' | 'v2'

  if (version === 'v2') {
    return res.json({ data: users, total, page, limit });
  }

  // Default to v1
  res.json(users);
});

function parseApiVersion(accept?: string): string {
  const match = accept?.match(/vnd\.myapp\.(v\d+)/);
  return match?.[1] ?? 'v1';
}
```

### Strategy 3: Query Parameter Versioning

```
GET /api/users?version=2
```

Simple but least clean. Use as a fallback, not primary.

### Strategy Comparison

| Strategy | Cacheable | Discoverable | Client Effort |
|----------|-----------|-------------|---------------|
| URL path (`/v2/`) | ✅ Easy | ✅ Easy | Low |
| Header (`Accept:`) | ⚠️ Varies | ❌ Hidden | Medium |
| Query param (`?v=2`) | ⚠️ Tricky | ⚠️ Ok | Low |
| Content negotiation | ⚠️ Varies | ❌ Hidden | High |

**Recommendation**: URL path versioning for public APIs, header versioning for internal APIs.

## Deprecation Headers

Signal to consumers that they're using a deprecated version:

```typescript
// Middleware for deprecated API versions
function deprecationMiddleware(sunsetDate: string, alternativeUrl: string) {
  return (req, res, next) => {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', sunsetDate); // RFC 8594
    res.setHeader('Link', `<${alternativeUrl}>; rel="successor-version"`);
    res.setHeader('X-API-Warn', `This API version is deprecated. Migrate to ${alternativeUrl} before ${sunsetDate}`);
    next();
  };
}

// Apply to v1 routes
app.use('/api/v1', deprecationMiddleware(
  'Sat, 01 Jun 2026 00:00:00 GMT',
  'https://api.example.com/v2'
));
```

### Response Example

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 01 Jun 2026 00:00:00 GMT
Link: <https://api.example.com/v2/users>; rel="successor-version"
X-API-Warn: This API version is deprecated. Migrate to /v2 before June 2026.
Content-Type: application/json

[...data...]
```

## Breaking vs Non-Breaking Changes

### Non-Breaking (Safe to Ship)

| Change | Why It's Safe |
|--------|--------------|
| Add a new field to response | Consumers ignore unknown fields |
| Add a new optional parameter | Existing calls still work |
| Add a new endpoint | Doesn't affect existing routes |
| Relax validation (accept more) | Existing valid requests still work |
| Add a new enum value to response | Well-written clients handle unknown values |

### Breaking (Requires New Version)

| Change | Why It Breaks |
|--------|--------------|
| Remove a field from response | Consumers expecting it get undefined |
| Rename a field | Same as remove + add (breaks existing code) |
| Change field type (string → number) | Parsing fails |
| Make optional field required | Existing calls missing it fail |
| Remove an endpoint | 404 for existing consumers |
| Tighten validation (reject more) | Previously valid requests now fail |
| Change response envelope (array → object) | Deserialization breaks |
| Change authentication scheme | All existing tokens invalid |

## Consumer Migration Communication

### Deprecation Timeline

```markdown
## API v1 Deprecation Timeline

### Phase 1: Announcement (Now)
- v2 API is live and documented
- v1 continues to work normally
- Blog post + email to all API consumers
- Deprecation headers added to v1 responses

### Phase 2: Soft Deprecation (Month 2)
- v1 still works
- Dashboard warning for v1 consumers
- Migration guide published with code examples
- Office hours for migration support

### Phase 3: Rate Limiting (Month 4)
- v1 rate limits reduced by 50%
- Weekly email to remaining v1 consumers
- Personalized migration assistance offered

### Phase 4: Sunset (Month 6)
- v1 returns 410 Gone with migration link
- v1 documentation moved to archive
- Incident response for any missed consumers
```

### Migration Guide Template

```markdown
## Migrating from API v1 to v2

### What's Changed
| v1 | v2 | Migration |
|----|-----|-----------|
| `GET /v1/users` returns `User[]` | `GET /v2/users` returns `{ data: User[], total: number }` | Wrap response access: `response.data` instead of `response` |
| `user.name` (string) | `user.firstName`, `user.lastName` (split) | Concatenate: `${user.firstName} ${user.lastName}` |
| Auth via `X-API-Key` header | Auth via `Authorization: Bearer <token>` | Switch to OAuth2 flow |

### Step-by-Step Migration

1. **Update base URL**: Change `/v1/` to `/v2/` in your client
2. **Update response handling**: All responses now use `{ data, total }` envelope
3. **Update auth**: Exchange API key for OAuth2 token (see Auth Migration guide)
4. **Test**: Run your integration tests against the v2 sandbox
5. **Deploy**: Switch production to v2
6. **Verify**: Check error rates for 24 hours

### Code Examples

```typescript
// Before (v1)
const users = await fetch('/api/v1/users').then(r => r.json());
console.log(users.length);

// After (v2)
const { data: users, total } = await fetch('/api/v2/users').then(r => r.json());
console.log(users.length, `of ${total} total`);
```
```

## Backward Compatibility Patterns

### Response Envelope Evolution

```typescript
// Version-aware serialization
function serializeUsers(users: User[], version: 'v1' | 'v2') {
  if (version === 'v1') {
    return users; // Raw array (legacy)
  }
  return {
    data: users,
    total: users.length,
    _links: {
      self: '/api/v2/users',
      next: '/api/v2/users?page=2',
    },
  };
}
```

### Field Aliasing

```typescript
// Support both old and new field names during transition
function normalizeUserInput(body: any): CreateUserInput {
  return {
    firstName: body.firstName ?? body.first_name ?? body.name?.split(' ')[0],
    lastName: body.lastName ?? body.last_name ?? body.name?.split(' ')[1],
    email: body.email,
  };
}
```

## Checklist

- [ ] Versioning strategy chosen (URL path recommended for public APIs)
- [ ] New version documented alongside old version
- [ ] Deprecation headers added to old version responses
- [ ] Sunset date published and communicated
- [ ] Migration guide with code examples provided
- [ ] Breaking changes clearly listed in changelog
- [ ] Non-breaking changes shipped without new version (don't over-version)
- [ ] Consumer adoption tracked (percentage on v1 vs v2)
- [ ] Rate limiting or sunset enforced on timeline
- [ ] Backward compatibility maintained during transition period
