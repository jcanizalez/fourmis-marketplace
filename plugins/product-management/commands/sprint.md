---
name: sprint
description: Plan a sprint — calculate capacity, pull stories from backlog, set a sprint goal, and generate a sprint plan with assignments and timeline
allowed-tools: Read, Write, Glob, Grep
---

# /sprint — Sprint Planner

Plan an upcoming sprint from backlog items, team capacity, and velocity.

## Usage

```
/sprint                             # Interactive sprint planning
/sprint plan                        # Generate sprint plan from backlog
/sprint review                      # Generate sprint review summary
/sprint retro                       # Run a retrospective template
/sprint health                      # Check current sprint health
```

## Workflow

### Plan Mode (default)

1. **Gather context**: Read project backlog, previous sprint data, team info
2. **Calculate capacity**: Team size × available days × focus factor
3. **Set sprint goal**: Propose a 1-sentence goal aligned with roadmap
4. **Select stories**: Pull highest-priority items that fit capacity (80% rule)
5. **Check dependencies**: Flag any stories that block each other
6. **Generate sprint plan**: Formatted plan with assignments and timeline
7. **Output**: Sprint plan ready for team review

### Review Mode

1. **Summarize completed work**: Stories shipped, points completed
2. **Calculate velocity**: Compare committed vs completed
3. **List carryover**: Items not completed and why
4. **Prepare demo notes**: What to show stakeholders
5. **Output**: Sprint review document

### Retro Mode

1. **Present retro format**: Rotate between Start/Stop/Continue, 4Ls, Sailboat
2. **Review previous actions**: Check last sprint's action items
3. **Template for team input**: Formatted sections for team to fill
4. **Action item template**: SMART format with owners and dates
5. **Output**: Retro document ready for facilitation

### Health Mode

1. **Progress check**: Stories completed vs remaining vs sprint days left
2. **Burndown status**: On track, behind, or ahead
3. **Blocked items**: Any stories stuck
4. **Scope changes**: Items added/removed mid-sprint
5. **Risk assessment**: Will we meet the sprint goal?
6. **Output**: Sprint health dashboard

## Output (Plan Mode)

```markdown
## Sprint [N] Plan

**Sprint Goal:** [One sentence]
**Dates:** [Start] → [End] (10 working days)
**Capacity:** [N] points (80% of [team velocity])

### Team Availability
| Member | Available Days | Notes |
|--------|---------------|-------|
| Alice | 10 | Full capacity |
| Bob | 7 | PTO Thu-Fri W2 |

### Sprint Backlog
| # | Story | Points | Assignee | Priority |
|---|-------|--------|----------|----------|
| 1 | [Story title] | 5 | Alice | P0 |
| 2 | [Story title] | 3 | Bob | P0 |
| 3 | [Story title] | 3 | Alice | P0 |
| 4 | [Story title] | 5 | Bob | P1 |
| **Total** | | **16** | | |

### Dependencies
- Story 4 depends on Story 2 (Bob should finish Story 2 first)

### Risks
- Bob has reduced capacity — Story 4 may carry over
```

## Important

- Always plan to 80% capacity — the remaining 20% absorbs bugs, support, and unknowns
- Sprint goal should be achievable even if 1-2 stories slip
- Carryover from previous sprint gets priority in the new sprint
- Review previous retro actions at the start of every sprint planning session
