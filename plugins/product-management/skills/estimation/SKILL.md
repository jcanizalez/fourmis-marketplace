---
description: When the user asks about effort estimation, story points, t-shirt sizing, planning poker, Fibonacci estimation, time estimates, project timeline estimation, how long something will take to build, or engineering effort estimation
---

# Estimation Techniques

Estimation helps teams plan capacity and set expectations. This skill covers story points, t-shirt sizing, planning poker, and timeline estimation for engineering teams.

## Story Point Estimation

### Fibonacci Scale

Story points measure relative complexity, not hours. Use the Fibonacci sequence:

| Points | Meaning | Example |
|--------|---------|---------|
| **1** | Trivial — fully understood, minimal code | Fix a typo, update a config value |
| **2** | Simple — one file, clear approach | Add a form field with validation |
| **3** | Medium — a few files, well-understood | New API endpoint with tests |
| **5** | Complex — multiple components, some unknowns | Search feature with filters |
| **8** | Large — significant work, needs investigation | Payment integration |
| **13** | Epic — too big, must be split | Full auth system (split first!) |
| **21** | Way too big — not estimable | "Rewrite the frontend" |

### Why Fibonacci?

The gaps grow as complexity increases because **uncertainty grows with size**. The difference between a 5 and an 8 is meaningful. The difference between a 47 and a 52 is noise.

### Estimation Reference Matrix

Use two dimensions — complexity and uncertainty:

```
                    Low Uncertainty    Medium Uncertainty    High Uncertainty
                    (done it before)   (some unknowns)       (research needed)
                    ────────────────   ──────────────────    ─────────────────
Low Complexity        1 point            2 points             3 points
Medium Complexity     2 points           3 points             5 points
High Complexity       3 points           5 points             8 points
Very High             5 points           8 points             13 → SPLIT
```

## Planning Poker

### Process

1. **Present the story** — PM reads the story and acceptance criteria
2. **Discuss** — Team asks clarifying questions (2 min)
3. **Vote** — Everyone picks a card simultaneously (1, 2, 3, 5, 8, 13)
4. **Reveal** — All cards shown at once
5. **Discuss outliers** — Highest and lowest explain their reasoning
6. **Re-vote** — One more round if needed
7. **Consensus** — Take the majority or nearest Fibonacci number

### Rules

- **Vote simultaneously** — prevents anchoring bias
- **Outliers talk first** — they often know something others don't
- **Max 2 rounds** — if no consensus, take the higher estimate
- **Timeboxed** — 5 minutes per story max
- **Everyone votes** — including junior devs (fresh perspective)

### Common Patterns

| Pattern | What It Means | Action |
|---------|---------------|--------|
| All same number | Strong consensus | Accept and move on |
| 2, 3, 3, 5 | Minor disagreement | Quick discussion, take 3 |
| 1, 1, 8, 13 | Different understanding | Stop — clarify scope and re-vote |
| All 13+ | Story too big | Split the story first |
| "?" card played | Not enough info to estimate | Take it back for refinement |

## T-Shirt Sizing

Quick estimation for roadmap planning (less precise than story points):

| Size | Effort Range | Calendar Time | Examples |
|------|-------------|---------------|---------|
| **XS** | < 1 day | 1 day | Config change, copy update, small bug fix |
| **S** | 1-2 days | 2-3 days | New component, simple endpoint, minor feature |
| **M** | 3-5 days | 1 week | Feature with backend + frontend, API integration |
| **L** | 1-2 weeks | 2-3 weeks | Full feature with design, multi-service, testing |
| **XL** | 2-4 weeks | 1-2 months | Major feature, new system, significant refactor |
| **XXL** | 1+ months | 1 quarter | Too big — break down into L and M items |

### When to Use T-Shirt vs Points

| Situation | Use |
|-----------|-----|
| Sprint planning (this sprint) | Story Points |
| Backlog grooming (next 2-3 sprints) | Story Points |
| Roadmap planning (next quarter) | T-Shirt Sizes |
| Executive stakeholder estimates | T-Shirt Sizes |
| Quick triage of new requests | T-Shirt Sizes |

## Time-Based Estimation

When stakeholders need calendar dates, convert from story points:

### Velocity-Based Timeline

