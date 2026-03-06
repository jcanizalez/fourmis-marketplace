# 🚀 log-analyzer

> Log analysis and observability toolkit — structured logging patterns (Node.

**Category:** DevOps | **6 skills** | **3 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/log-analyzer
```

## Overview

Log analysis and observability toolkit — structured logging patterns (Node.js Pino, Python structlog, Go slog), log parsing (JSON, Apache, nginx, syslog, Docker, Kubernetes), error diagnosis with stack trace analysis and root cause workflows, log monitoring and alerting (Grafana Loki, LogQL, script-based alerts), advanced log search (jq, grep, awk one-liners), and OpenTelemetry observability setup (traces, metrics, log correlation). 6 skills, 3 commands, 1 agent. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `error-diagnosis` | When the user asks to debug an error |
| `log-monitoring` | When the user asks about log monitoring |
| `log-parsing` | When the user asks about parsing log files |
| `log-search` | When the user asks about searching logs |
| `observability-setup` | When the user asks about observability |
| `structured-logging` | When the user asks about structured logging |

## Commands

| Command | Description |
|---------|-------------|
| `/diagnose` | Debug an error from a stack trace, error message, or log output — identify root cause and suggest fixes |
| `/log-setup` | Set up structured logging for a project — configure pino, structlog, or slog with best practices |
| `/logs` | Analyze log output — parse, filter, summarize, and find patterns in application logs |

## Agents

### log-analyst
Autonomous log analysis agent — parses log files, identifies error patterns, traces requests across services, performs root cause analysis, and provides actionable debugging recommendations.

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
