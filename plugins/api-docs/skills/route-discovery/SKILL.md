---
name: Route Discovery
description: Discovers API endpoints and route handlers across multiple frameworks. Activates when generating API docs, scanning for endpoints, or when the user asks about API routes in their codebase.
version: 1.0.0
---

# Route Discovery

This skill activates when searching for API endpoints in a codebase.

## When to Activate

- User asks to generate API documentation
- User asks "what endpoints does this API have?"
- The `/api-docs`, `/api-test`, or `/openapi` commands are invoked
- When analyzing a web application's routing structure

## Framework Detection

First, determine the framework by checking dependency files:

| Framework | Detection |
|-----------|-----------|
| Express.js | `"express"` in package.json |
| Fastify | `"fastify"` in package.json |
| Next.js | `"next"` in package.json + `app/api/` or `pages/api/` dirs |
| Go net/http | `.go` files with `"net/http"` import |
| Go Chi | `"github.com/go-chi/chi"` in go.mod |
| Go Gin | `"github.com/gin-gonic/gin"` in go.mod |
| Go Fiber | `"github.com/gofiber/fiber"` in go.mod |
| Hono | `"hono"` in package.json |
| Elysia/Bun | `"elysia"` in package.json |

## Route Patterns by Framework

### Express.js / Fastify
```javascript
// Look for these patterns:
app.get('/users', handler)
app.post('/users', handler)
router.get('/users/:id', handler)
app.use('/api/v1', router)
```

**Search patterns** (Grep):
```
app\.(get|post|put|patch|delete|options|head)\s*\(
router\.(get|post|put|patch|delete|options|head)\s*\(
```

### Next.js App Router (app/api/)
```
app/api/users/route.ts          → GET/POST /api/users
app/api/users/[id]/route.ts     → GET/PUT/DELETE /api/users/:id
```

**Search pattern**: Look for `export (async )?function (GET|POST|PUT|DELETE|PATCH)` in `app/api/**/route.{ts,js}`

### Next.js Pages Router (pages/api/)
```
pages/api/users.ts              → /api/users
pages/api/users/[id].ts         → /api/users/:id
```

**Search pattern**: File structure maps directly to routes. Each file exports a default handler.

### Go net/http
```go
http.HandleFunc("/users", handler)
mux.Handle("/users/{id}", handler)
r.Get("/users/{id}", handler)      // chi
r.GET("/users/:id", handler)       // gin
```

**Search patterns**:
```
http\.Handle(Func)?\s*\(
(mux|r|router)\.(Get|Post|Put|Delete|Patch|Handle)
```

## Route Extraction Process

1. **Detect framework** from dependencies
2. **Find route files** using framework-specific patterns:
   - Express: Look for files importing express/router
   - Next.js: Scan `app/api/` or `pages/api/` directory structure
   - Go: Look for files importing net/http or router packages
3. **Extract routes** with method, path, and handler reference
4. **Analyze handlers** to determine:
   - Request parameters (path params, query params, body)
   - Response format (JSON structure, status codes)
   - Middleware applied (auth, validation, etc.)
   - Error responses
5. **Build route table** sorted by path

## Output Format

For each discovered endpoint, extract:

| Field | Source |
|-------|--------|
| Method | Route registration (GET, POST, etc.) |
| Path | Route pattern with params |
| Handler | Function/file handling the request |
| Auth | Middleware stack (if auth middleware present) |
| Params | Path params, query params from handler code |
| Body | Request body type/interface if POST/PUT/PATCH |
| Response | Return type/interface from handler |
| Status codes | Explicit status codes in handler |
