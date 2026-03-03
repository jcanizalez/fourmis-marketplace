---
name: auth-flow
description: Generate an authentication flow diagram and implementation plan for a given auth strategy
arguments:
  - name: strategy
    description: "Auth strategy: jwt, oauth, session, magic-link, api-key, or describe your needs"
    required: true
---

# Auth Flow

Generate an authentication flow diagram and implementation plan for the `$ARGUMENTS` strategy.

## Steps

### Step 1: Understand the Requirements

Based on the strategy specified, determine:
- **Auth type**: JWT, OAuth2, sessions, magic link, API keys, or hybrid
- **Framework**: Check the project for Next.js, Express, Fastify, Go, Python, etc.
- **Existing auth**: Is there any auth already implemented?

### Step 2: Generate Flow Diagram

Create an ASCII sequence diagram showing the complete auth flow:

```
Client              Server              Database         External
  |                   |                    |                |
  |-- Login --------->|                    |                |
  |                   |-- Find user ------>|                |
  |                   |<-- User data ------|                |
  |                   |-- Verify password  |                |
  |                   |-- Create session ->|                |
  |<-- Set cookie ----|                    |                |
  |                   |                    |                |
  |-- API request --->|                    |                |
  |  (with cookie)    |-- Lookup session ->|                |
  |                   |<-- Session data ---|                |
  |<-- Response ------|                    |                |
```

For the specified strategy, include:
- Login/registration flow
- Token/session lifecycle
- Refresh/rotation flow (if applicable)
- Logout flow
- Error cases (invalid credentials, expired tokens)

### Step 3: Implementation Plan

Provide a step-by-step implementation plan:

1. **Dependencies to install** (e.g., `jose`, `bcrypt`, `express-session`)
2. **Files to create/modify** with their purpose
3. **Database schema** (tables for users, sessions, tokens, etc.)
4. **Environment variables** needed
5. **Routes/endpoints** to implement
6. **Middleware** to add
7. **Frontend changes** (if applicable)

### Step 4: Code Skeleton

Generate the key code files as a skeleton:
- Auth utility functions (hash, verify, token create/verify)
- Middleware (authenticate, authorize)
- Route handlers (login, register, logout, refresh)
- Database schema/migration

### Step 5: Security Checklist

Provide a checklist of security considerations specific to the chosen strategy:
- [ ] Specific items for the strategy
- [ ] Rate limiting
- [ ] Error handling (no information leakage)
- [ ] Logging (log auth events, not credentials)

## Output Format

```
## Auth Strategy: [name]

### Flow Diagram
[ASCII sequence diagram]

### Implementation Plan
[Numbered steps]

### Files to Create
[File list with descriptions]

### Code Skeleton
[Key code snippets]

### Security Checklist
[Checkboxes]
```
