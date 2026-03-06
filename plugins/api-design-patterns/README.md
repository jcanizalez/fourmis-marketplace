# 🔧 api-design-patterns

> Production API design patterns — RESTful resource design (naming, methods, status codes, versioning, idempotency, ETags), error handling (RFC 7807 Problem Details, typed error classes, validation errors, error middleware), pagination and filtering (cursor/offset pagination, Relay connections, sorting, field selection, search), rate limiting (token bucket, sliding window, Redis distributed limiting, tiered limits, proper headers), WebSocket real-time patterns (ws, gorilla/websocket, rooms/channels, authentication, heartbeat/reconnection, Redis pub/sub scaling), and GraphQL (schema design, resolvers, DataLoader N+1 prevention, subscriptions, Relay pagination, query complexity).

**Category:** Development | **6 skills** | **3 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/api-design-patterns
```

## Overview

Production API design patterns — RESTful resource design (naming, methods, status codes, versioning, idempotency, ETags), error handling (RFC 7807 Problem Details, typed error classes, validation errors, error middleware), pagination and filtering (cursor/offset pagination, Relay connections, sorting, field selection, search), rate limiting (token bucket, sliding window, Redis distributed limiting, tiered limits, proper headers), WebSocket real-time patterns (ws, gorilla/websocket, rooms/channels, authentication, heartbeat/reconnection, Redis pub/sub scaling), and GraphQL (schema design, resolvers, DataLoader N+1 prevention, subscriptions, Relay pagination, query complexity). 6 skills, 3 commands, 1 agent. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `error-handling` | When the user asks about API error handling |
| `graphql-patterns` | When the user asks about GraphQL |
| `pagination-filtering` | When the user asks about API pagination |
| `rate-limiting` | When the user asks about rate limiting |
| `rest-api-design` | When the user asks about REST API design |
| `websocket-patterns` | When the user asks about WebSocket |

## Commands

| Command | Description |
|---------|-------------|
| `/api-review` | Review an API for REST design best practices, error handling, pagination, rate limiting, and security |
| `/api-scaffold` | Scaffold a RESTful API with best practices — routes, error handling, pagination, rate limiting |
| `/api-spec` | Generate an OpenAPI 3.1 specification from route handlers |

## Agents

### api-architect
API design expert — REST conventions, error handling, pagination, rate limiting, WebSocket, GraphQL, and OpenAPI specifications

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
