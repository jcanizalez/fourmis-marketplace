# 🚀 env-manager

> Environment variable and configuration management toolkit — dotenv patterns and precedence rules (Node.

**Category:** DevOps | **6 skills** | **3 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/env-manager
```

## Overview

Environment variable and configuration management toolkit — dotenv patterns and precedence rules (Node.js, Python, Go), type-safe env validation (Zod, t3-env, Pydantic, Go envconfig), secret management (1Password CLI, cloud vaults, rotation strategies), 12-factor config patterns and feature flags, .env.example sync and developer onboarding, and env security (leak prevention, gitleaks, secret scanning, audit). 6 skills, 3 commands, 1 agent. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `config-patterns` | When the user asks about application configuration patterns |
| `env-files` | When the user asks about dotenv files |
| `env-security` | When the user asks about preventing env file leaks |
| `env-sync` | When the user asks about syncing .env.example |
| `env-validation` | When the user asks about validating environment variables |
| `secret-management` | When the user asks about secret management |

## Commands

| Command | Description |
|---------|-------------|
| `/env-check` | Validate .env against .env.example — find missing variables, check for exposed secrets, and verify config completeness |
| `/env-setup` | Set up type-safe environment validation for a project — configure t3-env, Zod, pydantic-settings, or envconfig |
| `/env-sync` | Sync .env.example from your actual .env — keep the template up to date with placeholder values |

## Agents

### config-manager
Environment configuration specialist — audits .env files, sets up type-safe validation, identifies missing variables, prevents secret leaks, and helps manage configuration across environments.

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
