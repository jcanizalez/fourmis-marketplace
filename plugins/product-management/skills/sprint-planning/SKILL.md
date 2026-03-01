---
description: When the user asks about sprint planning, iteration planning, sprint backlog, velocity tracking, sprint goals, capacity planning, sprint ceremonies, or organizing work into sprints
---

# Sprint Planning

Sprint planning turns a prioritized backlog into a focused, time-boxed plan. This skill covers sprint structure, capacity planning, goal setting, and ceremonies.

## Sprint Planning Process

### 1. Pre-Planning (Before the Meeting)

| Step | Owner | Output |
|------|-------|--------|
| Groom backlog | PM + Tech Lead | Top 20 items estimated and prioritized |
| Check velocity | Scrum Master | Last 3 sprint average (e.g., 34 points) |
| Calculate capacity | Scrum Master | Available person-days minus PTO/meetings |
| Draft sprint goal | PM | 1-sentence goal aligned with roadmap |

### 2. Sprint Planning Meeting

**Duration:** 1-2 hours for a 2-week sprint

**Agenda:**
1. **Review sprint goal** (5 min) — PM presents the "why"
2. **Walk through candidates** (30 min) — PM presents top backlog items
3. **Capacity check** (10 min) — Team confirms available capacity
4. **Commitment** (30 min) — Team pulls items until capacity is met
5. **Task breakdown** (30 min) — Break stories into tasks (optional)
6. **Confirm sprint goal** (5 min) — Finalize and align

### 3. Sprint Goal

A sprint goal is a single sentence that answers: "What are we trying to achieve this sprint?"

**Good sprint goals:**
- "Users can reset their password via email link"
- "Admin dashboard shows real-time metrics with <2s load time"
- "Onboarding flow reduces drop-off from 40% to 20%"

**Bad sprint goals:**
- "Complete tickets" (not a goal)
- "Fix bugs and add features" (too vague)
- "Finish everything in the backlog" (unrealistic)

## Capacity Planning

### Calculating Team Capacity

```
Available Days = Team Size × Sprint Days − PTO − Meeting Days

Capacity Points = Available Days × Focus Factor × Historical Velocity

Focus Factor = typically 0.6-0.8 (accounts for meetings, support, interruptions)
```

### Example

| Team Member | Sprint Days | PTO | Meetings | Available |
|-------------|-------------|-----|----------|-----------|
| Alice | 10 | 0 | 1 | 9 |
| Bob | 10 | 2 | 1 | 7 |
| Carol | 10 | 0 | 1 | 9 |
| **Total** | | | | **25 days** |

```
Capacity = 25 days × 0.7 focus factor = 17.5 effective days
Historical velocity = ~35 points per sprint (at full capacity of 27 days)
Adjusted velocity = 35 × (25/27) = ~32 points this sprint
```

**Rule:** Plan to 80% of adjusted velocity. Buffer handles unknowns.

### Capacity Planning Template

```markdown
## Sprint [N] Capacity

**Sprint dates:** [Start] → [End] ([N] working days)
**Sprint goal:** [One sentence]

### Team Availability
| Member | Days Available | Notes |
|--------|---------------|-------|
| [Name] | [N] | [PTO, etc.] |
| Total | [N] | |

### Velocity
| Sprint | Committed | Completed | Notes |
|--------|-----------|-----------|-------|
| N-3 | 36 | 32 | Holiday week |
| N-2 | 34 | 34 | Clean sprint |
| N-1 | 38 | 35 | 1 carryover |
| **Avg** | | **33.7** | |

### Planned Capacity
- Available capacity: [N] points (80% of velocity)
- Committed stories: [N] points
- Buffer: [N] points remaining
```

## Sprint Board Structure

### Columns

