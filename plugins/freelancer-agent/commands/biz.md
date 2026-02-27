---
name: biz
description: Business dashboard — quick overview of your freelance business status across CRM, time tracking, and invoicing
allowed-tools: crm_dashboard, crm_list_follow_ups, crm_pipeline_report, invoice_list, invoice_report, time_status, time_report
---

# /biz — Freelance Business Dashboard

Get a complete status overview of your freelance business.

## Usage

```
/biz                    # Full business overview
/biz pipeline           # Focus on deals pipeline
/biz revenue            # Focus on revenue and invoicing
/biz week               # This week's summary
```

## What This Shows

1. **Active Timer** — What you're currently working on and elapsed time
2. **Action Items** — Overdue follow-ups, unpaid invoices, deals needing attention
3. **Pipeline** — Active deals by stage with total value
4. **This Week** — Hours tracked, billable ratio, revenue
5. **Outstanding Invoices** — Unpaid invoices with amounts and age
6. **Follow-ups Due** — Contacts needing attention today/this week

## Process

1. Check timer status with `time_status`
2. Get follow-ups with `crm_list_follow_ups`
3. Get outstanding invoices with `invoice_list` (filter: status not paid)
4. Get pipeline with `crm_pipeline_report`
5. Get weekly hours with `time_report`
6. Get revenue data with `invoice_report`
7. Compile into a structured dashboard

## Priority

Action items should be ordered by urgency:
1. Overdue invoices (cash flow)
2. Overdue follow-ups (relationship risk)
3. Deals needing advancement (pipeline health)
4. Upcoming deadlines
