---
name: api-test
description: Generate curl commands to test your API endpoints
---

# API Test Command

When the user runs `/api-test`, generate ready-to-run curl commands for testing API endpoints.

## Steps

1. **Discover routes**: Use the Route Discovery skill to find all API endpoints
2. **Detect base URL**: Look for port configuration in the project (env files, config, package.json scripts)
3. **Generate curl commands**: For each endpoint, create a complete curl command with:
   - Correct HTTP method
   - Full URL with realistic path parameters
   - Required headers (Content-Type, Authorization)
   - Realistic request body for POST/PUT/PATCH endpoints
   - Piped to `jq` for JSON formatting
4. **Output**: Display all commands grouped by resource, ready to copy-paste

## Arguments

- `/api-test` — generate commands for all endpoints
- `/api-test /api/users` — generate commands for a specific path
- `/api-test POST` — generate commands for a specific method

## Output Format

```bash
# ============================================
# API Test Commands
# Base URL: http://localhost:3000
# ============================================

# --- Users ---

# List users
curl -s http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN" | jq

# Create user
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com"
  }' | jq

# Get user by ID
curl -s http://localhost:3000/api/users/abc-123 \
  -H "Authorization: Bearer $TOKEN" | jq
```

## Rules

- Use realistic example data, not placeholder strings
- Include all required fields in request bodies
- Use `$TOKEN` for auth tokens — let the user set it
- Add a comment above each command explaining what it does
- Group by resource with clear section headers
