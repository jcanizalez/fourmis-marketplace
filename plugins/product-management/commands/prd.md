---
name: prd
description: Generate a comprehensive Product Requirements Document for a feature — includes problem statement, user stories, requirements, success metrics, technical approach, and timeline
allowed-tools: Read, Write, Glob, Grep
---

# /prd — PRD Generator

Generate a structured PRD for a feature based on a description or existing codebase context.

## Usage

```
/prd                                # Interactive — ask what to build
/prd "user authentication system"   # Generate PRD for a described feature
/prd --from-issue 123               # Generate PRD from a GitHub issue
/prd --lite                         # Lightweight PRD (for smaller features)
```

## Workflow

### Full PRD Mode (default)

1. **Understand the feature**: Read description, scan codebase for context
2. **Identify target users**: Who benefits and what's their pain point?
3. **Draft user stories**: Break feature into P0/P1/P2 stories with acceptance criteria
4. **Define requirements**: Functional + non-functional requirements
5. **Outline technical approach**: API changes, data model, dependencies
6. **Set success metrics**: Measurable outcomes tied to the feature
7. **Create timeline**: Phases from design through launch
8. **Flag open questions**: Unknowns that need resolution
9. **Output**: Complete PRD in markdown

### Lite PRD Mode (--lite)

Abbreviated format for smaller features (1-2 sprint scope):
- Problem + proposed solution (2-3 sentences each)
- User stories (P0 only)
- Acceptance criteria
- Estimated effort (t-shirt size)

## Output

```markdown
# PRD: [Feature Name]

**Author:** [Name] | **Status:** Draft | **Target:** [Date/Sprint]

## Problem Statement
[Who is affected, how often, what's the impact]

## Proposed Solution
[High-level approach]

## Success Metrics
| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|

## User Stories
### P0 — Must Have
- As a [user], I want to [action] so that [benefit]
  - AC: [Given/When/Then]

### P1 — Should Have
...

## Technical Approach
[Architecture, API changes, data model]

## Timeline
| Phase | Duration | Deliverables |
|-------|----------|-------------|

## Open Questions
| Question | Owner | Due |
|----------|-------|-----|
```

## Important

- PRDs define **what** and **why**, not **how** (implementation details go in tech specs)
- Always include measurable success metrics — if you can't measure it, you can't tell if it worked
- P0 requirements define the MVP — everything else is negotiable
- Open questions are valuable — surfacing unknowns early prevents surprises later
