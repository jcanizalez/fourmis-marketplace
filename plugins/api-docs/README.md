# 🔧 api-docs

> Auto-generate API documentation from your code.

**Category:** Development | **3 skills** | **3 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/api-docs
```

## Overview

Auto-generate API documentation from your code. Scans route handlers in Express, Go, Next.js, and Fastify to produce OpenAPI specs, markdown references, and curl examples.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `api-examples` | Generates runnable API examples including curl commands |
| `openapi-generation` | Generates OpenAPI 3.0 specifications from discovered API routes. Activates when ... |
| `route-discovery` | Discovers API endpoints and route handlers across multiple frameworks. Activates... |

## Commands

| Command | Description |
|---------|-------------|
| `/api-docs` | Scan the project for API endpoints and generate a complete markdown API reference |
| `/api-test` | Generate curl commands to test your API endpoints |
| `/openapi` | Generate or update an OpenAPI 3.0 specification from your API code |

## Agents

### api-documenter
Autonomous API documentation agent — scans codebases to discover routes, extract schemas, and generate complete API reference docs, OpenAPI specs, and curl examples.

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
