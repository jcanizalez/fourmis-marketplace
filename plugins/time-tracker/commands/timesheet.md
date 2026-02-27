---
name: timesheet
description: Generate a timesheet report for a date range — view hours, earnings, and project breakdown
allowed-tools: time_timesheet, time_report, time_list_projects
---

# /timesheet — Generate Timesheet Report

Generate detailed timesheets and summary reports for billing and review.

## Usage

```
/timesheet                    # This week's timesheet
/timesheet last week          # Last week's timesheet
/timesheet this month         # Current month
/timesheet 2026-02-01 2026-02-28  # Custom date range
/timesheet [project name]     # Filtered by project
```

## Examples

```
/timesheet
/timesheet last week
/timesheet this month for "Acme Corp"
/timesheet 2026-01-01 2026-01-31 billable only
```

## Process

1. Parse the date range from natural language:
   - "this week" = Monday to today
   - "last week" = previous Monday to Sunday
   - "this month" = 1st of current month to today
   - "last month" = 1st to last day of previous month
   - Explicit dates = use as-is
2. Generate timesheet with time_timesheet
3. Also generate project summary with time_report for the same period
4. Present both views:
   - **Detailed timesheet**: Day-by-day entries with hours and amounts
   - **Project summary**: Per-project totals with billable amounts
5. Show totals: total hours, billable hours, total earnings

## Notes
- Billable amounts require hourly_rate on the project
- Use "billable only" modifier to exclude non-billable entries
- Suggest creating an invoice after reviewing the timesheet
