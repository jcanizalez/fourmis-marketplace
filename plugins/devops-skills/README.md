# devops-skills

Turn Claude into a senior DevOps engineer. Comprehensive expertise bundle covering incident response, deployment safety, container optimization, CI/CD, Kubernetes, security, and infrastructure costs.

## Skills (7)

| Skill | What It Covers |
|-------|---------------|
| **Incident Response** | 5-phase playbook (detect → triage → mitigate → resolve → postmortem), severity levels, communication templates, blameless postmortem format |
| **Deployment Safety** | Pre/post-deploy checklists, 4 deployment strategies (rolling, blue-green, canary, feature flags), database migration safety, rollback procedures |
| **Dockerfile Optimization** | Multi-stage builds, layer caching rules, image size reduction, security best practices, debugging commands, common anti-patterns |
| **GitHub Actions** | Workflow structure, speed optimization (caching, parallelism, concurrency), debugging failed workflows, security (pin SHAs, limit permissions), reusable workflows |
| **Kubernetes Troubleshooting** | Diagnostic decision tree, essential debug commands, CrashLoopBackOff/OOM/networking fixes, resource right-sizing, HPA configuration |
| **Security Hardening** | Application security (auth, input validation, headers), container security, CI/CD security, dependency scanning, OWASP Top 10 reference |
| **Infrastructure Cost** | Cost audit framework, waste detection, right-sizing guide, pricing strategies (reserved, spot, serverless), network cost reduction, cost report template |

## Commands (3)

| Command | Description |
|---------|-------------|
| `/incident` | Start structured incident response — assess severity, triage, mitigate |
| `/deploy-check` | Pre-deployment safety checklist with go/no-go decision |
| `/infra-review` | Review infrastructure configs against best practices |

## Agents (2)

| Agent | Description |
|-------|-------------|
| **Incident Responder** | Autonomous incident investigation — analyzes logs, checks changes, identifies root causes |
| **Infra Reviewer** | Comprehensive infrastructure audit — reviews Dockerfiles, K8s manifests, CI/CD, security |

## Setup

No setup required. Pure skills plugin — no MCP server, no API keys, no dependencies.

```bash
fourmis plugin install devops-skills
```

## Usage Examples

### Respond to an incident
```
/incident API returning 500 errors after deploy
```

### Check deployment readiness
```
/deploy-check v2.1.0 to production
```

### Review infrastructure
```
/infra-review
```
The infra-reviewer agent will automatically scan for Dockerfiles, K8s manifests, CI/CD configs, and security issues.

## Why This Plugin?

DevOps expertise costs $150K+/year. This plugin encodes senior DevOps knowledge:

- **Incident playbooks** with decision trees, not just "check the logs"
- **Deployment checklists** covering code, infra, rollback, and timing
- **Container patterns** with specific multi-stage build examples per language
- **K8s debugging** with a systematic diagnostic tree, not random commands
- **Security checklists** mapped to OWASP Top 10 with concrete fixes
- **Cost frameworks** with templates for audits and reports

Every developer shipping to production benefits from this plugin.

## License

MIT
