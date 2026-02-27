---
name: campaign
description: Plan a multi-piece content marketing campaign with calendar, briefs, and distribution strategy
allowed-tools: Read, Write, Glob, Grep
---

# /campaign — Plan a Content Campaign

Design and plan a structured content marketing campaign.

## Usage

```
/campaign [campaign type or topic]
```

## What This Does

Creates a comprehensive content campaign plan including:
- Campaign goals and success metrics
- Content calendar with dates and platforms
- Individual content briefs for each piece
- Distribution strategy across channels

## Examples

```
/campaign "Product launch for our new API"
/campaign "Monthly content series about web performance"
/campaign "Awareness campaign for open-source project"
```

## Campaign Types

- **Product Launch** — Pre-launch teasers, launch post, follow-up content, social distribution
- **Content Series** — Weekly or bi-weekly themed posts building authority
- **Awareness Push** — Short intensive campaign for maximum reach

## Process

1. Ask about campaign goals (awareness, leads, launch?)
2. Determine target audience and platforms
3. Create campaign directory structure:
   ```
   campaigns/[name]/
   ├── README.md      # Goals, audience, metrics
   ├── calendar.md    # Content schedule
   └── briefs/        # One brief per content piece
   ```
4. Write content calendar with timing and status tracking
5. Generate briefs for each content piece
6. Present the full plan for review

## Output

Saves all campaign planning files to disk so they can be tracked, updated, and executed over time.
