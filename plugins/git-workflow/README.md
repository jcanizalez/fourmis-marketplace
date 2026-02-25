# git-workflow

Smart git workflows for Claude Code. Enforces consistent practices: conventional commits, branch naming, PR descriptions, and changelog generation.

## Commands

- **`/commit`** — Stage changes and create a conventional commit with a well-crafted message
- **`/branch`** — Create a properly named branch following naming conventions
- **`/changelog`** — Generate a changelog from git history, grouped by type
- **`/pr`** — Create a pull request with structured description and testing steps

## Skills

- **Conventional Commits** — Automatically formats commit messages following the Conventional Commits spec (feat, fix, refactor, etc.)
- **Branch Strategy** — Enforces branch naming conventions and provides guidance on branching workflows
- **PR Workflow** — Generates PR descriptions, changelogs, and pre-commit checklists

## Installation

```bash
fourmis plugin install git-workflow
```

## License

MIT
