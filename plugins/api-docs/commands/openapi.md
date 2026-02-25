---
name: openapi
description: Generate or update an OpenAPI 3.0 specification from your API code
---

# OpenAPI Command

When the user runs `/openapi`, generate an OpenAPI 3.0 spec from the codebase.

## Steps

1. **Check for existing spec**: Look for `openapi.yaml`, `openapi.json`, `swagger.yaml`, or `swagger.json`
2. **Discover routes**: Use the Route Discovery skill to find all API endpoints
3. **Extract schemas**: Read TypeScript interfaces, Go structs, Zod schemas, or Pydantic models used in handlers
4. **Generate spec**: Create a valid OpenAPI 3.0.3 specification with:
   - All discovered paths with methods
   - Request/response schemas in `components/schemas`
   - Authentication scheme definitions
   - Proper operationIds and tags
5. **Output**: Save as `openapi.yaml` (YAML preferred for readability)

## If Spec Already Exists

- Compare existing spec with discovered routes
- Flag endpoints in code not in spec (missing docs)
- Flag endpoints in spec not in code (stale docs)
- Offer to update the spec with new endpoints

## Arguments

- `/openapi` — generate full spec
- `/openapi validate` — validate existing spec against code
- `/openapi diff` — show what's changed since last generation
