---
description: When the user asks about alerting rules, Prometheus alerts, Grafana alerts, PagerDuty, Slack notifications, on-call, alert fatigue, SLO-based alerting, or incident notification
---

# Alerting Rules & Notification Patterns

Define meaningful alerts that catch real problems without drowning teams in noise. Covers Prometheus alerting rules, Grafana alerting, notification channels, and alert fatigue prevention.

## Alerting Philosophy

```
                    ┌─────────────┐
                    │   Metrics   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Rules     │  ← Prometheus/Grafana evaluates conditions
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Alertmanager│  ← Groups, deduplicates, routes, silences
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
          ┌───────┐  ┌─────────┐  ┌──────────┐
          │ Slack │  │PagerDuty│  │  Email   │
          │(warn) │  │(critical)│  │(weekly)  │
          └───────┘  └─────────┘  └──────────┘
```

## Prometheus Alerting Rules

### Service Health (RED)

```yaml
# alerts/service-health.rules.yml
groups:
  - name: service-health
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (service)
            /
            sum(rate(http_requests_total[5m])) by (service)
          ) > 0.05
        for: 5m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "High error rate on {{ $labels.service }}"
          description: "{{ $labels.service }} has {{ $value | humanizePercentage }} error rate (threshold: 5%)"
          runbook: "https://wiki.internal/runbooks/high-error-rate"
          dashboard: "https://grafana.internal/d/service-overview?var-service={{ $labels.service }}"

      # High latency (p99)
      - alert: HighLatencyP99
        expr: |
          histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))
          > 2.0
        for: 10m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "High p99 latency on {{ $labels.service }}"
          description: "{{ $labels.service }} p99 latency is {{ $value | humanizeDuration }} (threshold: 2s)"
          runbook: "https://wiki.internal/runbooks/high-latency"

      # Low request rate (possible outage)
      - alert: LowRequestRate
        expr: |
          sum(rate(http_requests_total[5m])) by (service) < 0.1
          and
          sum(rate(http_requests_total[1h] offset 1d)) by (service) > 1
        for: 10m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Unusually low traffic on {{ $labels.service }}"
          description: "{{ $labels.service }} receiving {{ $value | humanize }} req/s (had >1 req/s yesterday)"
```

### Resource Alerts (USE)

```yaml
  - name: resource-alerts
    rules:
      # High CPU usage
      - alert: HighCPUUsage
        expr: |
          (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) by (instance))
          > 0.85
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "High CPU on {{ $labels.instance }}"
          description: "CPU usage at {{ $value | humanizePercentage }}"

      # Memory pressure
      - alert: HighMemoryUsage
        expr: |
          (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)
          > 0.90
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Memory critical on {{ $labels.instance }}"
          description: "Memory usage at {{ $value | humanizePercentage }}"

      # Disk space
      - alert: DiskSpaceLow
        expr: |
          (1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})
          > 0.85
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Disk space low on {{ $labels.instance }}"
          description: "{{ $labels.mountpoint }} at {{ $value | humanizePercentage }} capacity"

      # Disk will fill prediction
      - alert: DiskWillFillIn24h
        expr: |
          predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[6h], 24 * 3600) < 0
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: "Disk on {{ $labels.instance }} predicted to fill within 24h"
```

### Database Alerts

```yaml
  - name: database-alerts
    rules:
      - alert: SlowQueries
        expr: |
          histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))
          > 1.0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow database queries (p95 > 1s)"

      - alert: ConnectionPoolExhausted
        expr: |
          db_connection_pool_size{state="waiting"} > 5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool saturated"
          description: "{{ $value }} queries waiting for connections"

      - alert: HighDatabaseErrors
        expr: |
          rate(db_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High database error rate"
```

### SLO-Based Alerts (Burn Rate)

```yaml
  - name: slo-alerts
    rules:
      # SLO: 99.9% availability (error budget: 0.1%)
      # Fast burn: consuming error budget 14.4x faster than allowed
      - alert: SLOBurnRateFast
        expr: |
          (
            sum(rate(http_requests_total{status_code=~"5.."}[1h])) by (service)
            /
            sum(rate(http_requests_total[1h])) by (service)
          ) > (14.4 * 0.001)
          and
          (
            sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (service)
            /
            sum(rate(http_requests_total[5m])) by (service)
          ) > (14.4 * 0.001)
        for: 2m
        labels:
          severity: critical
          slo: availability
        annotations:
          summary: "SLO burn rate critical for {{ $labels.service }}"
          description: "Error budget being consumed 14.4x faster than allowed. Will exhaust in ~1 hour."

      # Slow burn: consuming error budget 3x faster than allowed
      - alert: SLOBurnRateSlow
        expr: |
          (
            sum(rate(http_requests_total{status_code=~"5.."}[6h])) by (service)
            /
            sum(rate(http_requests_total[6h])) by (service)
          ) > (3 * 0.001)
          and
          (
            sum(rate(http_requests_total{status_code=~"5.."}[30m])) by (service)
            /
            sum(rate(http_requests_total[30m])) by (service)
          ) > (3 * 0.001)
        for: 15m
        labels:
          severity: warning
          slo: availability
        annotations:
          summary: "SLO slow burn for {{ $labels.service }}"
          description: "Error budget being consumed 3x faster than allowed. Will exhaust in ~10 hours."
```

## Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: "https://hooks.slack.com/services/xxx/yyy/zzz"
  pagerduty_url: "https://events.pagerduty.com/v2/enqueue"

# Notification templates
templates:
  - "/etc/alertmanager/templates/*.tmpl"

# Routing tree
route:
  receiver: "default-slack"
  group_by: ["alertname", "service"]
  group_wait: 30s        # Wait before sending first notification
  group_interval: 5m     # Wait before sending updates
  repeat_interval: 4h    # Re-notify every 4 hours

  routes:
    # Critical → PagerDuty (page on-call)
    - match:
        severity: critical
      receiver: "pagerduty-critical"
      group_wait: 10s
      repeat_interval: 1h

    # Warning → Slack channel
    - match:
        severity: warning
      receiver: "team-slack"
      repeat_interval: 4h

    # SLO alerts → dedicated channel
    - match:
        slo: availability
      receiver: "slo-alerts"
      group_by: ["service", "slo"]

# Receivers
receivers:
  - name: "default-slack"
    slack_configs:
      - channel: "#alerts"
        send_resolved: true
        title: '{{ if eq .Status "firing" }}🔴{{ else }}✅{{ end }} {{ .GroupLabels.alertname }}'
        text: >-
          {{ range .Alerts }}
          *{{ .Annotations.summary }}*
          {{ .Annotations.description }}
          {{ if .Annotations.runbook }}📖 <{{ .Annotations.runbook }}|Runbook>{{ end }}
          {{ if .Annotations.dashboard }}📊 <{{ .Annotations.dashboard }}|Dashboard>{{ end }}
          {{ end }}

  - name: "pagerduty-critical"
    pagerduty_configs:
      - service_key: "your-pagerduty-service-key"
        severity: critical
        description: '{{ .GroupLabels.alertname }}: {{ .CommonAnnotations.summary }}'
        details:
          firing: '{{ .Alerts.Firing | len }}'
          resolved: '{{ .Alerts.Resolved | len }}'

  - name: "team-slack"
    slack_configs:
      - channel: "#backend-alerts"
        send_resolved: true

  - name: "slo-alerts"
    slack_configs:
      - channel: "#slo-tracking"
        send_resolved: true

# Inhibition rules — suppress lower severity when higher is firing
inhibit_rules:
  - source_match:
      severity: "critical"
    target_match:
      severity: "warning"
    equal: ["alertname", "service"]
```

## Alert Fatigue Prevention

### Rules of Good Alerting

```yaml
# ✅ GOOD: Actionable, with context
- alert: HighErrorRate
  expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
  for: 5m                  # ← Wait before firing (avoid flapping)
  annotations:
    summary: "Clear what's wrong"
    runbook: "Link to fix it"  # ← How to respond
    dashboard: "Link to see it" # ← Where to look

# ❌ BAD: Not actionable
- alert: CPUAbove50Percent
  expr: cpu_usage > 0.5    # ← Too sensitive
  for: 1m                  # ← Too short
  # No runbook, no dashboard, no useful description
```

### Severity Levels

| Severity | Response | Channel | SLA |
|----------|----------|---------|-----|
| **critical** | Page on-call NOW | PagerDuty | 15 min response |
| **warning** | Investigate within hours | Slack | 4h response |
| **info** | Review in next business day | Email/dashboard | Next day |

### Silence & Maintenance

```bash
# Silence alerts during maintenance
amtool silence add alertname="HighErrorRate" service="order-api" \
  --comment="Planned deploy" --duration=30m

# List active silences
amtool silence query

# Remove silence
amtool silence expire <silence-id>
```

## Grafana Alerting (Alternative)

```json
{
  "alert": {
    "name": "High Error Rate",
    "conditions": [
      {
        "evaluator": { "type": "gt", "params": [0.05] },
        "operator": { "type": "and" },
        "query": { "params": ["A", "5m", "now"] },
        "reducer": { "type": "avg" },
        "type": "query"
      }
    ],
    "executionErrorState": "alerting",
    "for": "5m",
    "frequency": "1m",
    "notifications": [
      { "uid": "slack-backend" },
      { "uid": "pagerduty-critical" }
    ]
  }
}
```

## On-Call Best Practices

1. **Every alert must have a runbook** — a linked document explaining what to check and how to fix it
2. **Group related alerts** — don't send 50 individual pod alerts when the node is down
3. **Use `for` duration** — at least 5m for warnings, 2m for critical (avoid flapping)
4. **Track alert metrics** — measure false positive rate, MTTA (mean time to acknowledge), MTTR
5. **Regular alert review** — monthly: delete/tune alerts nobody acts on
6. **Escalation policies** — if not acknowledged in 15m, escalate to backup
7. **Post-incident** — was there an alert? Was it actionable? If not, fix it
