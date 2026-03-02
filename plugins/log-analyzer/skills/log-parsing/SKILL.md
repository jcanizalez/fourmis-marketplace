---
description: When the user asks about parsing log files, extracting data from logs, regex patterns for log formats, parsing Apache or nginx or syslog or JSON logs, converting unstructured logs to structured format, or analyzing log file formats
---

# Log Parsing

Patterns and tools for parsing common log formats — from structured JSON to legacy text formats like Apache, nginx, and syslog.

## Common Log Formats

### JSON Logs (Modern)

Most common in modern applications. Parse with `jq`:

```bash
# Pretty-print JSON logs
cat app.log | jq '.'

# Filter by level
cat app.log | jq 'select(.level == "error")'

# Extract specific fields
cat app.log | jq '{timestamp, level, msg, error}'

# Filter by time range
cat app.log | jq 'select(.timestamp >= "2026-03-01T09:00:00" and .timestamp <= "2026-03-01T10:00:00")'

# Count errors by message
cat app.log | jq -r 'select(.level == "error") | .msg' | sort | uniq -c | sort -rn
```

### Apache Combined Log Format

```
127.0.0.1 - frank [10/Oct/2026:13:55:36 -0700] "GET /api/users HTTP/1.1" 200 2326 "https://example.com/" "Mozilla/5.0..."
```

**Fields**: IP, ident, user, timestamp, request, status, bytes, referer, user-agent

```bash
# Regex pattern
^(\S+) (\S+) (\S+) \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d{3}) (\d+|-) "([^"]*)" "([^"]*)"

# Parse with awk — top 10 IPs
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -10

# Status code distribution
awk '{print $9}' access.log | sort | uniq -c | sort -rn

# Requests per minute
awk '{print $4}' access.log | cut -d: -f1-3 | uniq -c

# Slow requests (> 1s) — if response time is the last field
awk '{if ($NF > 1000000) print $0}' access.log
```

### Nginx Log Format

Default format matches Apache combined. Custom log format:

```nginx
# nginx.conf
log_format json_combined escape=json
  '{'
    '"timestamp":"$time_iso8601",'
    '"remote_addr":"$remote_addr",'
    '"method":"$request_method",'
    '"uri":"$request_uri",'
    '"status":$status,'
    '"body_bytes_sent":$body_bytes_sent,'
    '"request_time":$request_time,'
    '"upstream_response_time":"$upstream_response_time",'
    '"http_referer":"$http_referer",'
    '"http_user_agent":"$http_user_agent"'
  '}';

access_log /var/log/nginx/access.log json_combined;
```

### Syslog (RFC 5424)

```
<134>1 2026-03-01T09:15:23.456Z myhost myapp 1234 ID47 - Application started
```

**Fields**: Priority, version, timestamp, hostname, app-name, procid, msgid, structured-data, message

```bash
# Regex pattern
^<(\d+)>(\d+) (\S+) (\S+) (\S+) (\S+) (\S+) (\S+) (.+)$

# Parse syslog priority to facility/severity
# Priority = Facility * 8 + Severity
# Facility 16 = local0, Severity 6 = info → Priority 134
```

### Docker Container Logs

```bash
# JSON log driver output
{"log":"2026-03-01T09:15:23Z INFO Application started\n","stream":"stdout","time":"2026-03-01T09:15:23.456Z"}

# Parse Docker JSON logs
docker logs my-container 2>&1 | jq -R 'fromjson? | {time: .time, log: .log}'

# Follow with timestamps
docker logs -f --timestamps my-container 2>&1

# Filter container logs by time
docker logs --since 2026-03-01T09:00:00 --until 2026-03-01T10:00:00 my-container
```

### Kubernetes Pod Logs

