# local-crm

Local-first CRM for freelancers and small teams. Manage contacts, deals, follow-ups, and interactions with zero cloud dependencies. All data stored in a local SQLite database.

## Tools (17 total)

### Contacts (6 tools)
| Tool | Type | Description |
|------|------|-------------|
| `crm_create_contact` | Write | Create a new contact |
| `crm_search_contacts` | Read | Search contacts by keyword |
| `crm_get_contact` | Read | Get a contact by ID |
| `crm_list_contacts` | Read | List contacts with filters |
| `crm_update_contact` | Write | Update a contact's details |
| `crm_delete_contact` | Write | Permanently delete a contact |

### Deals (3 tools)
| Tool | Type | Description |
|------|------|-------------|
| `crm_create_deal` | Write | Create a deal linked to a contact |
| `crm_move_deal` | Write | Move a deal to a different pipeline stage |
| `crm_list_deals` | Read | List deals with filters |

### Interactions (2 tools)
| Tool | Type | Description |
|------|------|-------------|
| `crm_log_interaction` | Write | Log a call, email, meeting, note, or message |
| `crm_list_interactions` | Read | View interaction history |

### Follow-Ups (3 tools)
| Tool | Type | Description |
|------|------|-------------|
| `crm_schedule_follow_up` | Write | Schedule a follow-up reminder |
| `crm_complete_follow_up` | Write | Mark a follow-up as done |
| `crm_list_follow_ups` | Read | View follow-ups with filters |

### Reports (2 tools)
| Tool | Type | Description |
|------|------|-------------|
| `crm_pipeline_report` | Read | Pipeline overview by stage |
| `crm_dashboard` | Read | High-level CRM dashboard |

## Pipeline Stages

```
lead → qualified → proposal → negotiation → won / lost
```

## Commands

- **`/contact`** — Quick contact lookup and search
- **`/pipeline`** — View the deal pipeline and reports

## Skills

- **Client Management** — Workflows for onboarding, daily reviews, and pipeline tracking

## Setup

No external accounts or API keys needed. Data is stored locally.

### Build

```bash
cd plugins/local-crm
npm install
npm run build
```

The SQLite database is automatically created at `data/crm.db` on first run.

### Configuration

The `.mcp.json` points to the compiled server:

```json
{
  "local-crm": {
    "type": "stdio",
    "command": "node",
    "args": ["${CLAUDE_PLUGIN_ROOT}/dist/index.js"],
    "env": {
      "CRM_DB_DIR": "${CLAUDE_PLUGIN_ROOT}/data"
    }
  }
}
```

To change the database location, update `CRM_DB_DIR` in your MCP config.

## Data Privacy

All data stays on your machine. The CRM uses SQLite with WAL mode for performance. There are no cloud connections, no telemetry, and no external dependencies beyond the MCP SDK.

## License

MIT
