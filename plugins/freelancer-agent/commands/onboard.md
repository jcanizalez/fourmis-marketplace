---
name: onboard
description: Onboard a new client — create CRM contact, invoice client, time project, and deal in one flow
allowed-tools: crm_create_contact, crm_search_contacts, crm_create_deal, crm_schedule_follow_up, crm_log_interaction, invoice_create_client, invoice_search_clients, time_create_project, time_list_projects
---

# /onboard — Client Onboarding

Set up a new client across all business systems in one command.

## Usage

```
/onboard [client name or description]
```

## Examples

```
/onboard "Acme Corp - Sarah Johnson - website redesign at $150/hr"
/onboard "New client: Tech Startup, john@startup.com, API development"
/onboard
```

## Process

1. **Gather info** — Extract or ask for: name, email, company, project, rate
2. **Check duplicates** — Search CRM and invoice clients for existing records
3. **Create records** in all three systems:
   - CRM contact with tags and notes
   - Invoice client for billing
   - Time tracking project with hourly rate
4. **Set up deal** — Create CRM deal with project value and stage
5. **Log interaction** — Record the onboarding in CRM
6. **Schedule follow-up** — Kickoff meeting in 2-3 days
7. **Present summary** — Show all created records and next steps

## Required Information
- Client name (will ask if not provided)
- Email (will ask if not provided)
- Project name (will ask if not provided)

## Optional Information
- Hourly rate and currency
- Company name
- Phone number
- Project value (for CRM deal)
