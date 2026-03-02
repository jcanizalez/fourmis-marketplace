---
description: When the user asks about Docker networking, container-to-container communication, Docker bridge or overlay networks, port mapping, Docker DNS and service discovery, or troubleshooting Docker network issues
---

# Docker Networking

How containers communicate — bridge networks, port mapping, DNS-based service discovery, and troubleshooting.

## Network Drivers

| Driver | Scope | Use Case |
|--------|-------|----------|
| **bridge** | Single host | Default. Containers on same host talk via DNS |
| **host** | Single host | Container shares host's network stack (no isolation) |
| **overlay** | Multi-host | Docker Swarm / Kubernetes cross-node networking |
| **none** | Isolated | No networking. Complete isolation |
| **macvlan** | Single host | Container gets its own MAC address on physical network |

## Bridge Networks (Most Common)

### Default Bridge vs Custom Bridge

```bash
# Default bridge (don't use — no DNS)
docker run --name api my-api
docker run --name db postgres
# api CANNOT reach db by name on the default bridge

# Custom bridge (recommended — has DNS)
docker network create my-net
docker run --name api --network my-net my-api
docker run --name db --network my-net postgres
# api CAN reach db as "db" via DNS
```

**Always use custom bridge networks.** Default bridge doesn't have DNS-based service discovery.

### Docker Compose (Automatic)

Docker Compose creates a network per project automatically:

```yaml
# docker-compose.yml
services:
  api:
    build: .
    # Can reach db as "db" and redis as "redis"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/myapp
      REDIS_URL: redis://redis:6379

  db:
    image: postgres:17

  redis:
    image: redis:7-alpine
```

All services in a `docker-compose.yml` are on the same network by default. The **service name IS the hostname**.

## Port Mapping

```yaml
services:
  api:
    ports:
      # HOST:CONTAINER
      - "3000:3000"       # Accessible on host at localhost:3000
      - "8080:3000"       # Host port 8080 → container port 3000
      - "127.0.0.1:3000:3000"  # Only localhost (not network-accessible)
      - "3000"            # Random host port → container 3000
```

```bash
# See port mappings
docker port <container>

# Expose in docker run
docker run -p 3000:3000 my-api
docker run -p 127.0.0.1:3000:3000 my-api  # Localhost only
```

### Port Mapping Rules

| Scenario | Mapping | Notes |
|----------|---------|-------|
| Dev access from host | `"3000:3000"` | Accessible at localhost:3000 |
| Multiple instances | `"3001:3000"` | Different host ports |
| Security (localhost only) | `"127.0.0.1:3000:3000"` | Not accessible from LAN |
| Container-to-container | No mapping needed | Use service name + internal port |
| Random host port | `"3000"` | Docker picks a free port |

**Key rule**: Containers on the same network communicate using the **internal port**, not the host mapping:
```
api → db:5432    ✅ (internal port, via Docker DNS)
api → db:15432   ❌ (host mapping, not reachable inside network)
```

## DNS and Service Discovery

### How Container DNS Works

```
Container "api" tries to reach "db"
  → Docker embedded DNS (127.0.0.11)
  → Resolves "db" to container's IP (172.18.0.3)
  → api connects to 172.18.0.3:5432
```

```bash
# Check DNS resolution inside a container
docker exec api nslookup db
docker exec api getent hosts db
docker exec api cat /etc/resolv.conf

# Verify connectivity
docker exec api ping db
docker exec api wget -qO- http://db:5432 || echo "port not HTTP but TCP works"
```

### Service Aliases

```yaml
services:
  database:
    image: postgres:17
    networks:
      default:
        aliases:
          - db
          - postgres
    # Reachable as "database", "db", or "postgres"
```

## Custom Networks

### Multiple Networks (Isolation)

```yaml
services:
  api:
    networks:
      - frontend
      - backend

  web:
    networks:
      - frontend
    # Can reach api, cannot reach db

  db:
    networks:
      - backend
    # Can reach api, cannot reach web

networks:
  frontend:
  backend:
```

### External Networks

```yaml
# Share a network across multiple Compose projects
networks:
  shared:
    external: true  # Must be created manually first

# Create it:
# docker network create shared
```

## Host Networking

```bash
# Container shares host's network (no port mapping needed)
docker run --network host my-api
# App listens on port 3000 → accessible at host:3000 directly
```

```yaml
services:
  api:
    network_mode: host
    # No ports: mapping needed
```

**Trade-offs**: No port conflicts allowed, no network isolation, but faster (no NAT overhead).

## Troubleshooting

### Diagnostic Commands

```bash
# List networks
docker network ls

# Inspect network (see connected containers + IPs)
docker network inspect <network>

# Check container's network config
docker inspect --format='{{json .NetworkSettings.Networks}}' <container> | jq

# Test TCP connectivity
docker exec api nc -zv db 5432

# Test HTTP connectivity
docker exec api curl -f http://other-service:3000/health

# DNS debugging
docker exec api nslookup <hostname>

# Check iptables rules (Linux)
sudo iptables -L -n -t nat | grep DOCKER
```

### Common Problems

| Problem | Symptom | Fix |
|---------|---------|-----|
| Service unreachable by name | "Could not resolve host" | Put on same network, use custom bridge |
| Connection refused | "Connection refused to db:5432" | Service not ready yet — use `depends_on` + health check |
| Binding to localhost | Can reach from host but not from container | Bind to `0.0.0.0` inside the container |
| Port conflict | "Bind for 0.0.0.0:3000 failed: port already in use" | Change host port or stop conflicting service |
| Network doesn't exist | "network X not found" | Create with `docker network create` or `docker compose up` |
| Can't reach host services | Localhost from inside container = the container itself | Use `host.docker.internal` (Docker Desktop) |

### Reaching Host from Container

```bash
# Docker Desktop (macOS/Windows)
# Special hostname resolves to host machine
curl http://host.docker.internal:8080

# Linux — add to compose
services:
  api:
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

## Network Cleanup

```bash
# Remove unused networks
docker network prune

# Remove specific network
docker network rm <network>

# Remove everything (careful!)
docker system prune --all
```
