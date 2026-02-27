# Time Tracking & Management

Expert guidance for effective time tracking, billing practices, and productivity analysis for freelancers and consultants.

## When to Activate

Activate when the user:
- Discusses time tracking, timesheets, or hour logging
- Wants to set up projects with billing rates
- Needs help with timesheet generation or billable hour analysis
- Asks about time management best practices for freelancers

## Billable Rate Guidelines

### Setting Rates
| Experience | Suggested Range (USD) | Notes |
|-----------|----------------------|-------|
| Junior (0-2 yr) | $50-80/hr | Focus on building portfolio |
| Mid-level (2-5 yr) | $80-150/hr | Specialized skills command premium |
| Senior (5+ yr) | $150-300/hr | Strategic work, architecture |
| Expert/Niche | $250-500/hr | Rare skills, critical systems |

### Rate Calculation Formula
```
Annual Target / (52 weeks * Billable Hours per Week) = Hourly Rate

Example:
$150,000 / (52 * 25 billable hrs) = $115/hr
```

**Rule of thumb**: Only 60-70% of work hours are billable. Account for admin, marketing, learning.

## Time Entry Best Practices

### Description Format
Write descriptions that make sense on an invoice:

| Bad | Good |
|-----|------|
| "Worked on code" | "Implemented user authentication API endpoints" |
| "Meetings" | "Sprint planning meeting with engineering team" |
| "Bug fix" | "Fixed checkout page timeout error affecting mobile users" |
| "Research" | "Evaluated PostgreSQL vs MongoDB for reporting module" |

### Granularity
- **Minimum entry**: 15 minutes (standard billing increment)
- **Ideal entry**: 30-120 minutes (focused work blocks)
- **Maximum entry**: 4 hours (break longer sessions up)

### Tagging Strategy
Use consistent tags for analysis:
- **Activity type**: `development`, `design`, `meeting`, `review`, `research`, `admin`
- **Billing**: `billable`, `internal`, `pro-bono`
- **Priority**: `urgent`, `maintenance`, `feature`

## Timesheet Generation

### Weekly Timesheet Workflow
1. At week's end, generate timesheet: `time_timesheet` with Monday-Sunday range
2. Review for missing entries (compare against calendar)
3. Check for entries without descriptions (add them)
4. Verify billable/non-billable is correct
5. Export or share with client

### Monthly Invoice Workflow
1. Generate monthly timesheet for client
2. Cross-reference with project scope/contract
3. Create invoice using the invoice plugin
4. Attach timesheet as supporting documentation

## Productivity Analysis

### Weekly Review Questions
- Total hours tracked vs target?
- Billable ratio (billable hours / total hours)?
- Top 3 projects by time spent?
- Any projects over budget?
- Untracked time gaps?

### Healthy Metrics
| Metric | Target | Warning |
|--------|--------|---------|
| Billable ratio | 60-75% | < 50% or > 85% |
| Hours/week | 30-40 | > 50 (burnout risk) |
| Avg session | 45-90 min | < 15 min (context switching) |
| Projects/week | 2-4 | > 6 (too scattered) |

### Common Time Leaks
1. **Email & Slack** — batch into 2-3 check times per day
2. **Context switching** — group similar tasks together
3. **Meetings without outcomes** — decline or shorten
4. **Scope creep** — track "extras" separately to justify rate increases
5. **Admin work** — automate or batch weekly

## Integration with Other Plugins

### time-tracker + invoice
1. Track time on project → Generate timesheet → Create invoice with matching hours
2. Use project hourly_rate for consistent billing
3. Timesheet serves as invoice backup documentation

### time-tracker + local-crm
1. Match project clients with CRM contacts
2. Use time data in deal negotiations ("Last project was 40 hours")
3. Log follow-ups as non-billable time entries
