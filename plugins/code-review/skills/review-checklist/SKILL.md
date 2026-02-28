# Review Checklist

Generate targeted review checklists based on the type of code being reviewed. Provides systematic checklists for APIs, React components, database changes, auth code, and more.

## When to Activate

When the user asks to:
- Create a review checklist for a specific change
- Get a systematic list of things to check
- Ensure nothing is missed in a review
- Generate a QA checklist for a feature

## Checklist: API Endpoint

- [ ] HTTP method is correct (GET for reads, POST for creates, etc.)
- [ ] Request body/params are validated (type, format, required fields)
- [ ] Response status codes match the outcome (201 for create, 404 for not found)
- [ ] Response format is consistent with other endpoints
- [ ] Authentication required? Authorization checked?
- [ ] Rate limiting applied?
- [ ] Input sanitized (no SQL injection, XSS via stored data)
- [ ] Pagination for list endpoints (limit, offset/cursor)
- [ ] Error responses include helpful messages
- [ ] Logging for audit trail (who did what, when)
- [ ] Tests cover happy path, validation errors, auth failures, not found

## Checklist: React Component

- [ ] Props are typed (TypeScript interface/type)
- [ ] Props have sensible defaults where applicable
- [ ] Component handles loading state
- [ ] Component handles error state
- [ ] Component handles empty state
- [ ] No unnecessary re-renders (check deps arrays, memoization)
- [ ] Event handlers don't create new functions on each render (useCallback)
- [ ] Side effects in useEffect have cleanup functions
- [ ] useEffect dependency arrays are correct
- [ ] Accessibility: semantic HTML, aria labels, keyboard navigation
- [ ] Responsive design considered
- [ ] No inline styles (use CSS modules, Tailwind, or styled-components)
- [ ] Key prop on list items

## Checklist: Database Migration

- [ ] Migration is reversible (has a proper down/rollback)
- [ ] New columns have appropriate defaults or are nullable
- [ ] Indexes added for columns used in WHERE/JOIN/ORDER BY
- [ ] Foreign keys have appropriate ON DELETE behavior
- [ ] Migration handles existing data (not just new schema)
- [ ] Column names follow project convention (snake_case vs camelCase)
- [ ] No DROP TABLE without data backup plan
- [ ] Migration tested on a copy of production-like data
- [ ] Performance impact assessed (large table ALTER can lock)

## Checklist: Authentication / Authorization

- [ ] Passwords hashed with bcrypt/argon2 (never MD5/SHA1)
- [ ] Tokens have appropriate expiration times
- [ ] Refresh token rotation implemented
- [ ] Failed login attempts rate-limited
- [ ] Session invalidation on password change
- [ ] CSRF protection for state-changing operations
- [ ] Sensitive data not in URL parameters
- [ ] Sensitive data not in logs
- [ ] Role-based access checks on every protected endpoint
- [ ] Token validation checks signature, expiration, and issuer

## Checklist: Error Handling

- [ ] All async operations have error handling (try/catch, .catch)
- [ ] Errors are logged with context (what failed, for whom)
- [ ] User-facing error messages are helpful but not leaking internals
- [ ] Error responses use consistent format across the app
- [ ] Recovery mechanisms for transient failures (retry, circuit breaker)
- [ ] Resources released on error (connections, file handles, transactions)
- [ ] Unhandled promise rejections caught at the app level
- [ ] Stack traces never sent to the client in production

## Checklist: Performance-Critical Code

- [ ] Database queries use indexes (check EXPLAIN plan)
- [ ] No N+1 query patterns (use JOIN or batch loading)
- [ ] Results cached where appropriate (with invalidation strategy)
- [ ] Pagination on unbounded queries
- [ ] Async operations parallelized when independent
- [ ] Large payloads compressed (gzip)
- [ ] Images optimized / lazy loaded
- [ ] Bundle size checked (no accidental large dependency)

## Checklist: Configuration / Environment

- [ ] No hardcoded secrets or API keys
- [ ] Environment variables validated at startup
- [ ] Missing config fails fast with clear error
- [ ] Defaults are safe (debug=false, log_level=info)
- [ ] Config documented (env.example file)
- [ ] Sensitive config not logged

## How to Use These Checklists

1. **Identify the change type** — API? Component? Migration? Auth?
2. **Pick the matching checklist** (or combine multiple)
3. **Go through each item** — mark as ✅ pass, ❌ fail, or ➖ N/A
4. **Report only failures** — don't comment on things that are fine
5. **Prioritize by risk** — security and correctness issues first
