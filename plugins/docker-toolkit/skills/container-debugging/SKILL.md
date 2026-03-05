---
description: When the user asks about debugging Docker containers, troubleshooting container issues, docker exec or docker logs, container networking problems, why a container is crashing, common Docker errors, exit code 137 OOM, exec format error, permission denied in container, container keeps restarting, docker inspect, docker stats, docker events, "address already in use", or how to diagnose container problems
---

# Container Debugging

Systematic approaches to debugging Docker containers — from basic log inspection to advanced networking and resource troubleshooting.

## Debugging Framework

```
1. Check container status (is it running? did it crash?)
2. Read the logs (what error message?)
3. Inspect the container (config, network, mounts)
4. Exec into the container (explore the filesystem)
5. Check networking (can it reach other services?)
6. Check resources (memory, CPU, disk)
```

## Step 1: Container Status

```bash
# List all containers (including stopped)
docker ps -a

# Check why a container exited
docker inspect --format='{{.State.ExitCode}} {{.State.Error}}' <container>

# Check restart count
docker inspect --format='{{.RestartCount}}' <container>

# Check container events (starts, stops, OOMs)
docker events --filter container=<container> --since 1h
```

### Exit Codes

| Code | Meaning | Common Cause |
|------|---------|------------|
| 0 | Success | Normal exit |
| 1 | General error | Application error, unhandled exception |
| 126 | Permission denied | CMD not executable |
| 127 | Command not found | Wrong CMD path, missing binary |
| 137 | SIGKILL (OOM) | Out of memory — container killed by kernel |
| 139 | SIGSEGV | Segmentation fault — native code crash |
| 143 | SIGTERM | Graceful shutdown (docker stop) |

## Step 2: Logs

```bash
# All logs
docker logs <container>

# Follow logs in real-time
docker logs -f <container>

# Last 100 lines
docker logs --tail 100 <container>

# Logs since a timestamp
docker logs --since 2026-03-01T10:00:00 <container>

# Logs from last 30 minutes
docker logs --since 30m <container>

# Both stdout and stderr
docker logs <container> 2>&1

# Compose: specific service logs
docker compose logs -f api
docker compose logs --tail 50 api db
```

## Step 3: Inspect

```bash
# Full container details
docker inspect <container>

# Specific fields
docker inspect --format='{{.Config.Env}}' <container>
docker inspect --format='{{.NetworkSettings.IPAddress}}' <container>
docker inspect --format='{{json .Mounts}}' <container> | jq
docker inspect --format='{{.Config.Cmd}}' <container>
docker inspect --format='{{.HostConfig.Memory}}' <container>

# Image layers and history
docker history <image>
docker image inspect <image>
```

## Step 4: Exec Into Container

```bash
# Shell into running container
docker exec -it <container> sh
docker exec -it <container> bash  # If bash is available
docker exec -it <container> /bin/ash  # Alpine

# Run a specific command
docker exec <container> cat /etc/hosts
docker exec <container> env  # See environment variables
docker exec <container> ls -la /app

# As root (even if USER is set)
docker exec -u root -it <container> sh

# Compose
docker compose exec api sh
```

### For Distroless / Scratch Containers

These don't have a shell. Use a debug container:

```bash
# Docker debug (Docker Desktop)
docker debug <container>

# Kubectl debug (Kubernetes)
kubectl debug -it <pod> --image=busybox --target=<container>

# Or use a sidecar container with shared PID namespace
docker run -it --pid=container:<container> --net=container:<container> \
  busybox sh
```

## Step 5: Networking

```bash
# Check container's network
docker inspect --format='{{json .NetworkSettings.Networks}}' <container> | jq

# List networks
docker network ls

# Inspect a network (see connected containers)
docker network inspect <network>

# Test connectivity between containers
docker exec api ping db
docker exec api nslookup db
docker exec api wget -qO- http://db:5432  # Test TCP connectivity

# Check port mappings
docker port <container>

# Check if port is listening inside container
docker exec <container> netstat -tlnp 2>/dev/null || \
docker exec <container> ss -tlnp

# DNS resolution inside container
docker exec <container> cat /etc/resolv.conf
docker exec <container> nslookup <service_name>
```

