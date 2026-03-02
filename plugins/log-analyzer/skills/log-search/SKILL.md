---
description: When the user asks about searching logs, grep patterns for log files, jq commands for JSON logs, filtering logs by time or level or request ID, finding specific errors in log files, or log query techniques
---

# Log Search

Advanced patterns for searching and filtering log files using grep, jq, awk, and other CLI tools. Master these to find needles in log haystacks.

## jq — JSON Log Swiss Army Knife

### Basic Filtering

```bash
# Filter by log level
jq 'select(.level == "error")' app.log

# Filter by multiple levels
jq 'select(.level == "error" or .level == "fatal")' app.log

# Filter by message content
jq 'select(.msg | test("payment"; "i"))' app.log

# Filter by status code range
jq 'select(.status >= 500)' app.log

# Filter by user ID
jq 'select(.user_id == 12345)' app.log

# Exclude debug logs
jq 'select(.level != "debug")' app.log
```

### Time-Based Filtering

```bash
# Logs after a specific time
jq 'select(.timestamp >= "2026-03-01T09:00:00")' app.log

# Logs in a time window
jq 'select(.timestamp >= "2026-03-01T09:00:00" and .timestamp < "2026-03-01T10:00:00")' app.log

# Last N minutes (requires GNU date)
jq --arg since "$(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%S)" \
  'select(.timestamp >= $since)' app.log

# macOS equivalent
jq --arg since "$(date -u -v-30M +%Y-%m-%dT%H:%M:%S)" \
  'select(.timestamp >= $since)' app.log
```

### Field Extraction and Transformation

```bash
# Extract specific fields
jq '{timestamp, level, msg, error}' app.log

# Create a summary line
jq -r '"\(.timestamp) [\(.level)] \(.msg)"' app.log

# Flatten nested objects
jq '{timestamp, level, msg, user_id: .user.id, error: .error.message}' app.log

# Count by field value
jq -r '.level' app.log | sort | uniq -c | sort -rn

# Top error messages
jq -r 'select(.level=="error") | .msg' app.log | sort | uniq -c | sort -rn | head -20
```

### Aggregation and Statistics

```bash
# Count total logs
jq -s 'length' app.log

# Count by level
jq -s 'group_by(.level) | map({level: .[0].level, count: length})' app.log

# Average response time
jq -s '[.[].duration_ms | select(. != null)] | add / length' app.log

# P50, P95, P99 response times
jq -s '[.[].duration_ms | select(. != null)] | sort |
  {p50: .[length * 0.5 | floor], p95: .[length * 0.95 | floor], p99: .[length * 0.99 | floor]}' app.log

# Errors per hour
jq -r 'select(.level=="error") | .timestamp[:13]' app.log | sort | uniq -c

# Top 10 slowest requests
jq -s 'map(select(.duration_ms)) | sort_by(-.duration_ms) | .[:10] | .[] | {path, duration_ms, timestamp}' app.log
```

### NDJSON (Newline-Delimited JSON)

Most structured log files are NDJSON — one JSON object per line:

```bash
# Process NDJSON (the -R flag reads raw lines)
cat app.log | jq -R 'fromjson?' | jq 'select(.level == "error")'

# Compact output (one line per result)
jq -c 'select(.level == "error")' app.log

# Pretty print for reading
jq '.' app.log | less
```

## grep — Text Log Search

### Basic Patterns

```bash
# Case-insensitive search
grep -i "error" app.log

# Search with context (3 lines before and after)
grep -C 3 "NullPointerException" app.log

# Search multiple patterns (OR)
grep -E "error|fatal|panic" app.log

# Search with AND (both must appear on same line)
grep "error" app.log | grep "payment"

# Invert match (exclude pattern)
grep -v "health\|ready\|alive" app.log

# Count matches
grep -c "ERROR" app.log

# Show only matching part
grep -o "request_id=[^ ]*" app.log

# Search recursively in directory
grep -r "TODO\|FIXME\|HACK" /var/log/

# Search with line numbers
grep -n "error" app.log
```

### Time-Range Filtering (Text Logs)

```bash
# Lines between two timestamps (works for sorted log files)
sed -n '/2026-03-01 09:00:00/,/2026-03-01 10:00:00/p' app.log

# Using awk for more precise time filtering
awk '/^2026-03-01T09:/ || /^2026-03-01T09:/ {print}' app.log

# Last 1000 lines only
tail -1000 app.log | grep "error"
```

