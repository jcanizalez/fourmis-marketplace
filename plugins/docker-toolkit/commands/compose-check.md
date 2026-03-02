---
name: compose-check
description: Analyze a docker-compose.yml for best practices, health checks, security, and common issues
arguments:
  - name: path
    description: Path to the compose file (default: ./docker-compose.yml)
    required: false
---

# Compose Check

Analyze the Docker Compose file at `$ARGUMENTS` (default: `./docker-compose.yml`) for best practices, health checks, security, and common issues. Also check `compose.yml` and `docker-compose.override.yml` if they exist.

## Analysis Steps

1. **Find the Compose file(s)**: Check the given path, then `compose.yml`, `docker-compose.yml`, and any override files.

2. **Health Checks**:
   - Does every database/cache service have a `healthcheck`?
   - Do dependent services use `depends_on` with `condition: service_healthy`?
   - Are `interval`, `timeout`, `retries`, and `start_period` reasonable?

3. **Networking**:
   - Are services on appropriate networks (isolation between frontend/backend)?
   - Are ports bound to `127.0.0.1` where appropriate (not exposed to LAN)?
   - Are internal ports used for container-to-container (not host ports)?
   - Is `network_mode: host` used unnecessarily?

4. **Volumes**:
   - Are named volumes used for persistent data (databases)?
   - Are bind mounts only used for development (code sync)?
   - Is `node_modules` excluded from bind mounts?
   - Are config files mounted as `:ro` (read-only)?

5. **Security**:
   - Are there hardcoded secrets in `environment:`?
   - Should Docker secrets or `env_file` be used instead?
   - Is `privileged: true` used? Is it necessary?
   - Are resource limits (`deploy.resources.limits`) set?
   - Is `read_only: true` used where possible?

6. **Environment Variables**:
   - Are required vars validated (`${VAR:?error}`)?
   - Are defaults provided where appropriate (`${VAR:-default}`)?
   - Is `env_file` used for sensitive values?

7. **Dev vs Production**:
   - Is there an override file for development?
   - Are dev-only settings (bind mounts, debug mode, hot reload) separated?
   - Are profiles used for optional services (monitoring, admin tools)?

8. **Common Mistakes**:
   - Using `depends_on` without health check conditions
   - Missing `restart: unless-stopped` for production services
   - Using `build:` context without `.dockerignore`
   - Exposing database ports to the host unnecessarily

## Output Format

Present findings as a table:

| Service | Finding | Severity | Suggestion |
|---------|---------|----------|------------|

Severity levels: 🔴 Critical, 🟡 Warning, 🟢 Good

End with a summary and top 3 actionable improvements.
