---
name: API Examples
description: Generates runnable API examples including curl commands, httpie commands, and markdown reference docs for discovered endpoints. Activates when asked for API testing commands or documentation.
version: 1.0.0
---

# API Examples

This skill activates when generating API usage examples, test commands, or markdown documentation.

## When to Activate

- User asks for curl commands to test their API
- User asks for API documentation or a reference guide
- The `/api-test` or `/api-docs` commands are invoked
- When documenting an endpoint after implementation

## Curl Example Generation

For each endpoint, generate a complete, runnable curl command:

### GET Request
```bash
curl -s http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN" | jq
```

### GET with Query Params
```bash
curl -s "http://localhost:3000/api/users?limit=10&offset=0" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### GET by ID
```bash
curl -s http://localhost:3000/api/users/abc-123 \
  -H "Authorization: Bearer $TOKEN" | jq
```

### POST with JSON Body
```bash
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com"
  }' | jq
```

### PUT Update
```bash
curl -s -X PUT http://localhost:3000/api/users/abc-123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Jane Updated"
  }' | jq
```

### DELETE
```bash
curl -s -X DELETE http://localhost:3000/api/users/abc-123 \
  -H "Authorization: Bearer $TOKEN" | jq
```

## Rules for Examples

1. **Use realistic data**: `"Jane Smith"` not `"string"`, `"jane@example.com"` not `"email"`
2. **Include auth headers** if the endpoint requires authentication
3. **Pipe to jq** for JSON responses (include `| jq` at the end)
4. **Use `-s` flag** to suppress progress bars
5. **Show the full URL** including base path
6. **Use `$TOKEN` variable** for auth — don't hardcode tokens
7. **Include all required fields** in POST/PUT bodies
8. **Show expected response** as a comment below the command

## Markdown API Reference

When generating a full API reference document, use this format for each endpoint:

```markdown
### `GET /api/users`

List all users with pagination.

**Parameters**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| limit | query | integer | No | Max results (default: 20) |
| offset | query | integer | No | Skip N results (default: 0) |

**Response** `200 OK`

```json
[
  {
    "id": "abc-123",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "createdAt": "2026-01-15T10:30:00Z"
  }
]
```

**Errors**

| Status | Description |
|--------|-------------|
| 401 | Missing or invalid auth token |
| 500 | Internal server error |

**Example**

```bash
curl -s http://localhost:3000/api/users?limit=10 \
  -H "Authorization: Bearer $TOKEN" | jq
```
```

## Document Structure

When generating a complete API reference file:

```markdown
# API Reference

Base URL: `http://localhost:3000`

## Authentication
All endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Users
- [List users](#get-apiusers) — `GET /api/users`
- [Create user](#post-apiusers) — `POST /api/users`
- [Get user](#get-apiusersid) — `GET /api/users/:id`
- [Update user](#put-apiusersid) — `PUT /api/users/:id`
- [Delete user](#delete-apiusersid) — `DELETE /api/users/:id`

---

[Individual endpoint docs here]
```

Save the reference to `API.md` or `docs/api-reference.md` at the project root.
