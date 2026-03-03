---
name: observability-audit
description: Audit a project's observability setup — logging, metrics, tracing, health checks, alerting
arguments:
  - name: path
    description: Path to the project (defaults to current directory)
    required: false
---

# Observability Audit

Perform a comprehensive observability audit of this project. Check for the following and report findings:

## Audit Steps

1. **Detect stack**: Identify the language/framework (Node.js, Go, Python, etc.) and check package.json, go.mod, or requirements.txt for observability dependencies

2. **Logging audit**:
   - Check if a structured logger is configured (pino, winston, zerolog, zap, logrus)
   - Look for `console.log` / `fmt.Println` usage (flag as unstructured)
   - Check for sensitive data in log statements (passwords, tokens, PII)
   - Verify log levels are used appropriately
   - Check for correlation ID / request ID propagation

3. **Metrics audit**:
   - Check for Prometheus client library (prom-client, prometheus/client_golang)
   - Look for `/metrics` endpoint
   - Verify RED metrics exist (request rate, errors, duration)
   - Check for custom business metrics
   - Flag high-cardinality labels (user IDs, order IDs in label values)

4. **Tracing audit**:
   - Check for OpenTelemetry SDK setup
   - Verify tracer initialization happens before other imports
   - Check for manual span creation in key business logic
   - Look for context propagation in HTTP clients

5. **Health checks audit**:
   - Look for `/health`, `/ready`, `/healthz`, `/readyz` endpoints
   - Check if dependency checks are included (DB, Redis, external APIs)
   - Verify Kubernetes probe configuration if k8s manifests exist

6. **Alerting audit**:
   - Check for Prometheus alert rules files
   - Verify alerts have `for` duration (avoid flapping)
   - Check that alerts include runbook annotations
   - Look for Grafana alert configurations

## Output Format

Present findings as a scorecard:

```
## Observability Scorecard

| Area              | Score | Status |
|-------------------|-------|--------|
| Structured Logging | 8/10 | ✅ Good |
| Metrics           | 3/10  | ⚠️ Needs work |
| Tracing           | 0/10  | ❌ Missing |
| Health Checks     | 6/10  | ⚠️ Partial |
| Alerting          | 0/10  | ❌ Missing |

### Recommendations (Priority Order)
1. [Critical] Add Prometheus metrics with RED method
2. [High] Set up OpenTelemetry tracing
3. [Medium] Add alerting rules for error rate and latency
...
```

For each finding, reference the relevant skill from this plugin for implementation guidance.
