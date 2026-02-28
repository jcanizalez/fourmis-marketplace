---
name: ci
description: Analyze and improve existing CI/CD configuration — find bottlenecks, suggest optimizations
allowed-tools: Read, Glob, Grep, Bash
---

# /ci — CI/CD Analysis & Optimization

Analyze existing CI/CD configuration and suggest improvements.

## Usage

```
/ci                             # Analyze current CI/CD setup
/ci optimize                   # Focus on speed optimization
/ci security                   # Security audit of CI config
/ci debug                      # Help debug a failing CI run
```

## Examples

```
/ci
/ci optimize
/ci security
/ci debug
```

## Process

1. **Scan for CI configs**: `.github/workflows/*.yml`, `Jenkinsfile`, `.gitlab-ci.yml`, `.circleci/config.yml`
2. **Analyze configuration**:
   - Build performance (caching, parallelism, concurrency)
   - Security (permissions, secrets handling, OIDC)
   - Best practices (action versions, error handling)
   - Cost efficiency (runner selection, job splitting)
3. **Generate report** with prioritized recommendations
4. **Offer to implement** the top improvements

## Analysis Checklist

- [ ] Caching configured for package manager
- [ ] Concurrency groups prevent redundant runs
- [ ] Permissions follow least-privilege principle
- [ ] Tests run in parallel where possible
- [ ] Docker builds use BuildKit cache
- [ ] Secrets use OIDC where possible
- [ ] Status badges in README
- [ ] Fail-fast configured appropriately
- [ ] Artifacts uploaded for debugging

## Notes

- Reads existing workflow files to provide contextual advice
- Suggests specific YAML changes, not just general recommendations
- Can help debug specific failing jobs by analyzing workflow syntax