### Regular Expressions

```bash
# Match IP addresses
grep -oE '\b[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\b' app.log

# Match UUIDs
grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' app.log

# Match HTTP status codes
grep -oE 'HTTP/[0-9.]+" [0-9]{3}' access.log

# Match email addresses
grep -oE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' app.log

# Match durations > 1 second (4+ digit ms values)
grep -E '"duration_ms":[0-9]{4,}' app.log
```

## awk — Advanced Log Processing

```bash
# Print specific columns (space-delimited)
awk '{print $1, $4, $9}' access.log

# Filter by column value
awk '$9 >= 500' access.log

# Sum a column
awk '{sum += $10} END {print "Total bytes:", sum}' access.log

# Requests per IP
awk '{ips[$1]++} END {for (ip in ips) print ips[ip], ip}' access.log | sort -rn | head

# Average response time (last column)
awk '{sum += $NF; n++} END {print "Avg:", sum/n, "ms"}' access.log

# Group by hour
awk -F'[: ]' '{hours[$5]++} END {for (h in hours) print h":00", hours[h]}' access.log | sort

# Custom field separator
awk -F'"' '{print $2}' access.log  # Extract request line
```

## Combining Tools

### Real-World Search Patterns

```bash
# Find all errors for a specific user in the last hour (JSON logs)
jq --arg since "$(date -u -v-1H +%Y-%m-%dT%H:%M:%S)" \
  'select(.timestamp >= $since and .user_id == 12345 and .level == "error")' app.log

# Find the request that caused a specific error
REQUEST_ID=$(grep "payment failed" app.log | jq -r '.request_id' | head -1)
jq --arg rid "$REQUEST_ID" 'select(.request_id == $rid)' app.log

# Timeline of a specific request across log files
grep -h "abc-123" /var/log/service-*.log | jq -s 'sort_by(.timestamp)'

# Find error patterns that started after a deploy
DEPLOY_TIME="2026-03-01T14:30:00"
jq --arg t "$DEPLOY_TIME" 'select(.timestamp >= $t and .level == "error") | .msg' app.log \
  | sort | uniq -c | sort -rn

# Correlation: find errors that happen within 1 second of each other
jq -r 'select(.level == "error") | .timestamp' app.log | \
  awk -F'T' '{print $1"T"substr($2,1,8)}' | sort | uniq -c | sort -rn
```

### Live Monitoring Patterns

```bash
# Watch for errors in real-time (JSON)
tail -f app.log | jq --unbuffered 'select(.level == "error")'

# Watch with color coding
tail -f app.log | jq --unbuffered -r '
  if .level == "error" then "\u001b[31m[\(.level)] \(.msg)\u001b[0m"
  elif .level == "warn" then "\u001b[33m[\(.level)] \(.msg)\u001b[0m"
  else "[\(.level)] \(.msg)"
  end'

# Watch specific path
tail -f app.log | jq --unbuffered 'select(.path == "/api/payments")'

# Watch slow requests
tail -f app.log | jq --unbuffered 'select(.duration_ms > 1000) | {path, duration_ms, timestamp}'
```

## Log Search Cheat Sheet

| Task | Command |
|------|---------|
| Find all errors | `jq 'select(.level=="error")' app.log` |
| Errors in last hour | `jq --arg t "$(date -u -v-1H +%Y-%m-%dT%H:%M)" 'select(.timestamp>=$t and .level=="error")' app.log` |
| Count by level | `jq -r '.level' app.log \| sort \| uniq -c \| sort -rn` |
| Top error messages | `jq -r 'select(.level=="error") \| .msg' app.log \| sort \| uniq -c \| sort -rn \| head` |
| Find by request ID | `jq 'select(.request_id=="abc-123")' app.log` |
| Slow requests (>1s) | `jq 'select(.duration_ms > 1000)' app.log` |
| Error rate per minute | `jq -r 'select(.level=="error") \| .timestamp[:16]' app.log \| sort \| uniq -c` |
| Average response time | `jq -s '[.[].duration_ms // empty] \| add/length' app.log` |
| Tail with filter | `tail -f app.log \| jq --unbuffered 'select(.level!="debug")'` |
| Search across files | `cat /var/log/app*.log \| jq 'select(.level=="error")'` |
