---
name: metrics-setup
description: Scaffold Prometheus metrics instrumentation for a service
arguments:
  - name: framework
    description: "Framework to instrument (express, fastify, net/http, gin, fiber)"
    required: false
---

# Metrics Setup

Scaffold production-ready Prometheus metrics for this service. Detect the framework automatically if not specified.

## Steps

1. **Detect framework**: Read package.json or go.mod to identify the framework. If `framework` argument is provided, use that.

2. **Install dependencies**:
   - Node.js: `prom-client` (+ `prom-client` types if TypeScript)
   - Go: `github.com/prometheus/client_golang`

3. **Create metrics module**: Generate a metrics file with:
   - RED metrics (http_requests_total counter, http_request_duration_seconds histogram, http_active_requests gauge)
   - Sensible histogram buckets: `[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]`
   - Default labels: service name, environment

4. **Create middleware**: Generate metrics middleware appropriate for the detected framework:
   - Express: `metricsMiddleware(req, res, next)`
   - Fastify: Fastify plugin with `onRequest` / `onResponse` hooks
   - Go net/http: `MetricsMiddleware(next http.Handler) http.Handler`
   - Gin: `MetricsMiddleware() gin.HandlerFunc`

5. **Create /metrics endpoint**: Add the Prometheus scrape endpoint

6. **Add to application**: Show where to register the middleware and endpoint in the existing app setup

7. **Generate Prometheus scrape config**: Create a minimal `prometheus.yml` if one doesn't exist

## Output

Show the generated files, explain what each metric tracks, and provide example PromQL queries to verify metrics are being collected:

```promql
# Verify request rate
rate(http_requests_total[5m])

# Check error rate
sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# View latency distribution
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```
