# api-docs

Auto-generate API documentation from your code. Scans route handlers in Express, Go (net/http, Chi, Gin), Next.js, Fastify, and Hono to produce OpenAPI specs, markdown references, and curl examples.

## Commands

- **`/api-docs`** — Scan the project and generate a complete markdown API reference
- **`/openapi`** — Generate or update an OpenAPI 3.0 specification from code
- **`/api-test`** — Generate ready-to-run curl commands for testing endpoints

## Skills

- **Route Discovery** — Detects framework and finds all API endpoints with params, body, and response info
- **OpenAPI Generation** — Creates valid OpenAPI 3.0.3 specs with schemas extracted from TypeScript interfaces, Go structs, or Pydantic models
- **API Examples** — Generates curl commands, httpie commands, and markdown reference documentation

## Supported Frameworks

| Framework | Language | Route Detection |
|-----------|----------|----------------|
| Express.js | TypeScript/JS | `app.get()`, `router.post()`, etc. |
| Fastify | TypeScript/JS | `fastify.get()`, route registration |
| Next.js (App Router) | TypeScript/JS | `app/api/**/route.ts` exports |
| Next.js (Pages Router) | TypeScript/JS | `pages/api/**/*.ts` default exports |
| net/http | Go | `http.HandleFunc()`, `mux.Handle()` |
| Chi | Go | `r.Get()`, `r.Post()`, etc. |
| Gin | Go | `r.GET()`, `r.POST()`, etc. |
| Hono | TypeScript/JS | `app.get()`, `app.post()`, etc. |
| Elysia | TypeScript/JS | `.get()`, `.post()`, etc. |

## Installation

```bash
fourmis plugin install api-docs
```

## License

MIT
