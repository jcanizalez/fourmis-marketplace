---
name: docker-debug
description: Debug a Docker container — check status, logs, networking, and resources to diagnose issues
arguments:
  - name: container
    description: Container name or ID to debug (or service name if using Compose)
    required: true
---

# Docker Debug

Debug the container `$ARGUMENTS` by running through a systematic diagnosis. Execute each step using bash commands and report findings.

## Debugging Steps

### Step 1: Container Status

Run these commands and report the results:
```bash
docker ps -a --filter name=$ARGUMENTS --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker inspect --format='Exit: {{.State.ExitCode}} | OOM: {{.State.OOMKilled}} | Restarts: {{.RestartCount}} | Status: {{.State.Status}}' $ARGUMENTS
```

If the container isn't found by name, try:
```bash
docker compose ps
```

### Step 2: Logs

Get the most recent logs:
```bash
docker logs --tail 100 $ARGUMENTS
```

Look for error messages, stack traces, connection failures, or permission errors.

### Step 3: Configuration

Check environment variables and mounts:
```bash
docker inspect --format='{{json .Config.Env}}' $ARGUMENTS
docker inspect --format='{{json .Mounts}}' $ARGUMENTS
docker inspect --format='{{.Config.User}}' $ARGUMENTS
```

### Step 4: Networking

Check network connectivity:
```bash
docker inspect --format='{{json .NetworkSettings.Networks}}' $ARGUMENTS
docker port $ARGUMENTS
```

If the container is running, test internal connectivity:
```bash
docker exec $ARGUMENTS cat /etc/hosts 2>/dev/null
docker exec $ARGUMENTS cat /etc/resolv.conf 2>/dev/null
```

### Step 5: Resources

Check resource usage:
```bash
docker stats --no-stream $ARGUMENTS
docker inspect --format='Memory Limit: {{.HostConfig.Memory}} | CPU: {{.HostConfig.NanoCpus}}' $ARGUMENTS
```

### Step 6: Diagnosis

Based on the gathered information, provide:

1. **Status**: Is the container running, exited, or restarting?
2. **Root Cause**: What's the most likely issue based on exit code, logs, and config?
3. **Fix**: Specific commands or config changes to resolve the issue
4. **Prevention**: How to prevent this issue in the future

## Common Exit Code Reference

| Code | Meaning | Likely Fix |
|------|---------|------------|
| 0 | Normal exit | Check if CMD is correct (might be exiting immediately) |
| 1 | Application error | Check logs for stack trace |
| 126 | Permission denied | Make CMD executable: `chmod +x` |
| 127 | Command not found | Check CMD path, verify binary exists in image |
| 137 | OOM killed | Increase memory limit or fix memory leak |
| 139 | Segfault | Check native dependencies, architecture mismatch |
| 143 | SIGTERM | Normal `docker stop` — check if unexpected |

Format the output as a clear diagnostic report with the issue, evidence, and recommended fix.
