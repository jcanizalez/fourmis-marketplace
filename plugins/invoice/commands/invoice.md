---
name: invoice
description: Create a new invoice from a natural language description
arguments:
  - name: description
    description: What to invoice — client, amount, work done (e.g., "invoice Acme Corp $2500 for 10 hours web dev at $250/hr")
    required: true
---

# /invoice — Create a New Invoice

Help the user create an invoice from a natural language description.

## Steps

1. **Parse the description** — extract client name, line items, rates, quantities, and any other details
2. **Find or create the client**:
   - Search for the client with `invoice_search_clients`
   - If found, use their ID
   - If not found, create with `invoice_create_client` (ask for email/company if not provided)
3. **Confirm line items** before creating:
   - Show what will be invoiced: description, qty, rate, amount
   - Ask about tax rate, discount, and due date if not specified
   - Default due date: 30 days from today
4. **Create the invoice** with `invoice_create`
5. **Offer next steps**:
   - Export as HTML with `invoice_export_html`
   - Send to client (remind them to email the PDF)
   - Mark as sent with `invoice_update_status`
