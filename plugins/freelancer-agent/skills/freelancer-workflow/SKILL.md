# Freelancer Business Workflow

End-to-end workflow guidance for managing a freelance business — from lead acquisition through project delivery to payment collection.

## When to Activate

Activate when the user:
- Asks about freelancing workflows or business processes
- Wants to set up their freelance business systems
- Needs guidance on the client lifecycle
- Mentions "freelance workflow", "business process", "client lifecycle"

## The Freelance Business Lifecycle

```
Lead Acquisition
      |
Client Onboarding (/onboard)
      |
Project Setup (CRM deal + time project + invoice client)
      |
Active Work (time tracking + follow-ups)
      |
Billing Cycle (/bill)
      |
Payment Collection (invoice tracking)
      |
Project Completion (archive + review)
      |
Relationship Maintenance (follow-ups + referrals)
```

## Weekly Workflow

### Monday: Planning
1. Check business dashboard (/biz)
2. Review follow-ups due this week
3. Check outstanding invoices
4. Plan billable work for the week
5. Start timer on first project

### Daily: Execution
1. Start timer when beginning work
2. Stop timer when switching tasks or ending
3. Add descriptions to all time entries
4. Check for follow-ups due today
5. Respond to client communications

### Friday: Review
1. Review week's timesheet (/timesheet this week)
2. Fill in any missing time entries
3. Send weekly update to active clients
4. Schedule follow-ups for next week
5. Create invoices if at billing milestone

### Monthly: Billing
1. Generate timesheets for each active client
2. Create and send invoices (/bill)
3. Follow up on overdue invoices
4. Review pipeline and revenue (/biz)
5. Update deal stages in CRM

## Key Metrics to Track

| Metric | Formula | Target |
|--------|---------|--------|
| Billable utilization | Billable hours / Total hours | 65-75% |
| Average rate | Total revenue / Billable hours | Above market rate |
| Collection period | Days between invoice sent and paid | Under 30 days |
| Pipeline coverage | Pipeline value / Monthly revenue target | 3x or more |
| Client retention | Repeat clients / Total clients | Above 60% |

## Tool Mapping

| Business Task | Plugin | Key Tools |
|--------------|--------|-----------|
| Track new lead | local-crm | crm_create_contact, crm_create_deal |
| Log client meeting | local-crm | crm_log_interaction |
| Schedule follow-up | local-crm | crm_schedule_follow_up |
| Start work session | time-tracker | time_start, time_stop |
| Log past work | time-tracker | time_add |
| Generate timesheet | time-tracker | time_timesheet |
| Create invoice | invoice | invoice_create, invoice_export_html |
| Track payment | invoice | invoice_record_payment |
| Revenue report | invoice | invoice_report |
| Business overview | all three | crm_dashboard + time_report + invoice_report |

## Common Scenarios

### New Client Signs
1. Onboard: create CRM contact + invoice client + time project
2. Create deal in CRM with project value
3. Log signed-contract interaction
4. Schedule kickoff follow-up
5. Start timer when work begins

### End of Billing Period
1. Pull timesheet for the period
2. Review hours and descriptions
3. Create invoice from timesheet data
4. Export HTML, print to PDF
5. Send to client, mark as "sent"
6. Log "invoice sent" interaction in CRM
7. Schedule payment follow-up (Net 30 or per terms)

### Client Goes Silent
1. Check last interaction date in CRM
2. Review any outstanding invoices
3. Check if follow-up is overdue
4. Send a check-in message
5. Log the interaction
6. Schedule next follow-up
