---
description: When the user asks about sprint retrospectives, team retros, process improvement, what went well / what didn't, post-mortem, lessons learned, continuous improvement, or improving team processes
---

# Sprint Retrospectives

Retrospectives are how teams get better. At the end of each sprint, the team reflects on what worked, what didn't, and commits to specific improvements. This skill covers retro formats, facilitation, and action tracking.

## Core Retro Process

### Structure (60 minutes)

| Phase | Duration | Activity |
|-------|----------|----------|
| **Set the stage** | 5 min | Check-in, set ground rules |
| **Gather data** | 15 min | Everyone writes observations |
| **Generate insights** | 15 min | Group, discuss, find patterns |
| **Decide actions** | 15 min | Pick 1-3 concrete improvements |
| **Close** | 5 min | Quick feedback on the retro itself |

### Ground Rules

- **Vegas rule** — what's said in retro stays in retro
- **No blame** — focus on systems and processes, not people
- **Everyone speaks** — every voice matters
- **One conversation** — no side discussions
- **Timeboxed** — respect the clock

## Retro Format 1: Start / Stop / Continue

The simplest and most popular format:

```markdown
## Sprint [N] Retrospective — [Date]

### 🟢 Start (things we should begin doing)
- Start writing acceptance criteria before sprint planning
- Start doing code reviews within 4 hours of PR creation
- Start pairing on complex stories

### 🔴 Stop (things we should stop doing)
- Stop adding scope mid-sprint without removing something else
- Stop skipping unit tests "to save time"
- Stop having 1-hour standups (timebox to 15 min)

### 🔵 Continue (things that are working well)
- Continue daily standups at 9:30 AM (everyone shows up)
- Continue the PR review checklist
- Continue sprint demos to stakeholders

### ✅ Action Items
| Action | Owner | Due | Status |
|--------|-------|-----|--------|
| Create PR review SLA (4 hours) | Alice | Sprint 15 | Pending |
| Add acceptance criteria template to Jira | PM | This week | Pending |
| Reduce standup to 15 min strict | Scrum Master | Immediately | Pending |
```

## Retro Format 2: 4Ls (Liked, Learned, Lacked, Longed For)

Good for teams that want more nuance:

```markdown
## Sprint [N] Retrospective — 4Ls

### 💚 Liked (what went well)
- Pair programming sessions were productive
- Sprint goal achieved on time
- New CI pipeline caught 3 bugs before merge

### 📘 Learned (what we discovered)
- GraphQL subscriptions have a 10K connection limit
- Staging data is 6 months stale — tests passed but prod had issues
- Customer interviews revealed we were solving the wrong problem

### 🔴 Lacked (what was missing)
- No design review before development started
- Unclear acceptance criteria on 2 stories
- No runbook for the new deployment process

### 💭 Longed For (what we wish we had)
- Automated E2E test suite
- Better staging environment that mirrors prod
- More time for refactoring

### ✅ Action Items
| Action | Owner | Due |
|--------|-------|-----|
| Schedule design review at sprint start | PM | Next sprint |
| Create deployment runbook | DevOps lead | This week |
| Propose E2E test spike for next sprint | QA lead | Sprint planning |
```

## Retro Format 3: Sailboat

Visual metaphor — what propels us forward vs what holds us back:

```
                    ☀️ VISION (where we're heading)
                    "Ship team collaboration v1 by March"

          🏝️ ISLAND
          (our goal)
              |
              |    💨 WIND (what pushes us forward)
              |    - Great teamwork on auth refactor
              |    - CI/CD pipeline is fast
              |    - PM specs were clear this sprint
   ⛵ BOAT    |
   (our team) |    ⚓ ANCHOR (what holds us back)
              |    - Flaky tests waste 30 min/day
              |    - Too many meetings on Tuesday
              |    - Unclear ownership of shared components
              |
              |    🪨 ROCKS (risks ahead)
              |    - 3rd party API deprecation in April
              |    - Key team member on PTO next sprint
              |    - No monitoring on new service
```

## Retro Format 4: Mad / Sad / Glad

Emotion-based — encourages honest sharing:

```markdown
### 😡 Mad (frustrated about)
- PR sat in review for 3 days
- Scope was changed after we started building
- Deployment failed and no one knew the rollback process

### 😢 Sad (disappointed about)
- Didn't ship the feature we committed to
- Lost a team member to another project
- Technical debt is growing faster than we're paying it down

### 😊 Glad (happy about)
- New hire ramped up faster than expected
- Zero production incidents this sprint
- Customer feedback on the beta was positive

### ✅ Top 3 Actions
1. [Action] — [Owner] — [Due date]
2. [Action] — [Owner] — [Due date]
3. [Action] — [Owner] — [Due date]
```

