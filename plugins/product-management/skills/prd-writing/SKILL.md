---
description: When the user asks about writing a PRD, product requirements document, feature specification, product spec, defining requirements, feature brief, product proposal, or scoping a feature
---

# PRD Writing

A Product Requirements Document (PRD) defines what to build and why. It aligns engineering, design, and stakeholders before any code is written. This skill provides production-grade PRD templates and best practices.

## PRD Template

```markdown
# PRD: [Feature Name]

**Author:** [Name]
**Status:** Draft | In Review | Approved | In Development | Shipped
**Last Updated:** [Date]
**Target Release:** [Version or Date]

---

## 1. Overview

### Problem Statement
[2-3 sentences describing the user pain point or business need. Be specific — who is affected, how often, and what's the impact.]

### Proposed Solution
[1-2 sentences describing the high-level approach. What are we building and how does it solve the problem?]

### Success Metrics
| Metric | Current | Target | How Measured |
|--------|---------|--------|--------------|
| [e.g., Task completion rate] | 45% | 70% | Analytics event tracking |
| [e.g., Support tickets/week] | 30 | <10 | Zendesk tag count |
| [e.g., Time to complete] | 4 min | <1 min | Avg session duration |

---

## 2. Background & Context

### Why Now?
[What changed that makes this the right time? Customer feedback trends, competitive pressure, strategic alignment, technical enablers.]

### Prior Art
[What exists today? Internal solutions, competitor approaches, workarounds users currently employ.]

### Assumptions
- [Key assumption 1 — e.g., "Users already have accounts and are logged in"]
- [Key assumption 2 — e.g., "API rate limits won't be a bottleneck at projected scale"]

### Constraints
- [Technical: e.g., "Must work within existing React + GraphQL stack"]
- [Timeline: e.g., "Must ship before Q3 conference"]
- [Resource: e.g., "2 engineers for 4 weeks"]

---

## 3. User Stories & Requirements

### Target Users
| Persona | Description | Primary Need |
|---------|-------------|-------------|
| [e.g., Developer] | Builds integrations daily | Faster API testing workflow |
| [e.g., Team Lead] | Reviews PRs and manages sprint | Visibility into team velocity |

### User Stories

**P0 — Must Have (MVP)**
- As a [persona], I want to [action] so that [benefit]
- As a [persona], I want to [action] so that [benefit]

**P1 — Should Have**
- As a [persona], I want to [action] so that [benefit]

**P2 — Nice to Have (Post-MVP)**
- As a [persona], I want to [action] so that [benefit]

### Functional Requirements
| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-1 | [Feature requirement] | P0 | [Specific, testable criteria] |
| FR-2 | [Feature requirement] | P0 | [Specific, testable criteria] |
| FR-3 | [Feature requirement] | P1 | [Specific, testable criteria] |

### Non-Functional Requirements
| Category | Requirement |
|----------|-------------|
| Performance | Page loads in <2s at p95 |
| Scalability | Handles 10K concurrent users |
| Accessibility | WCAG 2.2 AA compliant |
| Security | Data encrypted at rest and in transit |
| Compatibility | Chrome, Firefox, Safari (last 2 versions) |

---

## 4. Design & UX

### User Flow
[Describe the happy path step by step, or reference a Figma link]

1. User navigates to [entry point]
2. User sees [initial state]
3. User performs [action]
4. System responds with [feedback]
5. User achieves [outcome]

### Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Empty state (no data) | Show onboarding prompt with CTA |
| Error (network failure) | Show inline error with retry button |
| Exceeded limit | Show upgrade prompt with usage details |

### Wireframes / Mockups
[Links to Figma, screenshots, or ASCII diagrams]

---

## 5. Technical Approach

### Architecture
[High-level technical approach — new services, database changes, API endpoints, third-party integrations]

### API Changes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/resource | Create new resource |
| GET | /api/v1/resource/:id | Retrieve resource |

### Data Model Changes
[New tables, schema migrations, index additions]

### Dependencies
- [External service or API]
- [Internal service that needs changes]

### Migration Strategy
[How to handle existing users/data during rollout]

---

## 6. Launch Plan

### Rollout Strategy
- [ ] Internal dogfooding (1 week)
- [ ] Beta with 10% of users (2 weeks)
- [ ] GA rollout (100%)
- [ ] Monitor metrics for 1 week post-launch

### Feature Flags
| Flag | Purpose | Default |
|------|---------|---------|
| `enable_new_feature` | Controls visibility | off |

### Rollback Plan
[How to safely revert if something goes wrong]

---

## 7. Open Questions
| Question | Owner | Due Date | Resolution |
|----------|-------|----------|------------|
| [Unresolved question] | [Name] | [Date] | [Pending] |

---

## 8. Timeline
| Phase | Duration | Deliverables |
|-------|----------|-------------|
| Design | 1 week | Mockups, user flows |
| Engineering — Backend | 2 weeks | API, data model, business logic |
| Engineering — Frontend | 2 weeks | UI implementation, integration |
| QA & Testing | 1 week | Test plan execution, bug fixes |
| Beta | 2 weeks | User feedback, iterations |
| Launch | 1 day | Feature flag flip, monitoring |

---

## Appendix
### Revision History
| Date | Author | Change |
|------|--------|--------|
| [Date] | [Name] | Initial draft |
```

