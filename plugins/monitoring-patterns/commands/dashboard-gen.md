---
name: dashboard-gen
description: Generate a Grafana dashboard JSON for a service
arguments:
  - name: type
    description: "Dashboard type: red (default), use, slo, database, or full"
    required: false
  - name: service
    description: "Service name for the dashboard (used in metric queries)"
    required: true
---

# Dashboard Generator

Generate a production-ready Grafana dashboard JSON for the specified service.

## Steps

1. **Determine dashboard type** (default: `red`):
   - `red` — Request Rate, Errors, Duration (service overview)
   - `use` — Utilization, Saturation, Errors (infrastructure)
   - `slo` — SLO tracking with error budget
   - `database` — Query performance, connection pool, errors
   - `full` — All of the above in one dashboard with row grouping

2. **Generate dashboard JSON** with:
   - Template variables: `$service`, `$instance`, `$interval`, `$datasource`
   - Proper panel layout (8-unit grid, consistent heights)
   - Time series panels with appropriate units (req/s, seconds, percent, bytes)
   - Stat panels for current values (active requests, error rate, uptime)
   - Color thresholds (green/yellow/red) on all gauges
   - Auto-refresh: 30s

3. **Panel specifications by type**:

   **RED dashboard panels:**
   - Request Rate (time series, req/s, by method)
   - Error Rate % (time series, with 1% and 5% threshold lines)
   - Latency Percentiles (time series, p50/p95/p99 in seconds)
   - Active Requests (stat)
   - Status Code Distribution (pie chart)
   - Top Routes by Rate (bar gauge, top 10)
   - Request Duration Heatmap (heatmap)

   **USE dashboard panels:**
   - CPU Utilization % (time series, with 85% threshold)
   - Memory Utilization % (time series, with 90% threshold)
   - Disk Usage % (time series, with 85% threshold)
   - Network I/O (time series, bytes/sec in/out)
   - Load Average (time series)
   - Disk I/O (time series, reads/writes per second)

   **SLO dashboard panels:**
   - Current Availability (stat, large, 99.9% target line)
   - Error Budget Remaining (gauge, 0-100%)
   - Error Budget Burn Rate (time series, with 1x line)
   - Availability Over 30 Days (time series)
   - Latency SLO (% requests under target)

   **Database dashboard panels:**
   - Query Duration p95 by Operation (time series)
   - Queries per Second (time series, by operation)
   - Connection Pool (time series, active/idle/waiting)
   - Database Errors (time series, by error_type)
   - Slow Queries (table, p99 > 1s)

4. **Output the dashboard JSON** ready to import into Grafana via:
   - File: save to `grafana/dashboards/{service}-{type}.json`
   - API: `curl -X POST http://grafana:3000/api/dashboards/db -H "Content-Type: application/json" -d @dashboard.json`

5. **Provide provisioning config** if using GitOps:
   ```yaml
   # grafana/provisioning/dashboards/default.yml
   apiVersion: 1
   providers:
     - name: "default"
       folder: "Services"
       type: file
       options:
         path: /var/lib/grafana/dashboards
   ```
