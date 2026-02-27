# Client Onboarding Checklist

Structured process for onboarding new freelance clients. Activate when setting up a new client relationship.

## When to Activate

Activate when the user:
- Has a new client to set up
- Asks about onboarding process or client setup
- Mentions "new client", "just signed", "onboard", "client setup"

## Onboarding Checklist

### Pre-Project Setup
- [ ] Collect client information (name, email, company, phone)
- [ ] Signed contract or agreement in place
- [ ] Payment terms agreed (Net 15/30/45/60, milestone-based, retainer)
- [ ] Project scope documented
- [ ] Communication channels established (email, Slack, etc.)
- [ ] Point of contact identified

### System Setup (Using Freelancer Trifecta)

#### 1. CRM Contact
Create with `crm_create_contact`:
- Full name and email (required)
- Company name
- Phone number
- Tags: "client", industry, source (referral, inbound, etc.)
- Notes: how they found you, project context

#### 2. CRM Deal
Create with `crm_create_deal`:
- Title: project name
- Value: agreed project value or monthly retainer
- Stage: "won" (if contract signed)
- Notes: scope summary, key milestones

#### 3. Invoice Client
Create with `invoice_create_client`:
- Same name and email as CRM contact
- Company and billing address
- Will be used for all future invoices

#### 4. Time Tracking Project
Create with `time_create_project`:
- Project name (e.g., "Acme Corp — Website Redesign")
- Client name
- Hourly rate (from agreement)
- Currency

#### 5. Initial Follow-up
Schedule with `crm_schedule_follow_up`:
- Due: 2-3 business days after signing
- Description: "Project kickoff — confirm scope, timeline, and first milestone"

#### 6. Log Onboarding
Log with `crm_log_interaction`:
- Type: "meeting" or "email"
- Notes: "Client onboarded. Contract signed. Project: [name]. Rate: $X/hr."

### Post-Onboarding
- [ ] Send welcome email with project timeline
- [ ] Share communication preferences (response time, office hours)
- [ ] Set up project repository/workspace
- [ ] Schedule kickoff meeting
- [ ] Start timer on first work session

## Red Flags During Onboarding

| Red Flag | Risk | Action |
|----------|------|--------|
| No signed contract | Payment disputes | Do not start work |
| Unclear scope | Scope creep | Document scope before proceeding |
| "Can you start today?" | Unrealistic expectations | Set realistic timeline |
| No budget discussed | Low/no payment | Discuss rates upfront |
| Multiple decision-makers | Slow approvals | Identify single point of contact |
| "We'll figure out payment later" | Non-payment | Get terms in writing first |

## Quick Onboard Checklist

For returning clients or small projects:
1. Create/verify CRM contact exists
2. Create time tracking project with rate
3. Create CRM deal with project value
4. Schedule kickoff follow-up
5. Start timer

Time: 5 minutes with the /onboard command.
