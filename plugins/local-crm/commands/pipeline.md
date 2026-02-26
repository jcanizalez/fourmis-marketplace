---
name: pipeline
description: View the deal pipeline — see deals by stage, total values, and recent wins/losses
allowed-tools: crm_pipeline_report, crm_list_deals, crm_move_deal, crm_dashboard
---

# /pipeline

Show the deal pipeline report from the local CRM.

## Instructions

1. Run `crm_pipeline_report` to get the full pipeline breakdown
2. Present the stages table and key metrics prominently
3. If the user asks about a specific stage, use `crm_list_deals` with the stage filter
4. If the user wants to move a deal, use `crm_move_deal`

## Arguments

If arguments are provided, interpret them as:
- A stage name (e.g., `/pipeline proposal`) → show deals in that stage
- "dashboard" → show the full CRM dashboard instead

$ARGUMENTS
