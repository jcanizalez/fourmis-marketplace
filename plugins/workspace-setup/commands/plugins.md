---
name: plugins
description: Browse and search the Fourmis Marketplace plugin catalog by category or keyword
arguments:
  - name: query
    description: "Category or search term: development, devops, productivity, security, or any keyword"
    required: false
---

# Plugins Command

When the user runs `/plugins`, show the Fourmis Marketplace catalog. If a query is provided, filter by category or keyword.

## Steps

### 1. Parse the Query

- No query → show all categories with counts
- Category name (e.g., "devops") → show plugins in that category
- Keyword (e.g., "docker", "testing", "api") → search plugin names and descriptions

### 2. Show Results

**No query — show category overview:**

```
Fourmis Marketplace — 42 plugins
================================

development (17): typescript-patterns, react-patterns, nextjs-patterns,
  go-patterns, api-design-patterns, database-patterns, ...
devops (6): docker-toolkit, kubernetes-patterns, ci-cd,
  devops-skills, monitoring-patterns, log-analyzer
productivity (7): git-workflow, code-review, test-gen,
  code-health, product-management, ...
security (2): auth-patterns, security-audit
design (1): design-system
content (1): markdown-writer
marketing (2): seo-toolkit, marketing-agent
social (2): social-poster, reddit-mcp

Browse: https://jcanizalez.github.io/fourmis-marketplace/
Install: claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/<name>
```

**Category filter — show plugins with descriptions:**

```
DevOps Plugins (6)
==================

docker-toolkit — Dockerfiles, Compose, debugging, optimization, networking, security
  6 skills · 3 commands · 1 agent

kubernetes-patterns — Resources, networking, storage, scaling, Helm, troubleshooting
  6 skills · 3 commands · 1 agent

ci-cd — GitHub Actions, deployment pipelines, Docker CI, releases
  5 skills · 3 commands · 1 agent

...
```

**Keyword search — show matching plugins:**

```
Search: "testing" — 3 results
==============================

test-gen — Unit, integration, E2E tests, TDD, mocking, coverage analysis
  Category: development · 6 skills · 3 commands · 1 agent

api-testing — REST testing, mock servers, contract testing, security auditing
  Category: development · 6 skills · 3 commands · 1 agent

hooks-toolkit — Safety guards, file protection, auto-lint, completeness checks
  Category: development · 3 skills · 2 commands · 1 agent · 5 hooks
```

### 3. Offer Next Steps

After showing results, offer:
- "Run `/setup` for personalized recommendations based on your project"
- Show the install command for any plugin they're interested in

## Rules

- Source plugin data from the marketplace catalog at https://jcanizalez.github.io/fourmis-marketplace/
- Keep descriptions concise (one line per plugin)
- Always show component counts (skills, commands, agents, MCP)
- If the search has no results, suggest browsing by category
- Show the install command format so users can act immediately
