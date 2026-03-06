# 🚀 monitoring-patterns

> Production observability patterns — structured logging (Pino, Winston, zerolog with correlation IDs and redaction), Prometheus metrics (RED/USE methods, prom-client, client_golang, custom business metrics, label best practices), alerting rules (Prometheus rules, Alertmanager routing, SLO burn-rate alerts, severity levels, alert fatigue prevention), health checks (liveness/readiness/startup probes, dependency checkers, Kubernetes configuration, graceful degradation), distributed tracing (OpenTelemetry SDK for Node.

**Category:** DevOps | **6 skills** | **3 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/monitoring-patterns
```

## Overview

Production observability patterns — structured logging (Pino, Winston, zerolog with correlation IDs and redaction), Prometheus metrics (RED/USE methods, prom-client, client_golang, custom business metrics, label best practices), alerting rules (Prometheus rules, Alertmanager routing, SLO burn-rate alerts, severity levels, alert fatigue prevention), health checks (liveness/readiness/startup probes, dependency checkers, Kubernetes configuration, graceful degradation), distributed tracing (OpenTelemetry SDK for Node.js and Go, auto-instrumentation, manual spans, context propagation, sampling strategies, collector config), and Grafana dashboards (PromQL queries, RED/USE/SLO/database dashboards, JSON provisioning, variables, GitOps). 6 skills, 3 commands, 1 agent. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `alerting-rules` | When the user asks about alerting rules |
| `dashboard-patterns` | When the user asks about Grafana dashboards |
| `distributed-tracing` | When the user asks about distributed tracing |
| `health-checks` | When the user asks about health checks |
| `metrics-patterns` | When the user asks about Prometheus metrics |
| `structured-logging` | When the user asks about structured logging |

## Commands

| Command | Description |
|---------|-------------|
| `/dashboard-gen` | Generate a Grafana dashboard JSON for a service |
| `/metrics-setup` | Scaffold Prometheus metrics instrumentation for a service |
| `/observability-audit` | Audit a project's observability setup — logging, metrics, tracing, health checks, alerting |

## Agents

### observability-expert
Expert in production observability — structured logging, Prometheus metrics, OpenTelemetry tracing, Grafana dashboards, alerting, and health checks for Node.js and Go services

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
