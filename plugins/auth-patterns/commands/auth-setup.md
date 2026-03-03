---
name: auth-setup
description: Scaffold authentication for a project — generate auth files, middleware, routes, and database schema based on the project's framework
arguments:
  - name: strategy
    description: "Auth strategy to scaffold: jwt, session, oauth, or full (all combined)"
    required: false
---

# Auth Setup

Scaffold authentication for the current project using the `$ARGUMENTS` strategy (default: auto-detect the best fit based on the project).

## Steps

### Step 1: Detect Project Framework

Read the project's package.json, go.mod, or requirements.txt to determine:
- **Framework**: Next.js, Express, Fastify, Go net/http, Python FastAPI, etc.
- **Database**: Prisma, Drizzle, raw SQL, GORM, SQLAlchemy
- **Existing auth**: Check if any auth is already implemented

### Step 2: Choose Auth Strategy

If not specified, recommend based on the project type:

| Project Type | Recommended Strategy |
|-------------|---------------------|
| Next.js App Router | Session (iron-session) + OAuth |
| Express API | JWT (access + refresh) |
| Full-stack monolith | Session (express-session + Redis) |
| API-only service | API keys + JWT |
| Go API server | JWT with middleware |

### Step 3: Generate Files

Create the following files (adapted to the detected framework):

**Core Auth Files:**
- `lib/auth.ts` — Password hashing, token creation, verification
- `lib/session.ts` — Session configuration (if using sessions)
- `middleware/auth.ts` — Authentication middleware
- `middleware/authorize.ts` — Authorization middleware (roles/permissions)

**Route Handlers:**
- `POST /api/auth/register` — User registration
- `POST /api/auth/login` — Login (returns token or sets session)
- `POST /api/auth/logout` — Logout (clear session or blacklist token)
- `POST /api/auth/refresh` — Refresh token (if JWT)
- `POST /api/auth/forgot-password` — Request password reset
- `POST /api/auth/reset-password` — Execute password reset

**Database:**
- Migration for users table (id, email, password_hash, role, email_verified, created_at)
- Migration for sessions/refresh_tokens table (if applicable)
- Migration for password_resets table

**Configuration:**
- List of required environment variables
- Example `.env.example` entries

### Step 4: Security Defaults

Ensure all generated code includes:
- [ ] Password hashing with bcrypt (cost 12) or Argon2id
- [ ] httpOnly, secure, sameSite cookies
- [ ] Rate limiting on login/register
- [ ] Input validation (Zod schemas for all endpoints)
- [ ] Error messages that don't leak information
- [ ] Session regeneration after login
- [ ] CSRF protection (if using sessions)

### Step 5: Integration Guide

Provide instructions for:
1. Installing dependencies
2. Setting up environment variables
3. Running migrations
4. Testing the auth flow (curl commands)
5. Adding auth to existing routes

## Output

Create the files directly in the project. After creating, provide a summary of what was created and the next steps for the developer.
