---
name: infra-review
description: Review infrastructure configuration — Dockerfiles, K8s manifests, CI/CD pipelines, and security posture
---

# /infra-review

Review infrastructure configuration files for best practices, security, and optimization opportunities.

## Instructions

1. Ask the user what to review, or detect from context:
   - Dockerfile → apply dockerfile-optimization skill
   - GitHub Actions workflow → apply github-actions skill
   - Kubernetes manifests → apply kubernetes-troubleshooting skill
   - General security → apply security-hardening skill
   - Cloud costs → apply infrastructure-cost skill
2. Read the relevant configuration files
3. Analyze against best practices from the appropriate skill(s)
4. Produce a review report with:
   - **Score**: Overall quality rating (Good / Needs Work / Critical Issues)
   - **Issues found**: Prioritized list (Critical / Warning / Info)
   - **Specific fixes**: Show before/after for each issue
   - **What's good**: Acknowledge what's already well-done

## Arguments

If arguments are provided, interpret them as:
- A file path → review that specific file
- A topic → focus the review (e.g., `/infra-review security`, `/infra-review costs`)
- "all" → comprehensive review of all infrastructure config in the project

$ARGUMENTS