| Column | Entry Criteria | Exit Criteria |
|--------|---------------|---------------|
| **Backlog** | Estimated, acceptance criteria | Pulled into sprint |
| **To Do** | In sprint, ready to start | Developer assigned |
| **In Progress** | Work has begun | Code complete, tests pass |
| **In Review** | PR opened | Approved by reviewer |
| **QA** | Code merged to staging | QA sign-off |
| **Done** | Deployed to production | Acceptance criteria met |

### WIP Limits

| Column | WIP Limit | Rationale |
|--------|-----------|-----------|
| In Progress | 2 per person | Reduce context switching |
| In Review | 3 total | Prevent review bottleneck |
| QA | 5 total | Batch testing efficiency |

## Sprint Ceremonies

| Ceremony | When | Duration | Purpose |
|----------|------|----------|---------|
| **Sprint Planning** | Sprint start | 1-2 hours | Set goal, commit to work |
| **Daily Standup** | Every day | 15 min | Sync, unblock |
| **Backlog Refinement** | Mid-sprint | 1 hour | Groom upcoming items |
| **Sprint Review** | Sprint end | 1 hour | Demo to stakeholders |
| **Retrospective** | Sprint end | 1 hour | Improve team process |

### Daily Standup Format

Each person answers:
1. **What I did yesterday** (toward the sprint goal)
2. **What I'll do today** (toward the sprint goal)
3. **Any blockers?**

**Anti-patterns to avoid:**
- Status reports to the manager (talk to the team, not the lead)
- Problem-solving in standup (take it offline: "Let's sync after")
- Going over 15 minutes (strict timebox)

## Sprint Health Metrics

| Metric | Healthy | Warning | Action |
|--------|---------|---------|--------|
| **Velocity variance** | ±15% | ±30% | Re-estimate stories |
| **Carryover rate** | <10% | >25% | Commit to less |
| **Scope change** | 0-1 items | >3 items | Protect sprint scope |
| **Bug ratio** | <20% of sprint | >40% | Address quality root cause |
| **Blocked items** | 0-1 | >3 | Escalate blockers |

### Burndown Chart Interpretation

```
Points
  40 ┤ ○                          ← Sprint start (committed)
  35 ┤  ╲
  30 ┤   ╲○                       ← On track
  25 ┤    ╲  ○                     ← Slight delay (normal)
  20 ┤     ╲   ╲
  15 ┤      ╲    ○                 ← Back on track
  10 ┤       ╲     ╲
   5 ┤        ╲      ○
   0 ┤─────────╲───────○          ← Sprint end (goal met)
     └──┬──┬──┬──┬──┬──┬──┬──┬──┬──
       D1 D2 D3 D4 D5 D6 D7 D8 D9 D10

     ╲ = ideal line    ○ = actual progress
```

**Patterns:**
- **Above ideal line** = behind schedule → discuss scope reduction at standup
- **Below ideal line** = ahead → pull in stretch goals
- **Flat sections** = blocked work → investigate and unblock
- **Sudden drop** = items completed in batches → consider smaller stories

## Definition of Done

A story is "done" when ALL of these are true:

```markdown
### Definition of Done
- [ ] Code written and self-reviewed
- [ ] Unit tests pass (>80% coverage for new code)
- [ ] Integration tests pass
- [ ] PR approved by at least 1 reviewer
- [ ] No P0/P1 bugs remaining
- [ ] Merged to main branch
- [ ] Deployed to staging and verified
- [ ] Acceptance criteria met (PM sign-off)
- [ ] Documentation updated (if applicable)
- [ ] Feature flag configured for rollout
```

## Checklist

- [ ] Sprint goal is one clear sentence
- [ ] Capacity calculated with PTO and meetings factored in
- [ ] Planned to 80% of adjusted velocity (buffer for unknowns)
- [ ] All committed stories have acceptance criteria
- [ ] WIP limits set for each board column
- [ ] Definition of done agreed upon by team
- [ ] Ceremonies scheduled with correct duration
- [ ] Previous sprint's carryover items addressed first
