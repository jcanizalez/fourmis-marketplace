# Freelancer Pricing Strategy

Guidance for setting, communicating, and adjusting freelance rates. Activate when the user discusses pricing, proposals, rate setting, or negotiations.

## When to Activate

Activate when the user:
- Asks about setting hourly rates or project prices
- Needs help with a proposal or quote
- Wants to raise rates or negotiate pricing
- Mentions "pricing", "rates", "proposal", "quote", "negotiation"

## Pricing Models

### Hourly Rate
**Best for**: Ongoing work, uncertain scope, maintenance
**Formula**: (Annual target / 52 weeks / billable hours per week) * 1.3 overhead

| Experience | Web Dev | Design | Consulting |
|-----------|---------|--------|------------|
| Junior | $50-80 | $40-70 | $60-90 |
| Mid | $80-150 | $70-130 | $90-175 |
| Senior | $150-300 | $130-250 | $175-350 |
| Expert | $250-500+ | $200-400+ | $300-600+ |

**Track with**: time-tracker (`time_create_project` with hourly_rate)

### Fixed Price
**Best for**: Well-defined projects, products, deliverables
**Formula**: Estimated hours * hourly rate * 1.2-1.5 risk buffer

| Project Type | Typical Range | Risk Buffer |
|-------------|---------------|-------------|
| Landing page | $2,000-10,000 | 1.2x |
| Web app MVP | $10,000-50,000 | 1.4x |
| API integration | $3,000-15,000 | 1.3x |
| Design system | $5,000-25,000 | 1.3x |

**Track with**: invoice (`invoice_create` with fixed line items)

### Retainer
**Best for**: Ongoing relationships, predictable income
**Structure**: Fixed monthly fee for X hours, overflow at hourly rate

| Retainer Size | Monthly Hours | Typical Rate |
|--------------|---------------|--------------|
| Small | 10-20 hrs | 10-15% discount |
| Medium | 20-40 hrs | 15-20% discount |
| Large | 40+ hrs | 20-25% discount |

**Track with**: time-tracker (monthly timesheet) + invoice (recurring)

## Proposal Structure

```
## Proposal: [Project Name]
Prepared for [Client Name] — [Date]

### Understanding
[2-3 sentences showing you understand their problem]

### Approach
[How you'll solve it — phases, timeline]

### Deliverables
1. [Specific deliverable 1]
2. [Specific deliverable 2]
3. [Specific deliverable 3]

### Investment
Option A: [Budget option] — $X
Option B: [Recommended] — $Y
Option C: [Premium] — $Z

### Timeline
[Weeks/months with milestones]

### Terms
- 50% upfront, 50% on delivery (or per milestone)
- Net 15 payment terms
- Includes [X] rounds of revision
```

## Rate Negotiation

### When to Hold Firm
- Client has a large budget (enterprise, funded startup)
- Project requires specialized skills
- Timeline is tight (urgency premium)
- They contacted you (inbound demand)

### When to Flex
- Long-term relationship potential (retainer)
- Portfolio-building project
- Interesting technical challenge
- Referral potential

### Never Do
- Reduce rate without reducing scope
- Work for "exposure" or equity promises
- Discount more than 20% from your standard rate
- Accept scope creep without renegotiating

## Scope Creep Protection

1. **Document scope** in proposal with numbered deliverables
2. **Track time by category** using tags in time-tracker
3. **Flag out-of-scope requests** immediately
4. **Use change orders**: "Happy to add that! Here's the additional cost..."
5. **Review monthly**: compare actual hours vs estimated
