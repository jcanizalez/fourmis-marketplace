---
name: timer
description: Quick timer control — start, stop, or check your current timer
allowed-tools: time_start, time_stop, time_status, time_list_projects
---

# /timer — Quick Timer Control

Start, stop, or check your running timer with a simple command.

## Usage

```
/timer                          # Check current timer status
/timer start [project] [desc]   # Start timer on a project
/timer stop                     # Stop the running timer
```

## Examples

```
/timer
/timer start "Website Redesign" "Implementing contact form"
/timer start 3 "Bug fixes"
/timer stop
```

## Process

1. **No arguments or "status"**: Check if a timer is running with time_status
2. **"start" with project**: Find the project (by name or ID), then start timer with time_start
   - If project name is ambiguous, list matching projects and ask the user to pick
   - If no project found, offer to create one
3. **"stop"**: Stop the running timer with time_stop and show the logged entry

## Notes
- Only one timer can run at a time
- Timer persists across sessions — it won't be lost if Claude Code restarts
- Show elapsed time in human-readable format (e.g. "2h 15m")
