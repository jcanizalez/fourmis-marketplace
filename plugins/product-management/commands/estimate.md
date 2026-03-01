---
name: estimate
description: Estimate engineering effort for a feature or set of stories — uses Fibonacci story points, t-shirt sizing, or PERT three-point estimation with timeline projection
allowed-tools: Read, Glob, Grep
---

# /estimate — Effort Estimator

Estimate the engineering effort for features, stories, or entire projects.

## Usage

```
/estimate                                   # Interactive — describe what to estimate
/estimate "user authentication system"      # Estimate a feature
/estimate --stories                         # Break into stories first, then estimate each
/estimate --pert                            # Three-point estimation with confidence ranges
/estimate --tshirt                          # Quick t-shirt sizing (XS to XXL)
```

## Workflow

### Story Points Mode (default)

1. **Understand the scope**: Read description, scan codebase for related code
2. **Break into stories**: Decompose feature into estimable user stories
3. **Assess complexity**: For each story, evaluate complexity + uncertainty
4. **Assign points**: Fibonacci scale (1, 2, 3, 5, 8, 13)
5. **Flag large items**: Stories >8 points get split suggestions
6. **Project timeline**: Convert points to calendar time using team velocity
7. **Output**: Estimation breakdown with confidence levels

### PERT Mode (--pert)

1. **Break into tasks**: Decompose into concrete engineering tasks
2. **Three-point estimate**: Optimistic, most likely, pessimistic for each
3. **Calculate expected**: PERT formula = (O + 4M + P) / 6
4. **Sum and buffer**: Total expected time + standard deviation buffer
5. **Output**: Estimation with confidence intervals (50%, 80%, 95%)

### T-Shirt Mode (--tshirt)

1. **Quick assessment**: Evaluate overall scope
2. **Assign size**: XS (<1 day) to XXL (1+ month)
3. **Map to rough timeline**: Size → calendar days
4. **Output**: Quick estimate for roadmap planning

## Output (Story Points Mode)

```markdown
## Estimation: [Feature Name]

### Story Breakdown
| # | Story | Points | Complexity | Uncertainty | Notes |
|---|-------|--------|-----------|-------------|-------|
| 1 | [Story] | 3 | Medium | Low | Similar to existing CRUD |
| 2 | [Story] | 5 | High | Medium | 3rd-party API involved |
| 3 | [Story] | 2 | Low | Low | Frontend only |
| 4 | [Story] | 8 | High | High | ⚠️ Consider splitting |
| **Total** | | **18** | | | |

### Timeline Projection
| Scenario | Timeline | Confidence |
|----------|----------|------------|
| Best case | 1 week | 50% |
| Expected | 1.5 weeks | 80% |
| Worst case | 2.5 weeks | 95% |

Assumptions:
- Team velocity: 35 points/sprint (2-week sprints)
- 1 engineer dedicated full-time
- Design complete before engineering starts

### Risks
- Story 2 depends on 3rd-party API stability
- Story 4 may need to be split (8 points is borderline)
```

## Output (PERT Mode)

```markdown
## PERT Estimation: [Feature Name]

| Task | Optimistic | Most Likely | Pessimistic | Expected |
|------|-----------|-------------|-------------|----------|
| [Task 1] | 1 day | 2 days | 5 days | 2.3 days |
| [Task 2] | 2 days | 4 days | 8 days | 4.3 days |
| [Task 3] | 0.5 days | 1 day | 3 days | 1.3 days |
| **Total** | | | | **7.9 days** |

### Confidence Intervals
| Confidence | Range |
|------------|-------|
| 50% | 6-8 days |
| 80% | 8-11 days |
| 95% | 11-14 days |

→ Tell stakeholders: **"2 weeks with high confidence"**
```

## Important

- Story points measure **relative complexity**, not hours
- Always communicate estimates as **ranges**, not single numbers
- Include assumptions — estimates are only valid under stated conditions
- Re-estimate when scope changes (don't just pad the original estimate)
- For stakeholder communication: convert to calendar time with explicit buffer
