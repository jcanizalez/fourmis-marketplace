# code-health

Codebase quality metrics and tech debt tracking for Claude Code. Analyzes file complexity, outdated dependencies, TODO/FIXME markers, and dead code patterns. Gives your codebase a health score with actionable improvements.

## Commands

- **`/health`** — Full codebase health check with scored report (complexity, deps, debt, tests)
- **`/debt`** — Find and list all tech debt markers (TODO, FIXME, HACK, XXX) by severity

## Skills

- **Complexity Analysis** — Identifies overly complex files, deep nesting, long functions, and god files
- **Dependency Audit** — Checks for outdated packages, security concerns, bloat, and unused deps
- **Tech Debt Tracking** — Finds TODO/FIXME/HACK/XXX markers, categorizes by severity, suggests fixes

## Agents

- **health-auditor** — Deep codebase analysis subagent for thorough project-wide scans

## Installation

```bash
fourmis plugin install code-health
```

## License

MIT
