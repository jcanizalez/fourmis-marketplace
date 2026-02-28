---
name: deploy
description: Generate or review a deployment pipeline — staging, production, rollback
allowed-tools: Bash, Read, Glob, Grep
---

# /deploy — Deployment Pipeline

Generate or review a deployment pipeline for your project.

## Usage

```
/deploy                         # Generate deployment pipeline for current project
/deploy <platform>              # Generate deploy config for a specific platform
/deploy review                  # Review existing deployment configuration
/deploy rollback                # Generate rollback strategy
```

## Platforms

```
/deploy vercel
/deploy fly
/deploy aws                    # ECS, Lambda, or S3/CloudFront
/deploy docker                 # Docker Compose based
/deploy k8s                    # Kubernetes
```

## Examples

```
/deploy
/deploy vercel
/deploy review
/deploy aws lambda
/deploy rollback
```

## Process

1. **Detect deployment method**: Check for existing deploy configs (vercel.json, fly.toml, Dockerfile, k8s manifests)
2. **Generate pipeline**:
   - Environment promotion (dev → staging → production)
   - Health checks and smoke tests
   - Manual approval for production
   - Rollback strategy
3. **Create necessary files**: workflow YAML, deploy scripts, environment configs
4. **Document required secrets** and environment variables

## Notes

- Always includes a staging → production promotion pattern
- Generates health check verification after deployment
- Includes rollback strategy for every deployment
- Documents all required secrets and configuration
