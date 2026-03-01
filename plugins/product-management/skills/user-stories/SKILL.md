---
description: When the user asks about writing user stories, acceptance criteria, story mapping, splitting stories, INVEST criteria, epics, story points, or breaking down features into stories
---

# User Stories

User stories describe a feature from the perspective of the user. They're the building blocks of agile planning — small enough to estimate, clear enough to build, testable enough to verify.

## Story Format

### Standard Format

```
As a [type of user],
I want to [action/goal],
so that [benefit/value].
```

### Examples

**Good stories:**
```
As a free-tier user,
I want to see a comparison of free vs paid features,
so that I can decide whether to upgrade.

As a team admin,
I want to invite members via email link,
so that I can onboard new teammates without IT involvement.

As a mobile user,
I want to save my progress offline,
so that I can continue working during my commute.
```

**Bad stories (and why):**
```
❌ "As a user, I want the system to be fast."
   → Not actionable. How fast? Measured how? Rewrite as:
   ✅ "As a user, I want search results to load in under 500ms,
       so that I can find information without waiting."

❌ "As a developer, I want to refactor the auth module."
   → No user value. This is a tech task, not a story. Track it as:
   ✅ Tech task: "Refactor auth module to reduce login latency by 50%"

❌ "As a user, I want the app to work."
   → Too vague. Break down into specific capabilities.
```

## INVEST Criteria

Every story should pass INVEST:

| Criterion | Question | Example (Good vs Bad) |
|-----------|----------|----------------------|
| **I**ndependent | Can it be built without other stories? | ✅ "Add search" / ❌ "Add search results page" (depends on search) |
| **N**egotiable | Can scope be adjusted? | ✅ "Filter by date" / ❌ "Use ElasticSearch for filtering" (prescriptive) |
| **V**aluable | Does the user get value? | ✅ "Export report as PDF" / ❌ "Add PDF library" (no direct value) |
| **E**stimable | Can the team estimate it? | ✅ Clear scope / ❌ "Improve performance" (too vague) |
| **S**mall | Fits in a single sprint? | ✅ 1-5 points / ❌ 13+ points (epic, needs splitting) |
| **T**estable | Can you write acceptance criteria? | ✅ Clear pass/fail / ❌ "Make it intuitive" (subjective) |

## Acceptance Criteria

### Given-When-Then Format (Preferred)

```markdown
### Story: User can filter products by price range

**Acceptance Criteria:**

1. Given I am on the products page,
   When I set the minimum price to $50 and maximum to $100,
   Then only products priced between $50-$100 are displayed.

2. Given I have applied a price filter,
   When I clear the filter,
   Then all products are displayed again.

3. Given no products exist in the selected price range,
   When I apply the filter,
   Then I see "No products found" with a suggestion to adjust the range.

4. Given I have applied a price filter,
   When I also apply a category filter,
   Then both filters are combined (AND logic).
```

### Checklist Format (Simple)

```markdown
### Story: User can reset their password

**Acceptance Criteria:**
- [ ] "Forgot password" link visible on login page
- [ ] Email sent within 30 seconds of request
- [ ] Reset link expires after 1 hour
- [ ] Password must meet strength requirements (8+ chars, 1 uppercase, 1 number)
- [ ] User receives confirmation email after successful reset
- [ ] Old sessions are invalidated after password change
- [ ] Rate limited: max 3 reset requests per hour per email
```

## Story Mapping

Organize stories by user journey to ensure nothing is missed:

```
User Journey (left to right):
─────────────────────────────────────────────────────

Discover    →    Sign Up    →    Onboard    →    Use Core    →    Invite Team
  │                │               │              │                 │
  ├─ Landing page  ├─ Email form   ├─ Welcome     ├─ Create item   ├─ Send invite
  ├─ Pricing page  ├─ OAuth login  ├─ Setup wizard├─ Edit item     ├─ Accept invite
  ├─ Blog/SEO      ├─ Verify email ├─ First action├─ Delete item   ├─ Set permissions
  └─ Comparison    └─ Set password └─ Import data └─ Search/filter └─ Team dashboard

───── MVP Line ─────────────────────────────────────
(Everything above ships first, below is Phase 2)

  └─ Video demo   └─ SSO/SAML    └─ Templates   └─ Bulk actions  └─ Audit log
```

