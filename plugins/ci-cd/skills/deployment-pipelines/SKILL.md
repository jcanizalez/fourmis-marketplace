# Deployment Pipelines

Design and implement deployment pipelines — deployment strategies, environment promotion, rollback patterns, and infrastructure as code integration.

## When to Activate

When the user asks to:
- Set up a deployment pipeline
- Deploy to staging or production
- Implement blue-green or canary deployments
- Create an environment promotion workflow
- Set up rollback automation

## Deployment Strategies

### 1. Rolling Deployment

```
Old: [v1] [v1] [v1] [v1]
     [v2] [v1] [v1] [v1]  ← Replace one at a time
     [v2] [v2] [v1] [v1]
     [v2] [v2] [v2] [v1]
     [v2] [v2] [v2] [v2]  ← Complete
```

**Pros**: Zero downtime, gradual rollout
**Cons**: Mixed versions during deploy, slower rollback
**Best for**: Stateless services, APIs

### 2. Blue-Green Deployment

```
Blue  (live):  [v1] [v1] [v1] ← Traffic here
Green (idle):  [v2] [v2] [v2] ← Deploy + test here

Switch traffic:
Blue  (idle):  [v1] [v1] [v1]
Green (live):  [v2] [v2] [v2] ← Traffic here now

Rollback = switch back to Blue
```

**Pros**: Instant rollback, zero-downtime, full testing before switch
**Cons**: 2x infrastructure cost during deploy
**Best for**: Critical services, when instant rollback is essential

### 3. Canary Deployment

```
Main:   [v1] [v1] [v1] [v1] ← 95% traffic
Canary: [v2]                 ← 5% traffic

Monitor → OK? Increase canary:
Main:   [v1] [v1] [v1]      ← 75% traffic
Canary: [v2] [v2]           ← 25% traffic

Full rollout:
Main:   [v2] [v2] [v2] [v2] ← 100% traffic
```

**Pros**: Catches issues early, minimal blast radius
**Cons**: Complex routing, monitoring required
**Best for**: Large-scale services, user-facing apps

## Environment Promotion Pipeline

```
┌──────────┐    ┌─────────┐    ┌────────────┐
│   Dev    │ →  │ Staging │ →  │ Production │
└──────────┘    └─────────┘    └────────────┘
  Auto deploy   Auto deploy    Manual approve
  on push       on main merge  + health check
```

### GitHub Actions Implementation

```yaml
name: Deploy Pipeline

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - run: ./deploy.sh staging
        env:
          DEPLOY_KEY: ${{ secrets.STAGING_DEPLOY_KEY }}

  smoke-test:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -f https://staging.example.com/health || exit 1
          curl -f https://staging.example.com/api/status || exit 1

  deploy-production:
    needs: smoke-test
    runs-on: ubuntu-latest
    environment: production     # Requires manual approval
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - run: ./deploy.sh production
        env:
          DEPLOY_KEY: ${{ secrets.PROD_DEPLOY_KEY }}

  verify-production:
    needs: deploy-production
    runs-on: ubuntu-latest
    steps:
      - run: |
          for i in 1 2 3 4 5; do
            curl -f https://example.com/health && exit 0
            sleep 10
          done
          exit 1
```

## Rollback Patterns

### Automated Rollback on Health Check Failure

```yaml
  deploy:
    steps:
      - run: ./deploy.sh $VERSION
      - name: Health check
        id: health
        run: |
          sleep 30
          curl -f https://example.com/health
        continue-on-error: true
      - name: Rollback on failure
        if: steps.health.outcome == 'failure'
        run: ./deploy.sh $PREVIOUS_VERSION
```

### Git-Based Rollback

```bash
# Rollback to previous release
git revert HEAD --no-edit
git push origin main
# CI/CD picks up the revert and redeploys
```

## Platform-Specific Deployment

### Vercel

```yaml
- name: Deploy to Vercel
  uses: amondnet/vercel-action@v25
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
    vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
    vercel-args: ${{ github.ref == 'refs/heads/main' && '--prod' || '' }}
```

### Fly.io

```yaml
- name: Deploy to Fly.io
  uses: superfly/flyctl-actions/setup-flyctl@master
- run: flyctl deploy --remote-only
  env:
    FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### AWS (ECS / Lambda)

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: us-east-1

- name: Deploy to ECS
  run: |
    aws ecs update-service \
      --cluster my-cluster \
      --service my-service \
      --force-new-deployment
```

## Deploy Checklist

Before deploying to production:
- [ ] All tests passing
- [ ] Staging deployment verified
- [ ] Database migrations tested
- [ ] Feature flags configured
- [ ] Monitoring/alerts ready
- [ ] Rollback plan documented
- [ ] Team notified of deploy window
