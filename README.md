# Fourmis Marketplace

**41 plugins. 191 skills. 113 commands. 46 agents. 8 MCP servers.**

The largest open-source plugin collection for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — production patterns, developer tools, and workflow automation. Install any plugin in seconds.

## Quick Start

```bash
# 1. Register the marketplace
fourmis plugin marketplace add jcanizalez/fourmis-marketplace

# 2. Install any plugin
fourmis plugin install typescript-patterns

# 3. Use it — skills activate automatically, commands via /slash
```

No API keys needed for most plugins. No cloud dependencies. Just install and go.

---

## Starter Packs

Curated bundles for common roles. Install what fits your stack.

### Full-Stack TypeScript Developer

```bash
fourmis plugin install typescript-patterns
fourmis plugin install react-patterns
fourmis plugin install nextjs-patterns
fourmis plugin install api-design-patterns
fourmis plugin install database-patterns
fourmis plugin install test-gen
fourmis plugin install auth-patterns
```

### Backend / API Engineer

```bash
fourmis plugin install go-patterns
fourmis plugin install api-design-patterns
fourmis plugin install database-patterns
fourmis plugin install auth-patterns
fourmis plugin install state-machines
fourmis plugin install docker-toolkit
fourmis plugin install monitoring-patterns
```

### DevOps / Platform Engineer

```bash
fourmis plugin install kubernetes-patterns
fourmis plugin install docker-toolkit
fourmis plugin install ci-cd
fourmis plugin install devops-skills
fourmis plugin install monitoring-patterns
fourmis plugin install log-analyzer
fourmis plugin install env-manager
```

### Frontend Developer

```bash
fourmis plugin install react-patterns
fourmis plugin install nextjs-patterns
fourmis plugin install design-system
fourmis plugin install a11y-audit
fourmis plugin install perf-audit
fourmis plugin install typescript-patterns
```

### Freelancer / Solo Dev

```bash
fourmis plugin install local-crm
fourmis plugin install invoice
fourmis plugin install time-tracker
fourmis plugin install freelancer-agent
fourmis plugin install git-workflow
fourmis plugin install code-health
fourmis plugin install project-scaffold
```

### AI / ML Engineer

```bash
fourmis plugin install prompt-engineering
fourmis plugin install vector-db
fourmis plugin install api-design-patterns
fourmis plugin install database-patterns
```

### Content & Marketing

```bash
fourmis plugin install markdown-writer
fourmis plugin install seo-toolkit
fourmis plugin install social-poster
fourmis plugin install marketing-agent
```

---

## Plugin Catalog

### Development (16 plugins)

Core language patterns, frameworks, and engineering practices.