### Common Networking Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Connection refused" | Service not listening on 0.0.0.0 | Bind to `0.0.0.0`, not `127.0.0.1` or `localhost` |
| "Name resolution failed" | Not on same Docker network | Put services on the same network |
| Can't reach from host | Port not published | Add `ports:` mapping |
| Intermittent timeouts | DNS cache issue | Restart Docker daemon |
| "Address already in use" | Port conflict on host | Change host port mapping |

**Critical rule**: Inside a container, services must listen on `0.0.0.0`, not `localhost`:

```bash
# ❌ Only accessible inside the container
node server.js --host localhost

# ✅ Accessible from other containers and host
node server.js --host 0.0.0.0
```

## Step 6: Resources

```bash
# Live resource usage
docker stats
docker stats <container>

# Memory limit vs usage
docker inspect --format='{{.HostConfig.Memory}}' <container>

# Check for OOM kills
docker inspect --format='{{.State.OOMKilled}}' <container>
dmesg | grep -i "out of memory"  # Host-level OOM

# Disk usage
docker system df
docker system df -v  # Detailed

# Container filesystem usage
docker exec <container> df -h
docker exec <container> du -sh /app/*
```

### Memory Issues

```bash
# Set memory limit
docker run -m 512m my-app

# Compose
services:
  api:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1.0"
        reservations:
          memory: 256M
          cpus: "0.5"
```

## Common Error Diagnosis

### "exec format error"

```
exec /app/server: exec format error
```
**Cause**: Binary built for wrong architecture (e.g., built on ARM Mac, running on x86 server).
**Fix**: Build for the target platform:
```bash
docker build --platform linux/amd64 -t my-app .
# Or in Go: GOARCH=amd64 GOOS=linux go build
```

### "no such file or directory" (for CMD)

```
/bin/sh: /app/server: not found
```
**Cause**: Binary requires dynamic libraries not in the image (common with Alpine/scratch).
**Fix**: Build static binary (`CGO_ENABLED=0` for Go) or use `slim` instead of `alpine`.

### "permission denied"

```
Error: EACCES: permission denied, open '/app/data/file.json'
```
**Cause**: Running as non-root user but files owned by root.
**Fix**:
```dockerfile
RUN chown -R node:node /app/data
USER node
```

### Container keeps restarting

```bash
# Check exit code
docker inspect --format='{{.State.ExitCode}}' <container>

# Check restart policy
docker inspect --format='{{.HostConfig.RestartPolicy}}' <container>

# View recent logs
docker logs --tail 50 <container>
```

### "bind: address already in use"

```bash
# Find what's using the port on the host
lsof -i :3000
# Or
ss -tlnp | grep 3000

# Kill the process or change the port mapping
docker compose down  # Then change ports in compose file
```

## Debug Checklist

When a container isn't working:

1. [ ] `docker ps -a` — is it running? What's the exit code?
2. [ ] `docker logs <container>` — what's the error message?
3. [ ] Is the app binding to `0.0.0.0` (not `localhost`)?
4. [ ] Are all env vars set? (`docker exec <container> env`)
5. [ ] Can the container reach its dependencies? (`docker exec api ping db`)
6. [ ] Is there enough memory? (`docker stats`)
7. [ ] Was the image built for the right platform? (`docker inspect --format='{{.Architecture}}'`)
8. [ ] Are file permissions correct? (`docker exec <container> ls -la /app`)
9. [ ] Is `.dockerignore` excluding needed files?
10. [ ] Are volumes mounted correctly? (`docker inspect --format='{{json .Mounts}}'`)
