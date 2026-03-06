# 🚀 docker-toolkit

> Docker and containerization toolkit — Dockerfile best practices (multi-stage builds, layer caching, distroless/scratch, Node.

**Category:** DevOps | **6 skills** | **3 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/docker-toolkit
```

## Overview

Docker and containerization toolkit — Dockerfile best practices (multi-stage builds, layer caching, distroless/scratch, Node.js/Python/Go patterns), Docker Compose (services, networks, health checks, profiles, dev/prod overrides), container debugging (6-step framework, exit codes, logs, exec, networking, resources), image optimization (dive analysis, size reduction, BuildKit cache mounts, buildx multi-arch), Docker networking (bridge, overlay, DNS, service discovery, port mapping), and container security (rootless, image scanning, secrets, capabilities, hardening checklists). 6 skills, 3 commands, 1 agent. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `container-debugging` | When the user asks about debugging Docker containers |
| `docker-compose` | When the user asks about Docker Compose |
| `docker-networking` | When the user asks about Docker networking |
| `docker-security` | When the user asks about Docker security |
| `dockerfile-patterns` | When the user asks about writing a Dockerfile |
| `image-optimization` | When the user asks about reducing Docker image size |

## Commands

| Command | Description |
|---------|-------------|
| `/compose-check` | Analyze a docker-compose.yml for best practices, health checks, security, and common issues |
| `/docker-check` | Analyze a Dockerfile for best practices, security issues, and optimization opportunities |
| `/docker-debug` | Debug a Docker container — check status, logs, networking, and resources to diagnose issues |

## Agents

### docker-expert
Autonomous Docker expert that writes Dockerfiles, Compose stacks, debugs containers, and hardens production deployments

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