```
Total story points for feature: 45 points
Team velocity: 35 points/sprint
Sprint length: 2 weeks

Sprints needed = 45 / 35 = 1.3 sprints
Calendar time = 1.3 × 2 weeks = 2.6 weeks

Apply buffer:
  Low risk: × 1.2 = 3.1 weeks → "About 3 weeks"
  Medium risk: × 1.5 = 3.9 weeks → "About a month"
  High risk: × 2.0 = 5.2 weeks → "4-6 weeks"
```

### Three-Point Estimation (PERT)

For individual tasks, estimate three scenarios:

```
O = Optimistic (best case, everything goes right)
M = Most Likely (realistic, typical case)
P = Pessimistic (worst case, major issues)

Expected = (O + 4×M + P) / 6
Standard Deviation = (P - O) / 6
```

| Task | Optimistic | Most Likely | Pessimistic | Expected |
|------|-----------|-------------|-------------|----------|
| Auth API | 2 days | 4 days | 10 days | 4.7 days |
| Payment UI | 1 day | 3 days | 7 days | 3.3 days |
| Email service | 1 day | 2 days | 5 days | 2.3 days |
| **Total** | | | | **10.3 days** |

With buffer (1 standard deviation): ~12 days → **"About 2.5 weeks"**

## Estimation Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| **Anchoring** | First estimate biases everyone | Use planning poker (simultaneous reveal) |
| **Pressure to underestimate** | "Can you do it in 2 days?" | Estimate independently, then negotiate scope |
| **Points = hours** | Team converts 1 point = 4 hours | Points are relative complexity, not time |
| **Padding everything** | All estimates doubled "just in case" | Use explicit risk buffers instead |
| **Not re-estimating** | Scope changed but estimate didn't | Re-estimate when acceptance criteria change |
| **Solo estimation** | One person guesses for the team | Team estimates together (diverse perspectives) |
| **Ignoring history** | Not using past velocity data | Track velocity and use it for planning |

## Feature Estimation Template

```markdown
## Estimation: [Feature Name]

### Assumptions
- [Team size and availability]
- [Dependencies resolved before start]
- [Design complete before engineering]

### Story Breakdown
| Story | Points | Risk | Notes |
|-------|--------|------|-------|
| [Story 1] | 3 | Low | Well-understood |
| [Story 2] | 5 | Medium | 3rd-party API involved |
| [Story 3] | 8 | High | No prior experience |
| [Story 4] | 3 | Low | Similar to past work |
| [Story 5] | 5 | Medium | Depends on Story 2 |
| **Total** | **24** | | |

### Timeline Estimate
- Team velocity: 35 pts/sprint (2-week sprints)
- Sprints needed: ~0.7 sprints (24/35)
- Calendar time: 1.4 weeks raw
- Risk buffer: × 1.3 (medium risk)
- **Estimate: 2 weeks** (including QA and buffer)

### Confidence Level
| Confidence | Range |
|------------|-------|
| 50% (likely) | 1.5-2 weeks |
| 80% (probable) | 2-3 weeks |
| 95% (safe) | 3-4 weeks |

### Risks
1. [Risk: 3rd-party API has rate limits] → Mitigation: pre-test limits
2. [Risk: Design not finalized] → Mitigation: start with backend
```

## Communicating Estimates

### To Engineering

"This feature is **24 points across 5 stories**. At our velocity of 35 points/sprint, it fits within one sprint with room for a few smaller items."

### To Product/Stakeholders

"We estimate **2 weeks** with medium confidence. The main risk is the payment API integration — if that has complications, it could stretch to 3 weeks. We'll have a clearer picture after the first 3 days."

### To Executives

"This is a **Medium** effort (t-shirt size). We'll deliver it in **Sprint 14** (landing March 15). The team is confident in this timeline."

## Checklist

- [ ] Stories estimated using Fibonacci points (not hours)
- [ ] Team estimated together (planning poker or similar)
- [ ] Estimates factor in testing and review time
- [ ] Large items (13+) split before estimating
- [ ] Velocity tracked over last 3 sprints for baseline
- [ ] Risk buffer applied to timeline (1.2× low, 1.5× medium, 2× high)
- [ ] Confidence level communicated alongside the estimate
- [ ] Estimates re-assessed when scope changes
