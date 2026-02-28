---
name: http
description: Make HTTP requests from the terminal — test endpoints, inspect responses, debug APIs with formatted output and timing
allowed-tools: Read, Bash
---

# /http — HTTP Request Helper

Make HTTP requests directly from Claude Code to test and debug API endpoints.

## Usage

```
/http GET https://api.example.com/users
/http POST https://api.example.com/users '{"name": "Alice"}'
/http PUT https://api.example.com/users/123 '{"name": "Updated"}'
/http DELETE https://api.example.com/users/123
/http GET http://localhost:3000/api/health
```

## Workflow

1. **Parse request**: Extract method, URL, body, and any headers from the command
2. **Execute**: Run the request using `curl` with timing and verbose output
3. **Format response**: Pretty-print JSON, show status code, headers, and timing
4. **Analyze**: Flag issues (slow response, error codes, missing headers)

## Output Format

```
## HTTP Response

### Request
POST https://api.example.com/api/users
Content-Type: application/json
Authorization: Bearer eyJ...

### Body Sent
{
  "name": "Alice Johnson",
  "email": "alice@example.com"
}

### Response — 201 Created (245ms)
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Alice Johnson",
  "email": "alice@example.com",
  "createdAt": "2025-01-15T10:30:00Z"
}

### Response Headers
Content-Type: application/json; charset=utf-8
X-Request-Id: abc-123-def
Cache-Control: no-store
RateLimit-Remaining: 98

### Timing
| Phase | Duration |
|-------|----------|
| DNS lookup | 12ms |
| TCP connect | 45ms |
| TLS handshake | 89ms |
| First byte (TTFB) | 95ms |
| Total | 245ms |
```

## Features

| Feature | Description |
|---------|-------------|
| **Auto JSON** | Pretty-prints JSON responses with syntax highlighting |
| **Timing** | Shows DNS, connect, TLS, TTFB, and total time |
| **Headers** | Displays important response headers |
| **Auth** | Reads Bearer token from environment variable if set |
| **Follow redirects** | Follows 3xx redirects by default |
| **Error analysis** | Explains common HTTP error codes and suggests fixes |

## Error Analysis

When a request fails, the command explains the error:

| Status | Explanation |
|--------|-------------|
| 400 | Bad Request — check request body shape and required fields |
| 401 | Unauthorized — token missing, expired, or invalid |
| 403 | Forbidden — valid token but insufficient permissions |
| 404 | Not Found — check URL path and resource ID |
| 405 | Method Not Allowed — endpoint exists but doesn't support this method |
| 422 | Validation Error — request body failed server-side validation |
| 429 | Rate Limited — wait and retry, check RateLimit headers |
| 500 | Server Error — check server logs for stack trace |
| ECONNREFUSED | Server not running — start it or check the port |

## Important

- Uses `curl` under the hood — available on all systems
- For authenticated endpoints, set `$TOKEN` or `$API_KEY` environment variable
- JSON bodies should be passed as single-quoted strings
- Large response bodies are truncated with a note about full size
- This is for quick testing — use `/api-test` for automated test suites
