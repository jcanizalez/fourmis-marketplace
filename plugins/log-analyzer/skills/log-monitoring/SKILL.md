---
description: When the user asks about log monitoring, setting up log alerts, log aggregation, centralized logging, log-based alerting, choosing a logging stack, or shipping logs to a monitoring platform
---

# Log Monitoring

Patterns for setting up log monitoring, alerting, and aggregation — from simple file watching to full observability platforms.

## Monitoring Tiers

### Tier 1: Local Monitoring (Free, No Infrastructure)

Good for development and single-server applications.

```bash
# Watch for errors in real-time
tail -f /var/log/app.log | grep --line-buffered -i "error\|fatal\|panic"

# Watch JSON logs for errors
tail -f app.log | jq -r 'select(.level == "error" or .level == "fatal") | "\(.timestamp) \(.msg)"'

# Count errors per minute
while true; do
  count=$(grep -c "ERROR" /var/log/app.log)
  echo "$(date +%H:%M) errors: $count"
  sleep 60
done

# Simple log rotation check
find /var/log -name "*.log" -size +100M -exec ls -lh {} \;
```

### Tier 2: Script-Based Alerting

For small teams that need alerts without full infrastructure.

```bash
#!/bin/bash
# alert-on-errors.sh — run via cron every 5 minutes
LOG_FILE="/var/log/app.log"
THRESHOLD=10
WEBHOOK_URL="https://hooks.slack.com/services/xxx"

# Count errors in last 5 minutes
ERRORS=$(awk -v date="$(date -d '5 minutes ago' '+%Y-%m-%dT%H:%M')" \
  '$0 ~ /"level":"error"/ && $0 > date' "$LOG_FILE" | wc -l)

if [ "$ERRORS" -gt "$THRESHOLD" ]; then
  curl -s -X POST "$WEBHOOK_URL" \
    -H 'Content-type: application/json' \
    -d "{\"text\":\"⚠️ High error rate: $ERRORS errors in last 5 minutes\"}"
fi
```

```cron
# Crontab: run every 5 minutes
*/5 * * * * /opt/scripts/alert-on-errors.sh
```

### Tier 3: Centralized Logging Stack

For production applications. Choose based on scale and budget.

## Logging Stacks Comparison

| Stack | Best For | Cost | Complexity |
|-------|----------|------|------------|
| **Grafana + Loki** | Cost-effective, k8s-native | Free (self-hosted) | Medium |
| **ELK (Elasticsearch + Logstash + Kibana)** | Full-text search, complex queries | Free (self-hosted) / $$ (Cloud) | High |
| **Datadog** | All-in-one observability | $$$ | Low |
| **CloudWatch** | AWS-native applications | $$ | Low |
| **Betterstack (Logtail)** | Simple, developer-friendly | $ | Low |
| **Vector + ClickHouse** | High-volume, cost-efficient | Free (self-hosted) | Medium |

## Grafana + Loki Setup (Recommended)

### Docker Compose

```yaml
# docker-compose.monitoring.yml
services:
  loki:
    image: grafana/loki:3.3.0
    ports:
      - "3100:3100"
    volumes:
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml

  promtail:
    image: grafana/promtail:3.3.0
    volumes:
      - /var/log:/var/log:ro
      - ./promtail-config.yml:/etc/promtail/config.yml:ro
    command: -config.file=/etc/promtail/config.yml

  grafana:
    image: grafana/grafana:11.5.0
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  loki-data:
  grafana-data:
```

### Promtail Configuration

```yaml
# promtail-config.yml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: app-logs
    static_configs:
      - targets: [localhost]
        labels:
          job: my-app
          __path__: /var/log/app/*.log

    pipeline_stages:
      # Parse JSON logs
      - json:
          expressions:
            level: level
            msg: msg
            timestamp: timestamp
      - labels:
          level:
      - timestamp:
          source: timestamp
          format: RFC3339
```

### Sending Logs Directly (Node.js)

```typescript
// For apps that push to Loki directly (no Promtail)
import pino from "pino";

const transport = pino.transport({
  targets: [
    // Console output
    { target: "pino-pretty", level: "debug" },
    // Loki output
    {
      target: "pino-loki",
      level: "info",
      options: {
        host: process.env.LOKI_URL || "http://localhost:3100",
        labels: { app: "my-api", env: process.env.NODE_ENV },
        batching: true,
        interval: 5,
      },
    },
  ],
});

const logger = pino(transport);
```

## Alert Rules

### Key Alerts to Set Up

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| **Error spike** | Error rate > 5x baseline in 5 min | Critical | Page on-call |
| **5xx spike** | HTTP 5xx > 1% of traffic | Critical | Page on-call |
| **Zero traffic** | No requests for 5 min | Warning | Check if service is down |
| **Slow responses** | p95 latency > 2x baseline | Warning | Investigate |
| **OOM warning** | "out of memory" in logs | Critical | Restart + investigate |
| **Auth failures** | > 50 failed logins in 5 min | Warning | Check for brute force |
| **Disk space** | Log volume > 80% capacity | Warning | Rotate logs, add storage |

### Grafana Alert Example (LogQL)

```
# Error rate alert — fires when > 10 errors/minute
sum(rate({app="my-api"} |= "error" [1m])) > 10

# 5xx rate alert
sum(rate({app="my-api"} | json | status >= 500 [5m]))
  / sum(rate({app="my-api"} | json [5m])) > 0.01

# Latency alert — p95 > 2 seconds
quantile_over_time(0.95, {app="my-api"} | json | unwrap duration_ms [5m]) > 2000
```

## Log Retention Policy

| Environment | Retention | Format | Storage |
|-------------|-----------|--------|---------|
| Development | 1 day | Pretty-printed | Local disk |
| Staging | 7 days | JSON | Local or cloud |
| Production | 30-90 days | JSON, compressed | Cloud storage |
| Compliance | 1-7 years | Compressed, archived | Cold storage (S3 Glacier) |

### Log Rotation (logrotate)

```
# /etc/logrotate.d/my-app
/var/log/my-app/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 app app
    postrotate
        /usr/bin/systemctl reload my-app > /dev/null 2>&1 || true
    endscript
}
```

## Health Check Logging

Don't let health checks pollute your logs:

```typescript
// Express — skip health check logging
app.use((req, res, next) => {
  if (req.path === "/health" || req.path === "/ready") {
    // Skip request logging for health checks
    return next();
  }
  requestLogger(req, res, next);
});
```

```nginx
# Nginx — separate health check logs
location /health {
    access_log off;
    return 200 '{"status":"ok"}';
    add_header Content-Type application/json;
}
```

## Log Correlation

Link logs across services using trace/request IDs:

```
Service A log: {"request_id":"abc-123","msg":"forwarding to service B",...}
Service B log: {"request_id":"abc-123","msg":"received from service A",...}
```

### Propagation Pattern

```typescript
// Middleware: extract or generate request ID
const requestId = req.headers["x-request-id"] || randomUUID();

// Pass to downstream services
const response = await fetch("http://service-b/api", {
  headers: { "x-request-id": requestId },
});

// Log with the same ID
logger.info({ request_id: requestId }, "called service B");
```
