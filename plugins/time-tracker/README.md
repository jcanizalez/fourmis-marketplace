# time-tracker

> Local-first time tracking for freelancers — start/stop timers, log hours per project, generate timesheets, and track billable earnings from Claude Code.

## Why?

Time tracking tools cost $10-30/month (Toggl, Harvest, Clockify Pro). This plugin gives you the core functionality — timers, project tracking, timesheets, and billing reports — for free, stored locally in SQLite.

Part of the **freelancer trifecta**: [local-crm](../local-crm) (clients) + [invoice](../invoice) (billing) + **time-tracker** (hours).

## Quick Start

```
/timer start "Website Redesign" "Building the contact form"
# ... work for a while ...
/timer stop
/timesheet this week
```

## Tools

| Tool | Purpose |
|------|---------|
| `time_create_project` | Create a new project with optional hourly rate |
| `time_list_projects` | List or search projects |
| `time_update_project` | Update project details or archive it |
| `time_start` | Start a timer (one at a time) |
| `time_stop` | Stop the running timer → creates time entry |
| `time_status` | Check if a timer is running and elapsed time |
| `time_add` | Manually add a past time entry |
| `time_list` | List time entries with filters |
| `time_delete` | Delete a time entry |
| `time_timesheet` | Generate timesheet for a date range |
| `time_report` | Project summary + weekly trend report |

## Commands

| Command | Description |
|---------|-------------|
| `/timer` | Quick timer control — start, stop, check status |
| `/timesheet` | Generate timesheet reports for any date range |

## Features

### Timer
- Start/stop with project and description
- Only one timer at a time (prevents double-tracking)
- Timer persists across restarts (stored in SQLite, not memory)
- Elapsed time shown in real-time

### Projects
- Name, client, description, hourly rate, currency
- Archive completed projects (hidden from default lists)
- Search by name, client, or description

### Time Entries
- Auto-created when timer stops
- Manual entry for retroactive logging
- Billable/non-billable classification
- Tags for categorization (comma-separated)

### Timesheets
- Date range filtering (daily, weekly, monthly, custom)
- Per-project filtering
- Billable amount calculation (hours × hourly rate)
- Day-by-day breakdown

### Reports
- Per-project summary (total hours, billable hours, earnings)
- Weekly trend (track hours over time)
- Entry count and project distribution

## Database Schema

```
projects
├── id, name, client, description
├── hourly_rate, currency
├── color, archived
└── created_at, updated_at

time_entries
├── id, project_id (FK)
├── description, start_time, end_time
├── duration_minutes, billable
├── tags
└── created_at, updated_at

active_timer (singleton table)
├── id = 1 (always)
├── project_id (FK)
├── description, start_time
└── tags
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TIMETRACKER_DB_DIR` | `./data` | Directory for SQLite database |

## Architecture

```
time-tracker/
├── .claude-plugin/plugin.json   # Plugin manifest
├── .mcp.json                    # MCP server config
├── src/
│   ├── db.ts                    # SQLite schema + operations
│   └── index.ts                 # MCP server (12 tools)
├── skills/
│   └── time-management/SKILL.md # Billing + productivity best practices
├── commands/
│   ├── timer.md                 # /timer — quick start/stop
│   └── timesheet.md             # /timesheet — reports
└── README.md
```

## Freelancer Trifecta

Use together for a complete freelancer workflow:

```
1. local-crm   → Track clients, deals, follow-ups
2. time-tracker → Log hours per project (this plugin)
3. invoice      → Generate professional invoices from tracked time
```

Workflow: Track time → Generate timesheet → Create invoice → Send to client

## License

MIT
