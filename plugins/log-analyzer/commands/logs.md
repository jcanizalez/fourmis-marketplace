---
name: logs
description: Analyze log output — parse, filter, summarize, and find patterns in application logs
---

# /logs — Log Analysis

Analyze log output to find errors, patterns, and insights.

## Usage

```
/logs <file>                    # Analyze a log file
/logs <file> errors             # Show only errors and fatals
/logs <file> summary            # Summarize log levels, error rate, top messages
/logs <file> slow               # Find slow requests (high duration_ms)
/logs <file> --since "1h"       # Logs from the last hour
/logs <file> --user <id>        # Filter by user ID
/logs <file> --request <id>     # Trace a specific request across log lines
/logs paste                     # Analyze log output pasted into chat
```

## Examples

```
/logs /var/log/app.log errors
/logs app.log summary
/logs app.log slow
/logs app.log --request abc-123
/logs paste
```

## Process

1. **File argument**: Read the log file, detect format (JSON, text, Apache, nginx)
2. **errors**: Filter to `level == "error"` or `"fatal"`, group by message, show counts
3. **summary**: Count by level, calculate error rate, list top 10 error messages, show time range
4. **slow**: Find entries with `duration_ms > 1000` (or top 10 slowest), show path and duration
5. **--since**: Filter to entries within the time range
6. **--user / --request**: Filter by user_id or request_id, show the full trace
7. **paste**: Ask the user to paste log output, then analyze inline

## Output Format

### Summary View
```
## Log Analysis: [filename]

**Time range**: [start] → [end] ([duration])
**Total entries**: [N]
**By level**: info: [N], warn: [N], error: [N], fatal: [N]
**Error rate**: [X]%

### Top Errors
1. [message] — [N] occurrences
2. [message] — [N] occurrences

### Slow Requests (>1s)
| Path | Duration | Time |
|------|----------|------|
| ... | ...ms | ... |
```

## Notes

- Auto-detects JSON (NDJSON) vs text log formats
- For real-time monitoring, use `tail -f app.log | jq` (see log-search skill)
- Combine with `/diagnose` to investigate specific errors
