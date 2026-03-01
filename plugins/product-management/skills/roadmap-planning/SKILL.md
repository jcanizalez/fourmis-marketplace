---
description: When the user asks about product roadmaps, quarterly planning, OKRs, feature prioritization, product strategy, release planning, milestone planning, or building a product roadmap
---

# Roadmap Planning

A product roadmap communicates what you're building, when, and why. It aligns the team on priorities and gives stakeholders visibility into the product direction.

## Roadmap Types

| Type | Audience | Time Horizon | Detail Level |
|------|----------|-------------|--------------|
| **Strategic** | Executives, board | 6-12 months | Themes and goals, no dates |
| **Release** | Engineering, PM | 1-3 months | Features with target releases |
| **Sprint** | Dev team | 2-4 weeks | Stories and tasks |

### Choose the Right Format

| Situation | Format |
|-----------|--------|
| Board presentation | Theme-based, no dates |
| Engineering planning | Feature-based with milestones |
| Customer communication | Outcome-based ("what you'll be able to do") |
| Internal alignment | Now / Next / Later |

## Now / Next / Later Roadmap

The simplest and most flexible format:

```markdown
## Product Roadmap — Q1 2026

### 🔵 NOW (This Sprint / This Month)
Actively building. Committed. High confidence.

- **User onboarding redesign**
  Goal: Reduce drop-off from 40% to 20%
  Status: In development (Sprint 12)

- **API rate limiting**
  Goal: Prevent abuse, maintain SLA for all customers
  Status: In review

### 🟡 NEXT (Next 1-2 Months)
Planned and scoped. Ready to start when NOW items ship.

- **Team collaboration features**
  Goal: Enable shared workspaces for team plans
  Dependencies: Auth system supports team roles

- **Export to PDF/CSV**
  Goal: Users can share reports outside the app
  Dependencies: None

### 🔴 LATER (2-4 Months)
Direction is clear, details TBD. Subject to change.

- **Mobile app (iOS)**
  Goal: Core workflows accessible on mobile
  Dependencies: API stabilization, design system

- **Integrations marketplace**
  Goal: Connect with Slack, Jira, GitHub
  Dependencies: Webhook infrastructure

### 🧊 ICEBOX (Ideas — Not Planned)
Interesting ideas we're not pursuing yet.

- AI-powered suggestions
- White-label / custom branding
- Offline mode
```

## OKR-Aligned Roadmap

Tie features directly to business objectives:

```markdown
## Q1 2026 Roadmap — Aligned to OKRs

### Objective 1: Increase user retention
| Key Result | Target | Feature | Status |
|-----------|--------|---------|--------|
| 7-day retention from 30% to 45% | +15pp | Onboarding redesign | In progress |
| Daily active users from 5K to 8K | +60% | Push notifications | Next |
| Churn rate from 8% to 5% | -3pp | Win-back email campaign | Next |

### Objective 2: Expand into team use cases
| Key Result | Target | Feature | Status |
|-----------|--------|---------|--------|
| 100 teams onboarded | 100 | Team workspaces | Planned |
| Team plan conversion 5% | 5% | Upgrade prompts in collab flow | Later |
| NPS for team features > 40 | 40 | Shared dashboards | Later |

### Objective 3: Improve platform reliability
| Key Result | Target | Feature | Status |
|-----------|--------|---------|--------|
| API uptime 99.95% | 99.95% | Rate limiting + circuit breakers | In progress |
| p95 latency < 200ms | 200ms | Query optimization | Next |
| Zero data loss incidents | 0 | Backup automation | Planned |
```

## Feature Prioritization Frameworks

### RICE Scoring

```
RICE = (Reach × Impact × Confidence) / Effort
```

| Feature | Reach | Impact | Confidence | Effort | RICE | Rank |
|---------|-------|--------|------------|--------|------|------|
| Search filters | 5000 | 2 | 80% | 1 | 8000 | 1 |
| Team workspaces | 500 | 3 | 60% | 3 | 300 | 2 |
| Export to PDF | 2000 | 1 | 100% | 0.5 | 4000 | — |
| Dark mode | 3000 | 0.5 | 100% | 2 | 750 | — |

### Impact/Effort Matrix

