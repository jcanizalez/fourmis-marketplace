---
name: deploy-check
description: Run a pre-deployment safety checklist — verify code, infrastructure, rollback plan, and timing
---

# /deploy-check

Run through the pre-deployment safety checklist before releasing to production.

## Instructions

1. Apply the deployment-safety skill to walk through the full checklist:
   - Code readiness (tests, reviews, migrations)
   - Infrastructure readiness (staging verified, health checks, monitoring)
   - Rollback plan (previous version tagged, procedure documented)
   - Timing (not Friday, not peak hours, team available)
2. For each item, ask the user to confirm or provide details
3. Flag any items that aren't ready as blockers
4. If the codebase is available, check for:
   - Uncommitted changes
   - Failing tests
   - Pending migrations
   - Missing environment variables
5. Summarize the readiness status: READY / BLOCKED (with reasons)

## Arguments

If arguments are provided, interpret them as context:
- `/deploy-check v2.1.0` → Check readiness for version 2.1.0
- `/deploy-check database migration` → Focus on database migration safety
- `/deploy-check rollback plan` → Help create a rollback plan

$ARGUMENTS
