# 🔒 auth-patterns

> Authentication and authorization patterns — JWT (access/refresh tokens, RS256/HS256, claims design, token rotation, revocation), OAuth2 (authorization code + PKCE, client credentials, social login with Google/GitHub/Discord, OIDC), session auth (cookie-based sessions, Redis/DB stores, CSRF protection, session security, httpOnly/sameSite cookies), password security (bcrypt/argon2 hashing, reset flows, magic links, email verification, rate limiting login), authorization (RBAC roles/permissions, ABAC policies, resource-level auth, org/tenant scoping, middleware), and API auth (API key generation/rotation/scoping, webhook signature verification, tiered rate limiting, Bearer tokens).

**Category:** Security | **6 skills** | **3 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/auth-patterns
```

## Overview

Authentication and authorization patterns — JWT (access/refresh tokens, RS256/HS256, claims design, token rotation, revocation), OAuth2 (authorization code + PKCE, client credentials, social login with Google/GitHub/Discord, OIDC), session auth (cookie-based sessions, Redis/DB stores, CSRF protection, session security, httpOnly/sameSite cookies), password security (bcrypt/argon2 hashing, reset flows, magic links, email verification, rate limiting login), authorization (RBAC roles/permissions, ABAC policies, resource-level auth, org/tenant scoping, middleware), and API auth (API key generation/rotation/scoping, webhook signature verification, tiered rate limiting, Bearer tokens). 6 skills, 3 commands, 1 agent. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `api-auth` | When the user asks about API authentication |
| `authorization` | When the user asks about authorization |
| `jwt-patterns` | When the user asks about JWT, JSON Web Tokens |
| `oauth-patterns` | When the user asks about OAuth2 |
| `password-security` | When the user asks about password hashing |
| `session-auth` | When the user asks about session-based authentication |

## Commands

| Command | Description |
|---------|-------------|
| `/auth-audit` | Audit authentication and authorization implementation for security issues, common vulnerabilities, and best practice violations |
| `/auth-flow` | Generate an authentication flow diagram and implementation plan for a given auth strategy |
| `/auth-setup` | Scaffold authentication for a project — generate auth files, middleware, routes, and database schema based on the project's framework |

## Agents

### auth-expert
Autonomous authentication and authorization expert that implements secure auth flows, audits security, and designs access control systems

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