```
          Low Effort          High Effort
         ┌─────────────────┬─────────────────┐
High     │   QUICK WINS    │   BIG BETS      │
Impact   │   ★ Do first    │   ★ Plan next   │
         │                 │                 │
         │ - Search filters│ - Team features │
         │ - Export PDF    │ - Mobile app    │
         ├─────────────────┼─────────────────┤
Low      │   FILL-INS      │   AVOID         │
Impact   │   ★ If time     │   ★ Don't do    │
         │                 │                 │
         │ - Dark mode     │ - White label   │
         │ - Tooltips      │ - Offline mode  │
         └─────────────────┴─────────────────┘
```

### MoSCoW Method

For a specific release or deadline:

| Category | Rule | Example |
|----------|------|---------|
| **Must Have** | Product fails without it | Login, core CRUD, error handling |
| **Should Have** | Important but workaround exists | Search, filters, bulk actions |
| **Could Have** | Nice to have, low effort | Dark mode, keyboard shortcuts |
| **Won't Have (this time)** | Explicitly out of scope | Mobile app, AI features |

## Milestone Planning

### Feature Milestone Template

```markdown
## Milestone: Team Collaboration v1

**Target Date:** March 15, 2026
**Owner:** [PM Name]
**Eng Lead:** [Name]
**Status:** 🟡 On Track

### Scope
- [x] Team creation and invitations
- [x] Shared workspaces
- [ ] Role-based permissions (In Progress)
- [ ] Team dashboard (Not Started)
- [ ] Activity feed (Not Started)

### Progress
| Week | Planned | Actual | Notes |
|------|---------|--------|-------|
| W1 | Team CRUD API | ✅ Done | Ahead of schedule |
| W2 | Invitations flow | ✅ Done | |
| W3 | Shared workspaces | ✅ Done | |
| W4 | Permissions | 🔵 In Progress | Auth refactor took extra day |
| W5 | Dashboard + Feed | ⬜ Not Started | |
| W6 | QA + Buffer | ⬜ Not Started | |

### Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Permissions more complex than estimated | Medium | High | Started design early |
| QA finds blocking bugs | Low | Medium | Testing in parallel |

### Dependencies
- Design: Team dashboard mockups (Due W3) ✅
- Backend: Auth service supports team roles (Due W1) ✅
- External: Email service capacity for invitations ✅
```

## Release Planning

### Release Checklist

```markdown
## Release: v2.4.0 — Team Collaboration

### Pre-Release
- [ ] All features merged to main
- [ ] Release candidate deployed to staging
- [ ] QA sign-off on all stories
- [ ] Performance benchmarks pass (p95 < 200ms)
- [ ] Security review complete
- [ ] Database migrations tested on staging data
- [ ] Feature flags configured
- [ ] Rollback plan documented

### Release Day
- [ ] Deploy to production (off-peak hours)
- [ ] Feature flags enabled for beta users (10%)
- [ ] Monitor error rates for 30 minutes
- [ ] Check key metrics (latency, error rate, conversion)
- [ ] Expand to 50%, then 100%

### Post-Release
- [ ] Monitor metrics for 24 hours
- [ ] Announce to customers (changelog, email)
- [ ] Update documentation
- [ ] Close sprint/milestone
- [ ] Schedule retrospective
```

## Roadmap Communication

### To Executives

```
"In Q1, we're focused on retention and team growth. We expect
onboarding improvements to drive 7-day retention from 30% to 45%,
and team features to onboard our first 100 teams. We have high
confidence in the retention work (design is complete) and medium
confidence on team features (depends on auth refactor)."
```

### To Customers

```
"Here's what's coming:
- This month: Faster onboarding experience
- Next month: Team workspaces — collaborate with your team
- Coming soon: Export reports to PDF and CSV

We'd love your feedback on what matters most to you."
```

### To Engineering

```
"Sprint 12-13: Onboarding redesign (24 pts, 2 sprints)
Sprint 14-15: Team collaboration MVP (40 pts, 2 sprints)
Sprint 16: Export features + tech debt (30 pts, 1 sprint)

Total: 94 points over 5 sprints. Velocity is 35 pts/sprint,
so we have 175 total capacity — leaving 81 points for bugs,
support, and unplanned work (46% buffer)."
```

## Checklist

- [ ] Roadmap format matches the audience (strategic vs tactical)
- [ ] Features tied to business outcomes or OKRs
- [ ] Prioritized using a framework (RICE, Impact/Effort, MoSCoW)
- [ ] NOW items are committed, NEXT items are planned, LATER is directional
- [ ] Dependencies identified and tracked
- [ ] Risks documented with mitigations
- [ ] Milestones have clear scope, dates, and owners
- [ ] Stakeholders understand confidence levels (not all items are certain)
- [ ] Roadmap is reviewed and updated monthly (not set-and-forget)
