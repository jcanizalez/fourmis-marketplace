---
name: bill
description: Billing workflow — generate timesheet, review hours, create invoice, and export for a client or period
allowed-tools: time_timesheet, time_list, time_list_projects, time_report, invoice_create_client, invoice_search_clients, invoice_create, invoice_get, invoice_list, invoice_export_html, crm_search_contacts, crm_log_interaction
---

# /bill — Billing Workflow

Turn tracked time into professional invoices.

## Usage

```
/bill [client or project]           # Bill a specific client
/bill this month                    # Bill all clients for current month
/bill last month                    # Bill all clients for last month
/bill "Acme Corp" last week         # Bill specific client for last week
```

## Examples

```
/bill "Acme Corp"
/bill this month
/bill last month for "Tech Startup"
```

## Process

1. **Identify period** — Parse date range from natural language
2. **Pull timesheet** — Generate timesheet for the period
3. **Review with user** — Show hours, descriptions, and amounts
4. **Create invoice** — After user approval, create with matching line items
5. **Export HTML** — Generate professional invoice file
6. **Log in CRM** — Record the billing interaction
7. **Present summary** — Invoice number, amount, next steps

## Billing Options
- **Single line item**: "Development services — [X] hours at $[rate]/hr"
- **Grouped by week**: One line per week
- **Detailed**: One line per time entry

Default: single summarized line item (cleanest for clients).

## Notes
- Always show timesheet before creating invoice
- Never auto-send — only create and export
- Suggest marking as "sent" after delivery
- Schedule payment follow-up based on terms (Net 30, etc.)
