---
description: When the user asks what plugins to install, which plugins are available, how to find plugins for their project, which Fourmis marketplace plugins match their stack, what plugins exist for React or Next.js or Go or Python or Docker or Kubernetes, how to browse the marketplace, or wants plugin recommendations
---

# Plugin Discovery

Guide to finding and installing the right Fourmis Marketplace plugins for your project. Covers the full catalog organized by use case and tech stack.

## By Tech Stack

### JavaScript / TypeScript
| Plugin | What It Gives You |
|--------|------------------|
| `typescript-patterns` | Generics, utility types, type guards, Zod, error handling, modules |
| `react-patterns` | Custom hooks, state management, RSC, component architecture, forms, performance |
| `nextjs-patterns` | App Router, data fetching, Server Actions, middleware, caching, deployment |
| `state-machines` | XState v5, workflow patterns, event sourcing, process orchestration |

### Go
| Plugin | What It Gives You |
|--------|------------------|
| `go-patterns` | Concurrency, error handling, interfaces, HTTP, testing, project structure |

### Backend / API
| Plugin | What It Gives You |
|--------|------------------|
| `api-design-patterns` | REST design, error handling, pagination, rate limiting, WebSocket, GraphQL |
| `api-testing` | REST testing, mock servers, contract testing, security auditing |
| `database-patterns` | Schema design, query optimization, ORM, transactions, connection pooling |
| `auth-patterns` | JWT, OAuth2, sessions, password security, RBAC, API keys |

### DevOps / Infrastructure
| Plugin | What It Gives You |
|--------|------------------|
| `docker-toolkit` | Dockerfiles, Compose, debugging, optimization, networking, security |
| `kubernetes-patterns` | Resources, networking, storage, scaling, Helm, troubleshooting |
| `ci-cd` | GitHub Actions, deployment pipelines, Docker CI, releases, best practices |
| `devops-skills` | Incident response, deployment safety, security hardening, cost analysis |
| `monitoring-patterns` | Logging, Prometheus, alerting, health checks, tracing, Grafana |
| `log-analyzer` | Structured logging, log parsing, error diagnosis, monitoring, search |

### Productivity / Workflow
| Plugin | What It Gives You |
|--------|------------------|
| `git-workflow` | Conventional commits, branching, PRs, changelog, hooks, merge conflicts |
| `hooks-toolkit` | Claude Code hooks — safety guards, file protection, auto-lint, context injection |
| `code-review` | Review patterns, PR workflow, checklists, quality assessment, comments |
| `test-gen` | Unit, integration, E2E tests, TDD, mocking, coverage analysis |
| `code-health` | Quality metrics, tech debt tracking, complexity analysis |
| `env-manager` | Dotenv, type-safe validation, secret management, 12-factor patterns |
| `migration-toolkit` | Schema migrations, dependency updates, framework upgrades, API versioning |
| `project-scaffold` | Boilerplate for Next.js, Express, Go, Python, monorepos, libraries |
| `prompt-engineering` | Prompt design, structured output, few-shot, CoT, RAG, evaluation |

### Frontend / Design
| Plugin | What It Gives You |
|--------|------------------|
| `design-system` | Design tokens, Tailwind theming, responsive design, animations, typography |
| `a11y-audit` | WCAG compliance, ARIA, color contrast, keyboard nav, screen readers |
| `perf-audit` | Core Web Vitals, rendering, bundle size, images, caching, monitoring |

### MCP-Powered Tools
| Plugin | What It Gives You |
|--------|------------------|
| `db-explorer` | Connect to SQLite/Postgres, explore tables, run queries, export data |
| `security-audit` | Secret scanning, CVE detection, injection patterns, security grades |
| `seo-toolkit` | On-page SEO, meta tags, heading analysis, SSL checks, robots.txt |
| `invoice` | Create and track invoices, manage clients, export HTML, revenue reports |
| `local-crm` | Manage contacts, deals, follow-ups — SQLite-based CRM |
| `time-tracker` | Start/stop timers, log hours, generate timesheets, track earnings |
| `social-poster` | Post to Bluesky and Mastodon from Claude Code |
| `reddit-mcp` | Browse, search, post, comment, vote on Reddit |

### Agent Bundles
| Plugin | What It Gives You |
|--------|------------------|
| `marketing-agent` | Content marketing — orchestrates writer + SEO + social |
| `freelancer-agent` | Freelancer business — orchestrates CRM + invoicing + time tracking |
| `product-management` | PRDs, sprint planning, user stories, estimation, roadmaps, retros |
| `markdown-writer` | Blog posts, technical docs, SEO content, readability, editing |
| `vector-db` | Embeddings, pgvector, vector search, RAG pipelines, Pinecone, ChromaDB |

## Installing Plugins

```bash
# Install a single plugin
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/<name>

# Browse the full catalog
# https://jcanizalez.github.io/fourmis-marketplace/
```

## Starter Packs

For common setups, install these combinations:

**Full-Stack TypeScript**: typescript-patterns + react-patterns + nextjs-patterns + api-design-patterns + database-patterns + test-gen

**Backend Go**: go-patterns + api-design-patterns + database-patterns + docker-toolkit + test-gen

**DevOps Engineer**: docker-toolkit + kubernetes-patterns + ci-cd + monitoring-patterns + devops-skills + log-analyzer

**Freelancer**: invoice + local-crm + time-tracker + freelancer-agent + git-workflow

**Security-Focused**: auth-patterns + security-audit + env-manager + hooks-toolkit
