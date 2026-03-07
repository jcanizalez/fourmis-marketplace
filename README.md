# Fourmis Marketplace

**43 open-source plugins for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). 196 skills. 117 commands. 48 agents. 8 MCP servers.**

Production-ready patterns, developer tools, hooks, and workflow automation — all installable in one command. No API keys. No cloud dependencies.

[Browse the catalog](https://jcanizalez.github.io/fourmis-marketplace/) | [Contributing](CONTRIBUTING.md)

---

## Install any plugin

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/<name>
```

Replace `<name>` with any plugin from the catalog below. Skills activate automatically. Commands are available via `/command-name`.

---

## What's inside

### Hooks (NEW)

Claude Code hooks that run automatically — guard dangerous commands, protect sensitive files, auto-lint your code, and verify task completeness.

| Plugin | What it does |
|--------|-------------|
| [`hooks-toolkit`](plugins/hooks-toolkit/) | 5 production-ready hooks — bash safety guard, file protection, auto-lint, session context, completeness check |
| [`workspace-setup`](plugins/workspace-setup/) | Auto-detect project stack on session start, recommend relevant plugins, `/setup` command |

### Development (17 plugins)

| Plugin | What it does | Components |
|--------|-------------|------------|
| [`typescript-patterns`](plugins/typescript-patterns/) | Generics, utility types, type guards, Zod, Result types, module patterns | 6 skills, 3 cmds, 1 agent |
| [`react-patterns`](plugins/react-patterns/) | Hooks, state management, RSC, component architecture, forms, performance | 6 skills, 3 cmds, 1 agent |
| [`nextjs-patterns`](plugins/nextjs-patterns/) | App Router, data fetching, Server Actions, middleware, caching, deployment | 6 skills, 3 cmds, 1 agent |
| [`go-patterns`](plugins/go-patterns/) | Concurrency, error handling, interfaces, HTTP, testing, project structure | 6 skills, 3 cmds, 1 agent |
| [`api-design-patterns`](plugins/api-design-patterns/) | REST design, error handling (RFC 7807), pagination, rate limiting, WebSocket, GraphQL | 6 skills, 3 cmds, 1 agent |
| [`database-patterns`](plugins/database-patterns/) | Schema design, query optimization, ORMs (Prisma/GORM/SQLx), transactions, pooling | 6 skills, 3 cmds, 1 agent |
| [`state-machines`](plugins/state-machines/) | XState v5, workflow patterns, sagas, event sourcing, CQRS, Temporal.io | 6 skills, 3 cmds, 1 agent |
| [`vector-db`](plugins/vector-db/) | Embeddings, pgvector, RAG pipelines, Pinecone, ChromaDB, Weaviate | 6 skills, 3 cmds, 1 agent |
| [`test-gen`](plugins/test-gen/) | Unit/integration/E2E tests, TDD, mocking, coverage analysis | 6 skills, 3 cmds, 1 agent |
| [`code-review`](plugins/code-review/) | PR review workflow, checklists, SOLID analysis, code smells, test review | 6 skills, 3 cmds, 1 agent |
| [`api-testing`](plugins/api-testing/) | REST testing (Supertest/httpx), mock servers (MSW), contract testing | 6 skills, 3 cmds, 1 agent |
| [`api-docs`](plugins/api-docs/) | Auto-generate OpenAPI specs from Express, Go, Next.js, Fastify routes | 3 skills, 3 cmds, 1 agent |
| [`project-scaffold`](plugins/project-scaffold/) | Boilerplate for Next.js, Express, Go, Python, monorepos, libraries | 6 skills, 3 cmds, 1 agent |
| [`a11y-audit`](plugins/a11y-audit/) | WCAG 2.2, ARIA, color contrast, keyboard nav, screen reader optimization | 6 skills, 3 cmds, 1 agent |
| [`perf-audit`](plugins/perf-audit/) | Core Web Vitals, rendering, bundle size, images, caching, monitoring | 6 skills, 3 cmds, 1 agent |
| [`prompt-engineering`](plugins/prompt-engineering/) | Prompt design, structured output, few-shot, CoT, RAG, LLM eval | 6 skills, 3 cmds, 1 agent |
| [`migration-toolkit`](plugins/migration-toolkit/) | DB migrations, dependency updates, framework upgrades, API versioning | 6 skills, 3 cmds, 1 agent |

### DevOps & Infrastructure (6 plugins)

| Plugin | What it does | Components |
|--------|-------------|------------|
| [`docker-toolkit`](plugins/docker-toolkit/) | Dockerfiles, Compose, debugging, image optimization, networking, security | 6 skills, 3 cmds, 1 agent |
| [`kubernetes-patterns`](plugins/kubernetes-patterns/) | Resources, networking, storage, scaling (HPA/VPA/KEDA), Helm, troubleshooting | 6 skills, 3 cmds, 1 agent |
| [`ci-cd`](plugins/ci-cd/) | GitHub Actions, deployment pipelines, Docker CI, release automation | 5 skills, 3 cmds, 1 agent |
| [`devops-skills`](plugins/devops-skills/) | Incident response, deployment safety, K8s troubleshooting, security hardening | 7 skills, 3 cmds, 2 agents |
| [`monitoring-patterns`](plugins/monitoring-patterns/) | Structured logging, Prometheus, alerting, health checks, tracing, Grafana | 6 skills, 3 cmds, 1 agent |
| [`log-analyzer`](plugins/log-analyzer/) | Log parsing, error diagnosis, monitoring, advanced search, OpenTelemetry | 6 skills, 3 cmds, 1 agent |

### Productivity (8 plugins)

| Plugin | What it does | Components |
|--------|-------------|------------|
| [`git-workflow`](plugins/git-workflow/) | Conventional commits, branch naming, PRs, changelogs, git hooks, conflict resolution | 6 skills, 4 cmds, 1 agent |
| [`code-health`](plugins/code-health/) | Complexity metrics, dependency audit, TODO tracking, dead code, health score | 3 skills, 2 cmds, 1 agent |
| [`product-management`](plugins/product-management/) | PRDs, sprint planning, user stories, estimation, roadmaps, retrospectives | 6 skills, 3 cmds, 1 agent |
| [`env-manager`](plugins/env-manager/) | Dotenv, type-safe validation (Zod/t3-env), secret management, .env security | 6 skills, 3 cmds, 1 agent |
| [`local-crm`](plugins/local-crm/) | Contacts, deals, follow-ups — SQLite CRM for freelancers | 1 skill, 2 cmds, 1 agent, MCP |
| [`invoice`](plugins/invoice/) | Create, track, export invoices — SQLite billing for freelancers | 1 skill, 1 cmd, 1 agent, MCP |
| [`time-tracker`](plugins/time-tracker/) | Start/stop timers, log hours, generate timesheets — SQLite time tracking | 1 skill, 1 cmd, 1 agent, MCP |
| [`freelancer-agent`](plugins/freelancer-agent/) | Orchestrates CRM + invoice + time-tracker into full business workflows | 3 skills, 4 cmds, 3 agents |

### Security (2 plugins)

| Plugin | What it does | Components |
|--------|-------------|------------|
| [`auth-patterns`](plugins/auth-patterns/) | JWT, OAuth2/PKCE, sessions, password security, RBAC/ABAC, API keys | 6 skills, 3 cmds, 1 agent |
| [`security-audit`](plugins/security-audit/) | Secret detection, CVE scanning, injection patterns, config audit, headers | 1 skill, 2 cmds, 1 agent, MCP |

### Content & Marketing (3 plugins)

| Plugin | What it does | Components |
|--------|-------------|------------|
| [`markdown-writer`](plugins/markdown-writer/) | Blog posts, technical docs, SEO content, readability, editing | 6 skills, 3 cmds, 1 agent |
| [`seo-toolkit`](plugins/seo-toolkit/) | On-page SEO, technical audits, meta tags, SSL, robots.txt, performance | 3 skills, 2 cmds, 1 agent, MCP |
| [`marketing-agent`](plugins/marketing-agent/) | Orchestrates writer + SEO + social into end-to-end content workflows | 3 skills, 3 cmds, 3 agents |

### Social (2 plugins)

| Plugin | What it does | Components |
|--------|-------------|------------|
| [`social-poster`](plugins/social-poster/) | Post to Bluesky and Mastodon from Claude Code | 1 skill, 2 cmds, MCP |
| [`reddit-mcp`](plugins/reddit-mcp/) | Browse, search, post, comment, vote on Reddit via MCP | MCP (10 tools) |

### Design (1 plugin)

| Plugin | What it does | Components |
|--------|-------------|------------|
| [`design-system`](plugins/design-system/) | Design tokens, Tailwind theming, responsive patterns, animations, typography | 6 skills, 3 cmds, 1 agent |

### Database (1 plugin)

| Plugin | What it does | Components |
|--------|-------------|------------|
| [`db-explorer`](plugins/db-explorer/) | Connect to SQLite/PostgreSQL, explore schemas, run queries, export CSV | 1 skill, 2 cmds, 1 agent, MCP |

---

## Starter Packs

Install a curated bundle for your role:

<details>
<summary><strong>Full-Stack TypeScript</strong></summary>

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/typescript-patterns
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/react-patterns
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/nextjs-patterns
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/api-design-patterns
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/database-patterns
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/test-gen
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/hooks-toolkit
```
</details>

<details>
<summary><strong>Backend Go</strong></summary>

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/go-patterns
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/api-design-patterns
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/database-patterns
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/docker-toolkit
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/test-gen
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/hooks-toolkit
```
</details>

<details>
<summary><strong>DevOps / Platform</strong></summary>

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/kubernetes-patterns
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/docker-toolkit
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/ci-cd
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/devops-skills
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/monitoring-patterns
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/log-analyzer
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/hooks-toolkit
```
</details>

<details>
<summary><strong>Frontend</strong></summary>

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/react-patterns
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/nextjs-patterns
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/design-system
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/a11y-audit
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/perf-audit
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/typescript-patterns
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/hooks-toolkit
```
</details>

<details>
<summary><strong>Freelancer</strong></summary>

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/local-crm
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/invoice
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/time-tracker
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/freelancer-agent
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/git-workflow
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/hooks-toolkit
```
</details>

<details>
<summary><strong>AI / ML</strong></summary>

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/prompt-engineering
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/vector-db
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/api-design-patterns
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/database-patterns
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/hooks-toolkit
```
</details>

---

## How plugins work

**Skills** activate automatically based on context. Ask about TypeScript generics and the `typescript-patterns` plugin provides expert guidance — no slash commands needed.

**Commands** are invoked with `/command-name`:
- `/setup` — detect your project stack and get plugin recommendations
- `/plugins` — browse the full marketplace catalog
- `/hooks-check` — verify your hooks configuration
- `/hooks-new` — scaffold a new Claude Code hook

**Agents** are specialized AI personas for focused work — `ts-expert`, `go-expert`, `k8s-expert`, `hooks-auditor`, `workspace-advisor`, and more.

**Hooks** run automatically at lifecycle events — block dangerous commands, protect sensitive files, auto-lint after edits, inject project context on session start.

**MCP servers** provide live tool integrations — database queries, social media posting, SEO analysis, invoicing — running locally with zero cloud dependencies.

## Plugin structure

```
plugins/<name>/
  .claude-plugin/plugin.json    # Manifest
  skills/<topic>/SKILL.md       # Auto-activating knowledge
  commands/<cmd>.md             # Slash commands
  agents/<agent>.md             # Specialized agents
  hooks/hooks.json              # Lifecycle hooks
  scripts/                      # Hook scripts
  .mcp.json                     # MCP server config
```

Components are auto-discovered by Claude Code. No registration needed.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

**Quick version:**

1. Fork this repo
2. Create your plugin under `plugins/<name>/`
3. Add `.claude-plugin/plugin.json` with name, version, description
4. Add components in standard directories
5. Submit a PR

---

## License

MIT