```bash
# Current pod logs
kubectl logs pod/my-app-abc123

# Previous container (after crash)
kubectl logs pod/my-app-abc123 --previous

# All pods matching label
kubectl logs -l app=my-app --all-containers

# With timestamps
kubectl logs pod/my-app-abc123 --timestamps

# Follow across all replicas
kubectl logs -f -l app=my-app --all-containers --max-log-requests=10

# Parse JSON logs from k8s
kubectl logs pod/my-app-abc123 | jq 'select(.level == "error")'
```

## Regex Patterns for Common Log Elements

### Timestamps

```regex
# ISO 8601
\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})

# Common log format date
\[\d{2}/\w{3}/\d{4}:\d{2}:\d{2}:\d{2} [+-]\d{4}\]

# Simple date-time
\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}

# Unix timestamp (seconds)
\b1\d{9}\b

# Unix timestamp (milliseconds)
\b1\d{12}\b
```

### IP Addresses

```regex
# IPv4
\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b

# IPv6 (simplified)
([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}

# Either
\b(?:\d{1,3}\.){3}\d{1,3}\b|(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}
```

### Error Messages

```regex
# Stack trace start (Node.js)
^\s+at\s+.+\(.+:\d+:\d+\)

# Stack trace start (Python)
^Traceback \(most recent call last\):

# Stack trace start (Go)
^goroutine \d+ \[.+\]:

# Stack trace start (Java)
^\s+at\s+[\w.]+\([\w.]+:\d+\)

# Generic error patterns
(?i)(error|exception|fatal|panic|fail(ed|ure)?|crash|abort)
```

### UUIDs and Request IDs

```regex
# UUID v4
[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}

# Generic hex ID (32 chars)
\b[0-9a-f]{32}\b

# Request ID header
[Xx]-[Rr]equest-[Ii][Dd]:\s*(\S+)
```

## Multi-Line Log Parsing

Stack traces and multi-line log entries require special handling:

### Strategy: Start Pattern

```bash
# Combine multi-line logs into single lines (stack traces)
# Pattern: new log entry starts with timestamp or level
awk '/^\d{4}-\d{2}-\d{2}|^\{/ { if (NR>1) print line; line=$0; next } { line=line " " $0 } END { print line }' app.log
```

### Strategy: jq for JSON with Embedded Newlines

```bash
# Handle JSON logs where values contain \n
cat app.log | jq -R 'fromjson? // empty'

# Handle NDJSON (newline-delimited JSON)
cat app.log | jq -c 'select(.level == "error")'
```

## Converting Unstructured to Structured

### Node.js Script

```typescript
// parse-legacy-logs.ts
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

const APACHE_REGEX =
  /^(\S+) \S+ (\S+) \[([^\]]+)\] "(\S+) (\S+) \S+" (\d{3}) (\d+|-)/;

async function parseLegacyLogs(filePath: string) {
  const rl = createInterface({ input: createReadStream(filePath) });

  for await (const line of rl) {
    const match = line.match(APACHE_REGEX);
    if (match) {
      console.log(JSON.stringify({
        timestamp: parseApacheDate(match[3]),
        ip: match[1],
        user: match[2] === "-" ? null : match[2],
        method: match[4],
        path: match[5],
        status: parseInt(match[6]),
        bytes: match[7] === "-" ? 0 : parseInt(match[7]),
      }));
    }
  }
}
```

## Quick Reference: One-Liners

```bash
# Count log lines per level (JSON logs)
jq -r '.level' app.log | sort | uniq -c | sort -rn

# Top 10 error messages
jq -r 'select(.level=="error") | .msg' app.log | sort | uniq -c | sort -rn | head

# Average response time
jq -r 'select(.duration_ms) | .duration_ms' app.log | awk '{sum+=$1; n++} END {print sum/n "ms"}'

# Error rate per minute
jq -r 'select(.level=="error") | .timestamp[:16]' app.log | sort | uniq -c

# Find all unique error types
jq -r 'select(.level=="error") | .error // .msg' app.log | sort -u

# Tail JSON logs pretty
tail -f app.log | jq '.'

# Tail with filter
tail -f app.log | jq 'select(.level != "debug")'
```
