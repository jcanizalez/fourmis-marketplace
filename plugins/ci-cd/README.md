# 🚀 ci-cd

> CI/CD toolkit — GitHub Actions workflows (Node.

**Category:** DevOps | **5 skills** | **3 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/ci-cd
```

## Overview

CI/CD toolkit — GitHub Actions workflows (Node.js, Go, Python, monorepo, reusable workflows), deployment pipelines (Vercel, Fly.io, Railway, AWS, blue-green, canary, rolling), Docker CI (multi-stage builds, layer caching, vulnerability scanning, multi-arch), release automation (semantic-release, Changesets, GoReleaser, GitHub Releases, changelogs), and CI best practices (caching, parallelism, test sharding, matrix builds, OIDC secrets, concurrency groups). 5 skills, 3 commands, 1 agent. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `ci-best-practices` | When the user asks to speed up CI builds |
| `deployment-pipelines` | When the user asks to set up a deployment pipeline |
| `docker-ci` | When the user asks to build Docker images in CI |
| `github-actions` | When the user asks to create a GitHub Actions workflow |
| `release-automation` | When the user asks to set up automated releases |

## Commands

| Command | Description |
|---------|-------------|
| `/ci` | Analyze and improve existing CI/CD configuration — find bottlenecks, suggest optimizations |
| `/deploy` | Generate or review a deployment pipeline — staging, production, rollback |
| `/workflow` | Generate a GitHub Actions workflow for your project — CI, deploy, release, or custom |

## Agents

### ci-engineer
Autonomous CI/CD engineer agent — sets up pipelines, optimizes builds, configures deployments, and automates releases. Reads project structure and generates production-ready GitHub Actions workflows.

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