### Story Map Template

```markdown
## Story Map: [Feature/Product]

### Journey Steps
1. [Step 1: Activity]
2. [Step 2: Activity]
3. [Step 3: Activity]

### Stories by Step

| Step | MVP (P0) | Phase 2 (P1) | Future (P2) |
|------|----------|-------------|-------------|
| Step 1 | Story A, Story B | Story C | Story D |
| Step 2 | Story E | Story F, Story G | Story H |
| Step 3 | Story I, Story J | Story K | Story L |

### Release Slices
- **Slice 1 (MVP):** Stories A, B, E, I, J
- **Slice 2:** Stories C, F, G, K
- **Slice 3:** Stories D, H, L
```

## Splitting Large Stories

When a story is too big (>8 points), split it using these patterns:

### Split by Workflow Step

```
Original: "As a user, I want to manage my profile"

Split into:
1. "As a user, I want to view my profile details" (2 pts)
2. "As a user, I want to edit my name and bio" (2 pts)
3. "As a user, I want to upload a profile photo" (3 pts)
4. "As a user, I want to change my password" (3 pts)
5. "As a user, I want to delete my account" (3 pts)
```

### Split by Data Variation

```
Original: "As a user, I want to export my data"

Split into:
1. "... export as CSV" (2 pts)
2. "... export as PDF" (3 pts)
3. "... export as JSON" (1 pt)
```

### Split by Interface

```
Original: "As a user, I want to receive notifications"

Split into:
1. "... receive in-app notifications" (3 pts)
2. "... receive email notifications" (3 pts)
3. "... receive push notifications" (5 pts)
4. "... configure notification preferences" (3 pts)
```

### Split by Acceptance Criteria

```
Original: "As a user, I want to search for products"

Split into:
1. "... search by keyword" (2 pts)
2. "... filter results by category" (2 pts)
3. "... sort results by price/date/relevance" (2 pts)
4. "... see search suggestions as I type" (5 pts)
```

### Split by Happy Path vs Edge Cases

```
Original: "As a user, I want to upload a file"

Split into:
1. "... upload a single file (happy path)" (3 pts)
2. "... see progress indicator during upload" (2 pts)
3. "... handle upload failure with retry" (2 pts)
4. "... validate file type and size limits" (2 pts)
5. "... upload multiple files at once" (3 pts)
```

## Epic → Story → Task Hierarchy

```
EPIC: User Authentication System
├── STORY: User can register with email
│   ├── TASK: Create registration API endpoint
│   ├── TASK: Build registration form component
│   ├── TASK: Add email validation
│   └── TASK: Write unit tests
├── STORY: User can log in with email/password
│   ├── TASK: Create login API endpoint
│   ├── TASK: Build login form component
│   ├── TASK: Implement JWT token management
│   └── TASK: Write integration tests
├── STORY: User can reset password via email
│   ├── TASK: Create password reset flow
│   ├── TASK: Build email template
│   └── TASK: Add rate limiting
└── STORY: User can log in with Google OAuth
    ├── TASK: Configure Google OAuth credentials
    ├── TASK: Implement OAuth callback handler
    └── TASK: Map OAuth profile to user record
```

## Story Estimation Quick Reference

| Points | Complexity | Example |
|--------|-----------|---------|
| 1 | Trivial — copy change, config update | Change button label |
| 2 | Simple — one file, clear approach | Add a new field to a form |
| 3 | Medium — a few files, well-understood | CRUD for a new entity |
| 5 | Complex — multiple components, some unknowns | Search with filters and pagination |
| 8 | Large — significant effort, needs design | User onboarding wizard |
| 13 | Epic — too big for one sprint, split it | Full authentication system |

## Checklist

- [ ] Story follows "As a... I want... so that..." format
- [ ] Passes INVEST criteria
- [ ] Has specific, testable acceptance criteria
- [ ] Estimated (1-8 points — split if larger)
- [ ] Prioritized (P0/P1/P2)
- [ ] Independent — can be built without blocking others
- [ ] User value is clear (not a tech task disguised as a story)
- [ ] Edge cases and error states considered in acceptance criteria
