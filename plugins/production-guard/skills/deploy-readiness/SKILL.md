---
description: When the user asks if their code is ready to deploy, wants a pre-deployment checklist, asks about deployment best practices, wants to verify production readiness, or asks about release management, deployment safety, or go-live checks
---

# Deploy Readiness

Pre-deployment verification patterns — what to check before code reaches production. Covers security, performance, reliability, and operational readiness.

## Pre-Deploy Checklist

Run through this before every production deployment:

### Code Quality

| Check | How to Verify | Blocking? |
|-------|---------------|-----------|
| All tests pass | `npm test` / `go test ./...` | ✅ Yes |
| No type errors | `tsc --noEmit` / `mypy` / `go vet` | ✅ Yes |
| No lint warnings | `eslint .` / `golangci-lint run` | ✅ Yes |
| No TODO/FIXME in changed files | `git diff main --name-only \| xargs grep -n 'TODO\|FIXME'` | ⚠️ Warning |
| No console.log/fmt.Println debug | `grep -rn 'console\.log\|fmt\.Print' src/` | ⚠️ Warning |
| No hardcoded URLs | `grep -rn 'localhost\|127\.0\.0\.1' src/` | ✅ Yes |
| Dependencies up to date | `npm audit` / `go mod verify` | ⚠️ Warning |
| No secrets in code | Run secret-scanner hook | ✅ Yes |

### Database

| Check | How to Verify | Blocking? |
|-------|---------------|-----------|
| Migrations tested | Run against staging copy | ✅ Yes |
| Migrations reversible | Verify down migration works | ✅ Yes |
| No breaking schema changes | Check column drops, type changes | ✅ Yes |
| Indexes for new queries | `EXPLAIN ANALYZE` on new SQL | ⚠️ Warning |
| Backfill plan for data migrations | Document in PR | ✅ Yes |
| Connection pool sized | Check max connections vs expected load | ⚠️ Warning |

### API Changes

| Check | How to Verify | Blocking? |
|-------|---------------|-----------|
| Backward compatible | Old clients still work | ✅ Yes |
| New fields optional | Existing requests don't break | ✅ Yes |
| Error responses documented | OpenAPI spec updated | ⚠️ Warning |
| Rate limits configured | Check middleware settings | ⚠️ Warning |
| API versioning | Breaking changes behind /v2 | ✅ Yes |

### Security

| Check | How to Verify | Blocking? |
|-------|---------------|-----------|
| Auth required on new endpoints | Check middleware chain | ✅ Yes |
| Input validated | Zod/joi schemas, Go validators | ✅ Yes |
| SQL injection prevented | Parameterized queries only | ✅ Yes |
| XSS prevented | Output encoding, CSP headers | ✅ Yes |
| CORS configured correctly | Not `*` in production | ✅ Yes |
| Secrets in env vars, not code | Check .env.example matches | ✅ Yes |
| Dependencies scanned | `npm audit`, `go mod verify`, Snyk | ⚠️ Warning |

### Observability

| Check | How to Verify | Blocking? |
|-------|---------------|-----------|
| Structured logging added | New code paths have log statements | ⚠️ Warning |
| Error tracking connected | Sentry/Datadog captures new errors | ⚠️ Warning |
| Metrics for new features | Counters, histograms registered | ⚠️ Warning |
| Health check endpoint | `GET /healthz` returns 200 | ✅ Yes |
| Alerting rules updated | New failure modes have alerts | ⚠️ Warning |

## Deployment Strategies

### Rolling Deploy (Default for Most Teams)

Replace instances one at a time. Zero downtime if health checks are configured.

```
Before:  [v1] [v1] [v1] [v1]
Step 1:  [v2] [v1] [v1] [v1]  ← first instance replaced
Step 2:  [v2] [v2] [v1] [v1]
Step 3:  [v2] [v2] [v2] [v1]
Step 4:  [v2] [v2] [v2] [v2]  ← complete
```

**When to use:** Most deployments, stateless services, API servers.

**Risk:** If v2 has a bug, some users see it during rollout.

### Blue-Green Deploy

Run two identical environments. Switch traffic all at once.

