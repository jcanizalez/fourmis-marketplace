# invoice

Local-first invoicing for freelancers — create, track, and export professional invoices from Claude Code. SQLite-based, zero cloud dependencies, zero subscriptions.

Replace FreshBooks ($17/mo) or QuickBooks ($30/mo) with a free, local tool that works from your terminal.

## MCP Tools (10)

| Tool | Description |
|------|-------------|
| `invoice_create_client` | Create a new client record |
| `invoice_search_clients` | Search clients by name, email, or company |
| `invoice_create` | Create an invoice with line items |
| `invoice_get` | Get full invoice details by ID or number |
| `invoice_list` | List invoices with status/client filters |
| `invoice_update_status` | Update invoice status (draft → sent → paid) |
| `invoice_record_payment` | Record a payment (supports partial payments) |
| `invoice_export_html` | Export as professional HTML (print to PDF) |
| `invoice_report` | Revenue report with per-client breakdown |

## Commands (2)

| Command | Description |
|---------|-------------|
| `/invoice` | Create invoice from natural language (e.g., "invoice Acme $2500 for 10h web dev") |
| `/invoices` | Dashboard — revenue summary, status breakdown, action items |

## Skills (1)

| Skill | Description |
|-------|-------------|
| **Invoicing Best Practices** | Payment terms, line item formatting, tax considerations, late payment strategy, international payments |

## Setup

```bash
fourmis plugin install invoice
```

No API keys required. Data stored locally in SQLite.

## Usage Examples

### Create a client and invoice
```
/invoice Acme Corp $2500 for 10 hours of web development at $250/hr, due in 30 days
```

### Check your invoices
```
/invoices unpaid
```

### Export and send
```
Use invoice_export_html on INV-202602-001
```
Then open the HTML file in your browser and press Ctrl+P to save as PDF.

### Record a payment
```
Use invoice_record_payment on INV-202602-001 for $2500 via bank_transfer
```

## Architecture

```
invoice/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
├── .mcp.json                # MCP server configuration
├── skills/
│   └── invoicing-best-practices/
│       └── SKILL.md         # Payment terms, tax, late payment guidance
├── commands/
│   ├── invoice.md           # /invoice — create from natural language
│   └── invoices.md          # /invoices — dashboard view
├── src/
│   ├── index.ts             # MCP server with 10 tools
│   ├── db.ts                # SQLite database (clients, invoices, line_items, payments)
│   └── templates.ts         # Professional HTML invoice template
├── package.json
├── tsconfig.json
└── README.md
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `clients` | Client records (name, email, company, address) |
| `invoices` | Invoice headers (number, status, dates, tax, discount) |
| `line_items` | Line items with quantity × unit_price = amount |
| `payments` | Payment records with method, reference, notes |

## Invoice Lifecycle

```
draft → sent → paid
                ↘ overdue → paid
                ↘ partial → paid
draft → cancelled
```

## HTML Invoice Export

The exported HTML includes:
- Professional design with inline CSS
- Responsive layout
- Status badge (color-coded)
- Full line item table
- Subtotal, discount, tax, and total
- Payment history (if any)
- Print button (hidden when printing)
- Works in all modern browsers

## License

MIT