## PRD Writing Best Practices

### DO
- **Start with the problem**, not the solution
- **Be specific** about metrics — "improve engagement" is vague, "increase 7-day retention from 30% to 45%" is actionable
- **Prioritize ruthlessly** — P0 is MVP, everything else can wait
- **Include acceptance criteria** — how do you know a requirement is met?
- **Name the risks** — what could go wrong and what's the mitigation?
- **Keep it living** — update status and revision history as things change

### DON'T
- Don't describe implementation details (that's for the tech spec)
- Don't include every edge case (link to a separate spec for complex flows)
- Don't write a PRD for trivial changes (bug fixes, copy updates)
- Don't skip the "Why Now?" — it's the most important justification
- Don't forget to include open questions — unknowns are valuable to surface

## When to Write a PRD

| Scenario | PRD? | Alternative |
|----------|------|-------------|
| New feature (>1 sprint) | ✅ Full PRD | - |
| Feature enhancement | ✅ Lightweight PRD | - |
| Bug fix | ❌ | Issue/ticket description |
| Tech debt / refactor | ❌ | RFC or tech spec |
| Experiment / A-B test | ⚠️ Mini PRD | Experiment brief |
| Infrastructure change | ❌ | RFC or ADR |

## RICE Prioritization Framework

Score features to decide what to build:

| Factor | Description | Scale |
|--------|-------------|-------|
| **R**each | How many users impacted per quarter | Number (e.g., 5000) |
| **I**mpact | Effect on each user (minimal→massive) | 0.25, 0.5, 1, 2, 3 |
| **C**onfidence | How sure are we about estimates | 50%, 80%, 100% |
| **E**ffort | Person-months to build | Number (e.g., 2) |

```
RICE Score = (Reach × Impact × Confidence) / Effort
```

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---------|-------|--------|------------|--------|------|
| Search filters | 5000 | 2 | 80% | 1 | 8000 |
| Export to PDF | 2000 | 1 | 100% | 0.5 | 4000 |
| Dark mode | 3000 | 0.5 | 100% | 2 | 750 |

Higher RICE = build first.

## Checklist

- [ ] Problem statement is specific (who, what, how often, impact)
- [ ] Success metrics are measurable with current tools
- [ ] User stories cover all personas
- [ ] Requirements have acceptance criteria
- [ ] P0 vs P1 vs P2 priorities are clear
- [ ] Edge cases and error states documented
- [ ] Technical approach outlined (not detailed — that's the tech spec)
- [ ] Timeline includes design, eng, QA, and rollout phases
- [ ] Open questions have owners and due dates
- [ ] Stakeholders have reviewed and provided feedback
