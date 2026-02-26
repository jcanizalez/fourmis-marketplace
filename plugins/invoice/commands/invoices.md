---
name: invoices
description: List and manage recent invoices — see status, outstanding, overdue
arguments:
  - name: filter
    description: Optional filter — "all", "unpaid", "overdue", "draft", or a client name
    required: false
---

# /invoices — View Invoice Dashboard

Show the user their invoice status at a glance.

## Steps

1. **Get the revenue report** with `invoice_report` to show the big picture
2. **List relevant invoices** based on the filter:
   - No filter or "all": show last 20 invoices with `invoice_list`
   - "unpaid": show sent + overdue + partial invoices
   - "overdue": show only overdue invoices
   - "draft": show draft invoices that haven't been sent
   - Client name: search client with `invoice_search_clients`, then filter by client_id
3. **Highlight action items**:
   - Overdue invoices that need follow-up
   - Draft invoices that should be sent
   - Large outstanding amounts
4. **Suggest actions**:
   - For overdue: "Use invoice_update_status to mark as overdue, then follow up with the client"
   - For drafts: "Ready to send? Export with /invoice export and email to client"
