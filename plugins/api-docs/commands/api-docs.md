---
name: api-docs
description: Scan the project for API endpoints and generate a complete markdown API reference
---

# API Docs Command

When the user runs `/api-docs`, scan the codebase for API endpoints and generate comprehensive documentation.

## Steps

1. **Detect framework**: Check package.json, go.mod, etc. to determine the web framework
2. **Discover routes**: Use the Route Discovery skill to find all API endpoints
3. **Analyze handlers**: For each endpoint, read the handler code to extract:
   - HTTP method and path
   - Path parameters, query parameters, request body
   - Response format and status codes
   - Authentication requirements
   - Validation rules
4. **Generate documentation**: Create a markdown API reference with:
   - Table of contents with all endpoints
   - Grouped by resource/tag
   - Each endpoint fully documented (params, body, response, errors)
   - Runnable curl examples for every endpoint
5. **Save or display**: Offer to save to `API.md` or `docs/api-reference.md`

## Output

A complete markdown API reference document that includes:
- Base URL and authentication info
- Endpoint index grouped by resource
- Full documentation for each endpoint
- curl examples ready to copy-paste
- Request/response schemas

## Example

```
User: /api-docs

→ Detected: Express.js with 12 endpoints across 4 route files
→ Generating API reference...

→ "Generated API.md with 12 endpoints:
   - 4 User endpoints (CRUD)
   - 3 Product endpoints
   - 3 Order endpoints
   - 2 Auth endpoints

   Saved to API.md. Want me to also generate an OpenAPI spec?"
```
