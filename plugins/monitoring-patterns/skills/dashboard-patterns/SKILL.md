---
description: When the user asks about Grafana dashboards, PromQL queries, dashboard provisioning, RED dashboards, USE dashboards, SLO dashboards, dashboard variables, or monitoring visualization
---

# Grafana Dashboard Patterns

Build production Grafana dashboards with PromQL — service overviews, RED/USE dashboards, SLO tracking, and automated provisioning. Includes reusable templates and query patterns.

## PromQL Essentials

### Rate & Aggregation

```promql
# Request rate (per second, 5 minute window)
rate(http_requests_total[5m])

# Rate by route and method
sum(rate(http_requests_total[5m])) by (method, route)

# Error rate percentage
sum(rate(http_requests_total{status_code=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))

# Latency percentiles (from histogram)
histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))  # p50
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))  # p95
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))  # p99

# Increase over time period (total count in window)
increase(http_requests_total[1h])

# Average over time
avg_over_time(http_active_requests[5m])
```

### Filtering & Grouping

```promql
# Filter by label
http_requests_total{service="order-api", status_code=~"5.."}

# Regex match
http_requests_total{route=~"/api/orders.*"}

# Negative match
http_requests_total{status_code!~"2.."}

# Group by with sum
sum by (service) (rate(http_requests_total[5m]))

# Top-K
topk(5, sum by (route) (rate(http_requests_total[5m])))
```

## RED Dashboard (Service Overview)

### JSON Model for Provisioning

```json
{
  "dashboard": {
    "title": "Service Overview - ${service}",
    "tags": ["generated", "red"],
    "timezone": "browser",
    "refresh": "30s",
    "time": { "from": "now-1h", "to": "now" },
    "templating": {
      "list": [
        {
          "name": "service",
          "type": "query",
          "datasource": "Prometheus",
          "query": "label_values(http_requests_total, service)",
          "refresh": 2,
          "sort": 1
        },
        {
          "name": "interval",
          "type": "interval",
          "options": [
            { "text": "1m", "value": "1m", "selected": false },
            { "text": "5m", "value": "5m", "selected": true },
            { "text": "15m", "value": "15m", "selected": false }
          ]
        }
      ]
    },
    "panels": [
      {
        "title": "Request Rate",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 8, "x": 0, "y": 0 },
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{service=\"$service\"}[$interval])) by (method)",
            "legendFormat": "{{ method }}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "reqps",
            "custom": { "fillOpacity": 10 }
          }
        }
      },
      {
        "title": "Error Rate",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 8, "x": 8, "y": 0 },
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{service=\"$service\", status_code=~\"5..\"}[$interval])) / sum(rate(http_requests_total{service=\"$service\"}[$interval])) * 100",
            "legendFormat": "error %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 1, "color": "yellow" },
                { "value": 5, "color": "red" }
              ]
            }
          }
        }
      },
      {
        "title": "Latency (p50 / p95 / p99)",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 8, "x": 16, "y": 0 },
        "targets": [
          {
            "expr": "histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket{service=\"$service\"}[$interval])) by (le))",
            "legendFormat": "p50"
          },
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service=\"$service\"}[$interval])) by (le))",
            "legendFormat": "p95"
          },
          {
            "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{service=\"$service\"}[$interval])) by (le))",
            "legendFormat": "p99"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "custom": { "fillOpacity": 0 }
          }
        }
      }
    ]
  }
}
```

### Additional RED Panels

```json
[
  {
    "title": "Active Requests",
    "type": "stat",
    "gridPos": { "h": 4, "w": 6, "x": 0, "y": 8 },
    "targets": [{
      "expr": "sum(http_active_requests{service=\"$service\"})"
    }],
    "fieldConfig": {
      "defaults": { "thresholds": { "steps": [
        { "value": 0, "color": "green" },
        { "value": 50, "color": "yellow" },
        { "value": 100, "color": "red" }
      ]}}
    }
  },
  {
    "title": "Requests by Status Code",
    "type": "piechart",
    "gridPos": { "h": 8, "w": 6, "x": 6, "y": 8 },
    "targets": [{
      "expr": "sum(increase(http_requests_total{service=\"$service\"}[$__range])) by (status_code)",
      "legendFormat": "{{ status_code }}"
    }]
  },
  {
    "title": "Top Routes by Request Rate",
    "type": "bargauge",
    "gridPos": { "h": 8, "w": 12, "x": 12, "y": 8 },
    "targets": [{
      "expr": "topk(10, sum by (route) (rate(http_requests_total{service=\"$service\"}[$interval])))",
      "legendFormat": "{{ route }}"
    }],
    "fieldConfig": { "defaults": { "unit": "reqps" } }
  }
]
```

## USE Dashboard (Infrastructure)