| Plugin | What it does | Components |
|--------|-------------|------------|
| [`typescript-patterns`](#typescript-patterns) | Generics, utility types, type guards, Zod validation, Result types, module patterns | 6 skills, 3 commands, 1 agent |
| [`react-patterns`](#react-patterns) | Custom hooks, state management, RSC, component architecture, forms, performance | 6 skills, 3 commands, 1 agent |
| [`nextjs-patterns`](#nextjs-patterns) | App Router, data fetching, Server Actions, middleware, caching, deployment | 6 skills, 3 commands, 1 agent |
| [`go-patterns`](#go-patterns) | Concurrency, error handling, interfaces, HTTP, testing, project structure | 6 skills, 3 commands, 1 agent |
| [`api-design-patterns`](#api-design-patterns) | RESTful design, error handling (RFC 7807), pagination, rate limiting, WebSockets, GraphQL | 6 skills, 3 commands, 1 agent |
| [`database-patterns`](#database-patterns) | Schema design, query optimization, ORMs (Prisma/Drizzle/GORM), transactions, connection pooling | 6 skills, 3 commands, 1 agent |
| [`state-machines`](#state-machines) | XState v5, workflow patterns, sagas, event sourcing, CQRS, Temporal.io | 6 skills, 3 commands, 1 agent |
| [`vector-db`](#vector-db) | Embeddings, pgvector, RAG pipelines, Pinecone, ChromaDB, Weaviate | 6 skills, 3 commands, 1 agent |
| [`test-gen`](#test-gen) | Unit/integration/E2E tests, TDD, mocking, coverage analysis | 6 skills, 3 commands, 1 agent |
| [`code-review`](#code-review) | PR review workflow, checklists, SOLID analysis, code smells, test review | 6 skills, 3 commands, 1 agent |
| [`api-docs`](#api-docs) | Auto-generate OpenAPI specs from Express, Go, Next.js, Fastify routes | 3 skills, 3 commands, 1 agent |
| [`api-testing`](#api-testing) | REST testing (Supertest/httpx), mock servers (MSW), contract testing, security audits | 6 skills, 3 commands, 1 agent |
| [`project-scaffold`](#project-scaffold) | Boilerplate for Next.js, Express, Go, Python, monorepos, libraries | 6 skills, 3 commands, 1 agent |
| [`a11y-audit`](#a11y-audit) | WCAG 2.2, ARIA patterns, color contrast, keyboard nav, screen reader optimization | 6 skills, 3 commands, 1 agent |
| [`perf-audit`](#perf-audit) | Core Web Vitals, rendering, bundle size, images, caching, monitoring | 6 skills, 3 commands, 1 agent |
| [`prompt-engineering`](#prompt-engineering) | Prompt design, structured output, few-shot, chain-of-thought, RAG, LLM eval | 6 skills, 3 commands, 1 agent |

### DevOps & Infrastructure (6 plugins)

CI/CD, containers, orchestration, and observability.

| Plugin | What it does | Components |
|--------|-------------|------------|
| [`kubernetes-patterns`](#kubernetes-patterns) | Core resources, networking, storage, scaling (HPA/VPA/KEDA), Helm, troubleshooting | 6 skills, 3 commands, 1 agent |
| [`docker-toolkit`](#docker-toolkit) | Dockerfiles, Compose, debugging, image optimization, networking, security | 6 skills, 3 commands, 1 agent |
| [`ci-cd`](#ci-cd) | GitHub Actions, deployment pipelines, Docker CI, release automation, best practices | 5 skills, 3 commands, 1 agent |
| [`devops-skills`](#devops-skills) | Incident response, deployment safety, K8s troubleshooting, security hardening | 7 skills, 3 commands, 2 agents |
| [`monitoring-patterns`](#monitoring-patterns) | Structured logging, Prometheus, alerting, health checks, tracing, Grafana | 6 skills, 3 commands, 1 agent |
| [`log-analyzer`](#log-analyzer) | Log parsing, error diagnosis, monitoring, advanced search, OpenTelemetry | 6 skills, 3 commands, 1 agent |

### Productivity (7 plugins)

Workflows, business tools, and project management.

| Plugin | What it does | Components |
|--------|-------------|------------|
| [`git-workflow`](#git-workflow) | Conventional commits, branch naming, PR descriptions, changelogs, git hooks | 6 skills, 4 commands, 1 agent |
| [`code-health`](#code-health) | Complexity metrics, dependency audit, TODO tracking, dead code, health score | 3 skills, 2 commands, 1 agent |
| [`product-management`](#product-management) | PRDs, sprint planning, user stories, estimation, roadmaps, retrospectives | 6 skills, 3 commands, 1 agent |
| [`local-crm`](#local-crm) | Contacts, deals, follow-ups — SQLite CRM for freelancers | 1 skill, 2 commands, 1 agent, 17 MCP tools |
| [`invoice`](#invoice) | Create, track, export invoices — SQLite billing for freelancers | 1 skill, 1 command, 1 agent, 10 MCP tools |
| [`time-tracker`](#time-tracker) | Start/stop timers, log hours, generate timesheets — SQLite time tracking | 1 skill, 1 command, 1 agent, 12 MCP tools |
| [`freelancer-agent`](#freelancer-agent) | Orchestrates CRM + invoice + time-tracker into full business workflows | 3 skills, 4 commands, 3 agents |

### Security (2 plugins)

Authentication, authorization, and vulnerability scanning.

| Plugin | What it does | Components |
|--------|-------------|------------|
| [`auth-patterns`](#auth-patterns) | JWT, OAuth2/PKCE, sessions, password security, RBAC/ABAC, API keys | 6 skills, 3 commands, 1 agent |
| [`security-audit`](#security-audit) | Secret detection, CVE scanning, injection patterns, config audit, security headers | 1 skill, 2 commands, 1 agent, MCP server |

### Marketing & Content (3 plugins)

Writing, SEO, and social media.

| Plugin | What it does | Components |
|--------|-------------|------------|
| [`markdown-writer`](#markdown-writer) | Blog posts, technical docs, SEO content, readability, editing | 6 skills, 3 commands, 1 agent |
| [`seo-toolkit`](#seo-toolkit) | On-page SEO, technical audits, meta tags, SSL, robots.txt, performance | 3 skills, 2 commands, 1 agent, 10 MCP tools |
| [`marketing-agent`](#marketing-agent) | Orchestrates writer + SEO + social into end-to-end content workflows | 3 skills, 3 commands, 3 agents |

### Social (2 plugins)

Social media integrations.

| Plugin | What it does | Components |
|--------|-------------|------------|
| [`social-poster`](#social-poster) | Post to Bluesky and Mastodon from Claude Code | 1 skill, 2 commands, 8 MCP tools |
| [`reddit-mcp`](#reddit-mcp) | Browse, search, post, comment, vote on Reddit via MCP | 10 MCP tools |

### Design (1 plugin)

| Plugin | What it does | Components |
|--------|-------------|------------|
| [`design-system`](#design-system) | Design tokens, Tailwind theming, responsive patterns, animations, typography, CVA | 6 skills, 3 commands, 1 agent |

### Other (4 plugins)

| Plugin | What it does | Components |
|--------|-------------|------------|
| [`migration-toolkit`](#migration-toolkit) | DB migrations, dependency updates, framework upgrades, API versioning, data migrations | 6 skills, 3 commands, 1 agent |
| [`env-manager`](#env-manager) | Dotenv, type-safe validation (Zod/t3-env), secret management, .env security | 6 skills, 3 commands, 1 agent |
| [`db-explorer`](#db-explorer) | Connect to SQLite/PostgreSQL, explore schemas, run queries, export CSV | 1 skill, 2 commands, 1 agent, 10 MCP tools |
| [`hello-world`](#hello-world) | Demo plugin — greeting command and skill | 1 skill, 1 command |

---

## How Plugins Work

### Skills

Skills activate automatically based on context. When you ask about TypeScript generics, the `typescript-patterns` plugin's generics skill provides expert guidance. No slash commands needed — just ask naturally.

### Commands

Commands are invoked with `/command-name`. For example:

- `/state-diagram` — generate a state diagram from code or description
- `/k8s-manifest` — scaffold a Kubernetes manifest
- `/workflow-scaffold` — generate a complete workflow implementation
- `/code-review` — run a structured code review

### Agents

Agents are specialized AI personas with deep domain knowledge. They appear in your agent list and can be invoked for focused work:

- `workflow-expert` — state machine and workflow specialist
- `k8s-expert` — Kubernetes operations expert
- `vector-expert` — vector database and RAG specialist
- `ts-expert` — advanced TypeScript patterns

### MCP Servers

Some plugins include MCP (Model Context Protocol) servers that provide live tool integrations — database queries, API calls, social media posting, and more. These run locally with zero cloud dependencies.

---

## Plugin Architecture

```
plugins/<name>/
├── .claude-plugin/
│   └── plugin.json          # Manifest (name, version, description)
├── skills/                  # Auto-activating knowledge (YAML frontmatter + markdown)
│   └── <topic>/SKILL.md
├── commands/                # Slash commands (/command-name)
│   └── <command>.md
├── agents/                  # Specialized agent personas
│   └── <agent>.md
├── hooks/                   # Event-driven automation
│   └── <hook>.md
├── src/                     # MCP server source (if applicable)
│   └── index.ts
└── .mcp.json                # MCP server config (if applicable)
```

**Auto-discovery**: Claude Code automatically finds components in the standard directories. No registration needed — just follow the structure.

---

## Contributing

### Add a Plugin

1. Create your plugin directory under `plugins/<name>/`
2. Add `.claude-plugin/plugin.json` with name, version, and description
3. Add components in standard directories (`skills/`, `commands/`, `agents/`)
4. Submit a PR

### Plugin Standards

- **Skills** use YAML frontmatter with a `description` field for auto-triggering
- **Commands** use YAML frontmatter with `name`, `description`, and optional `arguments`
- **Agents** use YAML frontmatter with `name`, `description`, `model`, and `color`
- No dependencies required for pure knowledge plugins
- MCP plugins should include `.gitignore` for `node_modules/` and `dist/`

### Quality Checklist

- [ ] Plugin installs without errors (`fourmis plugin install <name>`)
- [ ] Skills have descriptive trigger conditions in frontmatter
- [ ] Commands include clear usage instructions
- [ ] Code examples are complete, typed, and tested
- [ ] No hardcoded secrets or credentials

---

## License

MIT