```
Blue (live):  [v1] [v1]  ←── traffic
Green (idle): [v2] [v2]       (deploying)

After switch:
Blue (idle):  [v1] [v1]       (standby)
Green (live): [v2] [v2]  ←── traffic
```

**When to use:** Critical services, zero-downtime requirement, need instant rollback.

**Risk:** Requires 2x infrastructure. Database migrations must be compatible with both versions.

### Canary Deploy

Route a small percentage of traffic to the new version. Monitor, then gradually increase.

```
Step 1:  [v2] gets 5% traffic    ← monitor errors, latency
Step 2:  [v2] gets 25% traffic   ← compare metrics
Step 3:  [v2] gets 50% traffic   ← verify at scale
Step 4:  [v2] gets 100% traffic  ← full rollout
```

**When to use:** High-traffic services, risky changes, when you need production validation.

**Risk:** Complex to set up. Need traffic splitting (Istio, ALB weighted routing, feature flags).

## Rollback Plan

Every deployment should have a rollback plan documented:

```markdown
## Rollback: PR #456 — Add payment provider

### Trigger
- Error rate >1% on /api/payments
- p95 latency >500ms on /api/payments
- Any 5xx from payment provider

### Steps
1. Revert traffic: `kubectl rollout undo deployment/api`
2. Verify: `curl https://api.example.com/healthz`
3. Notify: Post in #incidents Slack channel
4. Investigate: Check logs in Datadog

### Database
- Migration is backward-compatible (added nullable column)
- No down migration needed for rollback
- If needed: `npm run migrate:down -- --to 20240315_before_payments`

### Feature Flag (alternative to full rollback)
- Disable: `curl -X POST https://api.example.com/admin/flags/new-payments -d '{"enabled": false}'`
```

## Feature Flags for Safe Deploys

Deploy code disabled, then enable gradually:

```typescript
// Feature flag check in code
if (await featureFlags.isEnabled('new-checkout', { userId: user.id })) {
  return newCheckoutFlow(cart);
} else {
  return legacyCheckoutFlow(cart);
}
```

### Flag Lifecycle

```
1. Create flag (disabled)     — merge code with flag check
2. Deploy to production       — code is live but inactive
3. Enable for team (1%)       — internal testing
4. Enable for beta (10%)      — early adopters
5. Enable for all (100%)      — general availability
6. Remove flag                — clean up dead code (important!)
```

**Common mistake:** Never removing flags. Stale flags accumulate and make code harder to understand. Set a flag expiry date when you create it.

## Environment Parity

Minimize differences between environments:

| Aspect | Dev | Staging | Production |
|--------|-----|---------|------------|
| Database | PostgreSQL 16 | PostgreSQL 16 | PostgreSQL 16 |
| Node.js | 22.x | 22.x | 22.x |
| OS | macOS/Linux | Linux (same image) | Linux (same image) |
| Env vars | `.env.development` | `.env.staging` | `.env.production` |
| Data | Seed data | Anonymized prod copy | Real data |
| SSL | Self-signed | Real cert | Real cert |
| CDN | None | Optional | CloudFront/Cloudflare |

**Key principle:** If it works in staging with the same versions, same OS, and same config structure, it will work in production.

## Release Management

### Semantic Versioning

```
MAJOR.MINOR.PATCH
v2.3.1

MAJOR — Breaking changes (API incompatibility)
MINOR — New features (backward compatible)
PATCH — Bug fixes (backward compatible)
```

### Changelog Generation

Use conventional commits to auto-generate changelogs:

```bash
# With standard-version or semantic-release
npx standard-version

# Generates CHANGELOG.md from commits:
# feat: → Features section
# fix:  → Bug Fixes section
# docs: → Documentation section
# BREAKING CHANGE: → Breaking Changes section
```

### Release Checklist

- [ ] All CI checks pass on main
- [ ] Changelog updated
- [ ] Version bumped (package.json, go module, etc.)
- [ ] Database migrations tested on staging
- [ ] Staging deploy verified
- [ ] Rollback plan documented
- [ ] On-call engineer aware of deployment
- [ ] Feature flags configured for gradual rollout
- [ ] Monitoring dashboards open during deploy
