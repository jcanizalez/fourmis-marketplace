---
name: stack
description: Analyze the current project's tech stack, dependencies, and suggest improvements
allowed-tools: Read, Glob, Grep, Bash
---

# /stack — Tech Stack Analyzer

Analyze the current project's technology stack, identify the tools and frameworks in use, and suggest improvements or missing pieces.

## Usage

```
/stack                        # Full stack analysis of current project
/stack deps                   # Focus on dependency analysis
/stack outdated               # Check for outdated dependencies
/stack security               # Security-focused dependency check
```

## Workflow

1. **Detect project type**: Scan for `package.json`, `go.mod`, `pyproject.toml`, `Cargo.toml`, `Gemfile`, etc.
2. **Map the stack**: Identify framework, language version, database, ORM, test framework, linter, bundler, CSS framework, deployment target
3. **Analyze configs**: Check for TypeScript strictness, ESLint rules, test coverage settings, CI pipeline
4. **Check dependency health**: Major version gaps, deprecated packages, security advisories
5. **Report and recommend**: Present a summary table and actionable suggestions

## Output Format

```
## Tech Stack Report

| Category      | Current                | Recommended          | Status |
|---------------|------------------------|----------------------|--------|
| Runtime       | Node.js 20             | Node.js 22 LTS      | ⚠️     |
| Framework     | Next.js 14.2           | Next.js 15.x        | ⚠️     |
| Language      | TypeScript 5.3         | TypeScript 5.7       | ⚠️     |
| Styling       | Tailwind CSS 3.4       | Tailwind CSS 4.0     | ⚠️     |
| Testing       | (none)                 | Vitest + RTL         | ❌     |
| Linting       | ESLint 8               | ESLint 9 (flat)      | ⚠️     |
| Formatting    | Prettier 3.1           | Prettier 3.4         | ✅     |
| CI/CD         | (none)                 | GitHub Actions       | ❌     |
| Docker        | Dockerfile (basic)     | Multi-stage build    | ⚠️     |
| Type Safety   | strict: false          | strict: true         | ❌     |

## Missing Essentials
- [ ] No test framework configured
- [ ] No CI/CD pipeline
- [ ] TypeScript strict mode disabled
- [ ] No .env.example file

## Suggested Actions
1. Add Vitest for testing → run `/init testing`
2. Add GitHub Actions CI → run `/init ci`
3. Enable TypeScript strict mode
4. Create .env.example → run `/init env`
```

## Detection Details

### Node.js / TypeScript Projects
- Read `package.json` for dependencies, scripts, engines
- Read `tsconfig.json` for TypeScript strictness and target
- Check for `.eslintrc.*` or `eslint.config.*`
- Check for `.prettierrc` or prettier in package.json
- Check for `vitest.config.*`, `jest.config.*`
- Check for `.github/workflows/`
- Check for `Dockerfile`, `docker-compose.yml`
- Check for `next.config.*`, `vite.config.*`, `webpack.config.*`

### Go Projects
- Read `go.mod` for Go version and dependencies
- Check for `Makefile`
- Check for `golangci-lint` config (`.golangci.yml`)
- Check for `Dockerfile`
- Check for test files (`*_test.go`)

### Python Projects
- Read `pyproject.toml` for dependencies and tool config
- Check for `ruff.toml` or ruff config in pyproject
- Check for `mypy` config
- Check for `pytest` config
- Check for `Dockerfile`
- Check for `.python-version`

## Important

- This command is read-only — it analyzes but does not modify
- Point users to `/init` or `/scaffold` for taking action
- Be specific about version numbers and links to migration guides
- Prioritize security issues over version bumps
