---
name: api-review
description: Review an API for REST design best practices, error handling, pagination, rate limiting, and security
arguments:
  - name: path
    description: Path to the routes/controllers directory (defaults to auto-detect)
    required: false
---

# API Design Review

Review this project's API endpoints against REST design best practices. Analyze the route handlers and report findings.

## Review Steps

1. **Detect framework**: Identify Express, Fastify, Go net/http, Gin, or other framework by reading package.json or go.mod

2. **Route analysis**:
   - Find all route definitions
   - Check URL naming (plural nouns, hyphens, no verbs)
   - Verify correct HTTP method usage (GET for reads, POST for creates, etc.)
   - Check for consistent URL patterns
   - Verify API versioning is present (`/api/v1/`)

3. **Response format**:
   - Check for consistent response envelope (`{ data }` or `{ data, meta }`)
   - Verify proper status codes (201 for create, 204 for delete, 404 for not found)
   - Look for `Location` header on 201 responses
   - Check error response format (RFC 7807 or consistent structure)

4. **Pagination**:
   - Check if list endpoints support pagination
   - Verify pagination metadata is returned (total, page, hasNext)
   - Check for reasonable default and max limits

5. **Error handling**:
   - Verify centralized error middleware exists
   - Check that 5xx errors don't leak internal details
   - Look for proper validation error format
   - Verify `Retry-After` on 429 responses

6. **Rate limiting**:
   - Check if rate limiting middleware is applied
   - Verify rate limit headers are returned
   - Check if auth endpoints have stricter limits

7. **Security**:
   - Verify auth middleware on protected routes
   - Check for CORS configuration
   - Look for input validation on mutation endpoints

## Output Format

```
## API Design Review

### Route Inventory
| Method | Path | Handler | Issues |
|--------|------|---------|--------|

### Scorecard
| Category | Score | Status |
|----------|-------|--------|
| URL Design | 8/10 | ✅ |
| HTTP Methods | 9/10 | ✅ |
| Status Codes | 6/10 | ⚠️ |
| Error Handling | 4/10 | ⚠️ |
| Pagination | 2/10 | ❌ |
| Rate Limiting | 0/10 | ❌ |

### Recommendations (Priority Order)
1. [Critical] ...
2. [High] ...
```

Reference the relevant skills from this plugin for implementation guidance.
