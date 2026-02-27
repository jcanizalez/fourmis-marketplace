# freelancer-agent

> Freelancer business agent profile for Claude Code — orchestrates local-crm, invoice, and time-tracker into end-to-end freelancing workflows.

## What Is This?

A **coordination plugin** that bundles the freelancer trifecta into unified business workflows:

- **[local-crm](../local-crm)** — client management (contacts, deals, follow-ups, pipeline)
- **[invoice](../invoice)** — invoicing (create, track, export, payments)
- **[time-tracker](../time-tracker)** — time tracking (timers, entries, timesheets, reports)

This plugin adds the **glue** — agents, skills, and commands that orchestrate these tools into complete freelancer workflows: onboard clients, track time, bill clients, and monitor business health.

## Components

| Type | Count | Details |
|------|-------|---------|
| Agents | 3 | freelancer, client-onboarder, billing-assistant |
| Skills | 3 | freelancer-workflow, pricing-strategy, client-onboarding |
| Commands | 4 | /biz, /onboard, /bill, /freelance |

No MCP server — this is a pure orchestration layer.

## Prerequisites

For full functionality, install the upstream plugins:

```bash
# Client management (MCP server, no setup needed)
fourmis plugin install local-crm

# Invoicing (MCP server, no setup needed)
fourmis plugin install invoice

# Time tracking (MCP server, no setup needed)
fourmis plugin install time-tracker
```

All three are zero-config, zero-cloud, SQLite-based plugins. No API keys or accounts needed.

## Commands

### `/biz` — Business Dashboard
Get a complete status overview of your freelance business.

```
/biz                    # Full overview
/biz pipeline           # Focus on deals
/biz revenue            # Focus on money
```

Shows: active timer, action items, pipeline, weekly hours, outstanding invoices, follow-ups due.

### `/onboard` — Client Onboarding
Set up a new client across all three systems in one flow.

```
/onboard "Acme Corp - Sarah Johnson - website redesign at $150/hr"
```

Creates: CRM contact, invoice client, time project, deal, follow-up.

### `/bill` — Billing Workflow
Turn tracked time into professional invoices.

```
/bill "Acme Corp"               # Bill a specific client
/bill this month                # Bill all clients
/bill last month for "Acme"     # Specific client + period
```

Pipeline: timesheet review, invoice creation, HTML export, CRM logging.

### `/freelance` — General Assistant
Ask any business question.

```
/freelance "How much did I bill last quarter?"
/freelance "Which clients owe me money?"
/freelance "What's my utilization rate?"
```

## Agents

### freelancer
The main orchestrator. Handles daily check-ins, business health reports, and decision support. Shows action items, pipeline status, and financial overview. Perfect for "how's my business doing?" questions.

### client-onboarder
Guided client setup across all three systems. Collects information, checks for duplicates, creates records, and schedules follow-ups. Reduces client setup from 15 minutes to 2 minutes.

### billing-assistant
End-of-period billing specialist. Pulls timesheets, creates invoices with proper line items, exports HTML, and logs everything in CRM. Supports individual client billing and batch monthly billing.

## Skills

### freelancer-workflow
The complete freelance business lifecycle: lead acquisition through payment collection. Weekly workflow templates, key metrics, and tool mapping for each business task.

### pricing-strategy
Rate setting guidance with formulas, market ranges, and negotiation tactics. Covers hourly, fixed-price, and retainer models with proposal templates.

### client-onboarding
Structured onboarding checklist with red flags to watch for. Maps each step to specific tool calls across the trifecta.

## Architecture

```
freelancer-agent (this plugin)
├── Orchestration layer (agents, skills, commands)
│
├── Uses: local-crm (17 MCP tools)
│   └── Contacts, deals, follow-ups, pipeline, interactions
│
├── Uses: invoice (10 MCP tools)
│   └── Clients, invoices, payments, HTML export, reports
│
└── Uses: time-tracker (12 MCP tools)
    └── Projects, timers, entries, timesheets, reports
```

**Total MCP tools orchestrated**: 39 tools across 3 plugins.

## Example Workflows

### Morning Check-in
```
You: /biz

Freelancer Agent:
## Business Status — Feb 27, 2026

### Active Timer: None running

### Action Items
1. OVERDUE: Invoice #INV-202602-003 ($2,500) — 5 days overdue
2. DUE TODAY: Follow up with Sarah Johnson re: project kickoff
3. Pipeline: "API Integration" deal stuck in negotiation for 2 weeks

### This Week
- Hours: 24h 30m tracked
- Billable: 20h 15m (83% utilization)
- Revenue: $3,037.50

### Outstanding Invoices
- INV-202602-003: $2,500 (OVERDUE — 5 days)
- INV-202602-005: $1,800 (sent 3 days ago)
```

### New Client
```
You: /onboard "Tech Startup - john@startup.com - mobile app development at $175/hr"

Client Onboarder:
Created:
- CRM Contact: #42 — John (john@startup.com)
- Invoice Client: #15 — Tech Startup
- Time Project: #8 — Mobile App Development at $175/hr
- Deal: #12 — Mobile App Development (won)
- Follow-up: Feb 29 — Project kickoff call

Ready to start! Run: /timer start 8 "Initial setup"
```

### End of Month Billing
```
You: /bill this month

Billing Assistant:
## February 2026 Timesheets

### Acme Corp — Website Redesign
| Week | Hours | Amount |
|------|-------|--------|
| Feb 3-7 | 12.5h | $1,875.00 |
| Feb 10-14 | 15.0h | $2,250.00 |
| Feb 17-21 | 10.0h | $1,500.00 |
| Feb 24-28 | 8.5h | $1,275.00 |
Total: 46h — $6,900.00

Create invoice? [Yes]

Invoice #INV-202602-008 created — $6,900.00
HTML exported to: invoices/INV-202602-008.html
```

## The Freelancer Trifecta

```
┌─────────────────────────────────────────────┐
│           freelancer-agent                   │
│         (orchestration layer)                │
├──────────┬──────────────┬───────────────────┤
│ local-crm│   invoice    │  time-tracker     │
│ 17 tools │  10 tools    │   12 tools        │
│ Clients  │  Billing     │   Hours           │
│ Deals    │  Payments    │   Timesheets      │
│ Pipeline │  PDF Export  │   Reports         │
└──────────┴──────────────┴───────────────────┘
```

## License

MIT
