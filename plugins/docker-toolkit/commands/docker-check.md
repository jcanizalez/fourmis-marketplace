---
name: docker-check
description: Analyze a Dockerfile for best practices, security issues, and optimization opportunities
arguments:
  - name: path
    description: Path to the Dockerfile (default: ./Dockerfile)
    required: false
---

# Docker Check

Analyze the Dockerfile at `$ARGUMENTS` (default: `./Dockerfile`) for best practices, security issues, and optimization opportunities. Perform a systematic review covering these categories:

## Analysis Steps

1. **Find the Dockerfile**: Look for the file at the given path, or `./Dockerfile` if none specified. If not found, check for `Dockerfile.*` variants or `docker/Dockerfile`.

2. **Base Image Review**:
   - Is it using a specific version tag (not `latest`)?
   - Is it using a slim/alpine/distroless base where appropriate?
   - Are there newer stable versions available?

3. **Multi-Stage Build**:
   - Is multi-stage build used? If not, should it be?
   - Are build tools excluded from the final stage?
   - Is `--from=builder` used efficiently?

4. **Layer Optimization**:
   - Are `RUN` commands combined where appropriate?
   - Is `apt-get update && install` in the same layer as cleanup?
   - Are layers ordered from least to most frequently changing?
   - Is the package lock file copied before source code (for cache)?

5. **Security**:
   - Is there a `USER` directive (non-root)?
   - Are there any secrets in `ENV`, `ARG`, or `COPY` (e.g., `.env`, API keys)?
   - Are `--mount=type=secret` used for build-time secrets?
   - Are unnecessary capabilities still present?

6. **Production Readiness**:
   - Is `.dockerignore` present and properly configured?
   - Are dev dependencies excluded (`--omit=dev`, `--no-cache-dir`)?
   - Is a `HEALTHCHECK` defined?
   - Is `EXPOSE` declared for documentation?

7. **Common Mistakes**:
   - Using `ADD` instead of `COPY` (unless tar extraction needed)
   - Running `apt-get upgrade` (unpredictable in builds)
   - Missing `--no-install-recommends` on apt
   - Using `npm install` instead of `npm ci` in production

## Output Format

Present findings as a table:

| Category | Finding | Severity | Suggestion |
|----------|---------|----------|------------|

Severity levels: 🔴 Critical, 🟡 Warning, 🟢 Good

End with a summary score (e.g., "7/10 — solid foundation, fix the 2 critical issues") and the top 3 actionable improvements.

## Related

- Use `/compose-check` to audit the Docker Compose file alongside the Dockerfile
- Use `/docker-debug` to diagnose issues with a running container built from this image