## Retro Format 5: Timeline

Walk through the sprint chronologically to surface patterns:

```
Week 1                              Week 2
Mon  Tue  Wed  Thu  Fri  |  Mon  Tue  Wed  Thu  Fri
─────────────────────────|──────────────────────────
 ✅    ✅    ⚠️    ✅   ✅  |   ❌    ⚠️    ✅    ✅   ✅
                              │
 Sprint    Good     Design    │  Blocker:     Unblocked,  All stories
 start     progress review    │  API down     finished    done ✅
                    delayed   │  for 4 hrs    2 stories
                              │
```

Each team member adds sticky notes (events, emotions, blockers) to the timeline. Patterns emerge: "We always have problems on Monday of week 2 — that's when external APIs update."

## Action Item Best Practices

### SMART Actions

| Bad Action | Good Action |
|-----------|------------|
| "Improve code reviews" | "Review all PRs within 4 hours during business hours. Alice tracks compliance for 2 sprints." |
| "Write more tests" | "Add unit tests for any file touched during Sprint 15. Minimum 80% coverage on new code." |
| "Communicate better" | "Post daily async update in #team-updates by 10 AM. Format: what I did / what I'm doing / blockers." |
| "Fix flaky tests" | "Identify top 5 flaky tests by failure rate. Bob fixes them in Sprint 15 (estimated 5 points)." |

### Action Tracking

Track actions across sprints to ensure follow-through:

```markdown
## Retro Action Tracker

### Active Actions
| Sprint | Action | Owner | Status | Impact |
|--------|--------|-------|--------|--------|
| S14 | 4-hour PR review SLA | Alice | ✅ Done | Review time dropped from 2 days to 6 hours |
| S14 | Acceptance criteria template | PM | 🔵 In Progress | Template created, adoption TBD |
| S15 | Fix top 5 flaky tests | Bob | ⬜ Not Started | Scheduled for S15 |

### Completed Actions (last 3 sprints)
| Sprint | Action | Outcome |
|--------|--------|---------|
| S12 | Add CI linting | 40% fewer lint comments in PRs |
| S12 | Sprint demo recording | 3 stakeholders watch async |
| S13 | Reduce standup to 15 min | Team reclaimed 2.5 hrs/week |
```

### Action Follow-Up Rule

**Start every retro by reviewing last sprint's actions.** If an action wasn't completed, ask:
1. Is it still relevant?
2. What blocked it?
3. Should we recommit or drop it?

## Team Health Check

Periodically (monthly or quarterly), assess team health across dimensions:

| Dimension | 😊 | 😐 | 😞 | Trend |
|-----------|----|----|----|----|
| **Fun** — Do we enjoy our work? | ✅ | | | ↗️ |
| **Delivery** — Are we shipping on time? | | ✅ | | → |
| **Quality** — Are we proud of our code? | | ✅ | | ↗️ |
| **Learning** — Are we growing as engineers? | | | ✅ | ↘️ |
| **Mission** — Do we understand why we're building this? | ✅ | | | → |
| **Speed** — Is our pace sustainable? | | ✅ | | → |
| **Support** — Do we have the tools and help we need? | | | ✅ | ↘️ |
| **Teamwork** — Do we collaborate well? | ✅ | | | ↗️ |

Focus retro actions on the declining (↘️) dimensions.

## Facilitation Tips

| Tip | Why |
|-----|-----|
| Rotate facilitators | Prevents one person's bias, builds leadership |
| Use silent writing first | Introverts contribute equally |
| Vote on topics (dot voting) | Focus discussion on what matters most |
| Limit to 3 action items | More than 3 won't get done |
| Change formats regularly | Prevents retro fatigue |
| Celebrate wins first | Sets positive tone before addressing problems |
| End with gratitude | "Thank someone who helped you this sprint" |

## Checklist

- [ ] Retro scheduled within 24 hours of sprint end
- [ ] Previous sprint's actions reviewed first
- [ ] Everyone contributed (silent writing phase)
- [ ] Discussion focused on systems, not individuals
- [ ] 1-3 SMART action items identified
- [ ] Each action has an owner and due date
- [ ] Actions tracked in a visible location
- [ ] Format rotated every 2-3 sprints to keep it fresh