```promql
# CPU Utilization
1 - avg(rate(node_cpu_seconds_total{mode="idle", instance="$instance"}[5m]))

# CPU Saturation (load average / cores)
node_load1{instance="$instance"} / count(node_cpu_seconds_total{mode="idle", instance="$instance"})

# Memory Utilization
1 - (node_memory_MemAvailable_bytes{instance="$instance"} / node_memory_MemTotal_bytes{instance="$instance"})

# Disk Utilization
1 - (node_filesystem_avail_bytes{instance="$instance", mountpoint="/"} / node_filesystem_size_bytes{instance="$instance", mountpoint="/"})

# Disk I/O Saturation
rate(node_disk_io_time_weighted_seconds_total{instance="$instance"}[5m])

# Network Utilization
rate(node_network_receive_bytes_total{instance="$instance", device="eth0"}[5m])
rate(node_network_transmit_bytes_total{instance="$instance", device="eth0"}[5m])

# Network Errors
rate(node_network_receive_errs_total{instance="$instance"}[5m])
rate(node_network_transmit_errs_total{instance="$instance"}[5m])
```

## SLO Dashboard

```promql
# Availability SLO (target: 99.9%)
# Current availability (30 day window)
1 - (
  sum(increase(http_requests_total{service="$service", status_code=~"5.."}[30d]))
  /
  sum(increase(http_requests_total{service="$service"}[30d]))
)

# Error budget remaining
1 - (
  sum(increase(http_requests_total{service="$service", status_code=~"5.."}[30d]))
  /
  (sum(increase(http_requests_total{service="$service"}[30d])) * (1 - 0.999))
)

# Error budget consumption rate (should be < 1.0)
(
  sum(rate(http_requests_total{service="$service", status_code=~"5.."}[1h]))
  /
  sum(rate(http_requests_total{service="$service"}[1h]))
)
/
0.001  # 1 - SLO target (0.999)

# Latency SLO: % of requests under 500ms
sum(rate(http_request_duration_seconds_bucket{service="$service", le="0.5"}[5m]))
/
sum(rate(http_request_duration_seconds_count{service="$service"}[5m]))
```

## Dashboard Provisioning (GitOps)

```yaml
# grafana/provisioning/dashboards/default.yml
apiVersion: 1
providers:
  - name: "default"
    orgId: 1
    folder: "Services"
    type: file
    disableDeletion: false
    editable: true
    updateIntervalSeconds: 30
    options:
      path: /var/lib/grafana/dashboards
      foldersFromFilesStructure: true
```

```yaml
# docker-compose.yml
services:
  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH=/var/lib/grafana/dashboards/service-overview.json
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards
    ports:
      - "3000:3000"
```

## Grafana Dashboard Variables

```json
{
  "templating": {
    "list": [
      {
        "name": "datasource",
        "type": "datasource",
        "query": "prometheus"
      },
      {
        "name": "service",
        "type": "query",
        "datasource": "$datasource",
        "query": "label_values(http_requests_total, service)",
        "refresh": 2,
        "includeAll": true,
        "multi": true
      },
      {
        "name": "instance",
        "type": "query",
        "datasource": "$datasource",
        "query": "label_values(http_requests_total{service=~\"$service\"}, instance)",
        "refresh": 2,
        "includeAll": true
      },
      {
        "name": "interval",
        "type": "interval",
        "query": "1m,5m,15m,30m,1h",
        "auto": true,
        "auto_min": "1m"
      }
    ]
  }
}
```

## Database Dashboard Queries

```promql
# Query duration percentiles
histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket{service="$service"}[5m])) by (le, operation))

# Queries per second by operation
sum(rate(db_query_duration_seconds_count{service="$service"}[5m])) by (operation)

# Slow queries (p99 > 1s)
histogram_quantile(0.99, sum(rate(db_query_duration_seconds_bucket{service="$service"}[5m])) by (le, table)) > 1

# Connection pool utilization
db_connection_pool_size{service="$service", state="active"}
/
(db_connection_pool_size{service="$service", state="active"} + db_connection_pool_size{service="$service", state="idle"})

# Error rate by type
sum(rate(db_errors_total{service="$service"}[5m])) by (error_type)
```

## Dashboard Design Best Practices

| Practice | Details |
|----------|---------|
| **Row layout** | RED metrics top row, detailed panels below |
| **Consistent units** | Always label axes (req/s, ms, %, bytes) |
| **Thresholds** | Green/yellow/red for all gauges and stats |
| **Variables** | Service, instance, time interval as dropdowns |
| **Links** | Link to related dashboards, runbooks, logs |
| **Annotations** | Show deploys, incidents on time series |
| **Refresh** | 30s for overview, 10s for debugging |
| **Time range** | Default 1h for overview, 15m for debugging |

## Annotation Queries (Show Deploys)

```promql
# If you track deploys as a metric
ALERTS{alertname="DeployStarted", service="$service"}

# Or via Grafana API annotation
# POST /api/annotations
# {"text": "Deploy v1.2.3", "tags": ["deploy", "order-api"]}
```

## Complete Stack (Docker Compose)

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alerts:/etc/prometheus/alerts
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.retention.time=30d"
    ports:
      - "9090:9090"

  alertmanager:
    image: prom/alertmanager:latest
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
    ports:
      - "9093:9093"

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards
    ports:
      - "3000:3000"

  # Optional: Loki for logs
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"

  # Optional: Tempo for traces
  tempo:
    image: grafana/tempo:latest
    ports:
      - "4317:4317"
      - "3200:3200"
```
