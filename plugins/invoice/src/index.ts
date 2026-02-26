/**
 * Invoice MCP Server — Local-first invoicing for freelancers.
 *
 * Create, track, and export professional invoices from Claude Code.
 * SQLite-based storage with zero cloud dependencies. Generates
 * print-ready HTML invoices.
 *
 * Environment variables:
 *   INVOICE_DB_DIR — Directory for the SQLite database (default: ./data)
 *   INVOICE_OUTPUT_DIR — Directory for exported HTML invoices (default: ./invoices)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import {
  createClient,
  getClient,
  listClients,
  searchClients,
  createInvoice,
  getInvoiceWithDetails,
  getInvoiceByNumber,
  listInvoices,
  updateInvoiceStatus,
  recordPayment,
  getRevenueReport,
} from "./db.js";
import type { InvoiceWithDetails, RevenueReport, Client } from "./db.js";
import { renderInvoiceHTML } from "./templates.js";

// ─── Output Directory ────────────────────────────────────────────

const outputDir =
  process.env.INVOICE_OUTPUT_DIR || path.join(process.cwd(), "invoices");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// ─── Formatters ──────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "\u20AC",
    GBP: "\u00A3",
    JPY: "\u00A5",
    CAD: "CA$",
    AUD: "A$",
    MXN: "MX$",
  };
  const symbol = symbols[currency] || currency + " ";
  return `${symbol}${amount.toFixed(2)}`;
}

function formatInvoiceSummary(inv: InvoiceWithDetails): string {
  const fc = (amount: number) => formatCurrency(amount, inv.currency);
  return [
    `**${inv.invoice_number}** — ${inv.client.name}`,
    `Status: ${inv.status.toUpperCase()} | Total: ${fc(inv.total)} | Due: ${fc(inv.amount_due)}`,
    `Issued: ${inv.issued_date} | Due: ${inv.due_date || "Not set"}`,
    `Items: ${inv.line_items.length} | Payments: ${inv.payments.length}`,
  ].join("\n");
}

function formatInvoiceDetail(inv: InvoiceWithDetails): string {
  const fc = (amount: number) => formatCurrency(amount, inv.currency);
  const lines = [
    `# Invoice ${inv.invoice_number}`,
    `**Client:** ${inv.client.name}${inv.client.company ? ` (${inv.client.company})` : ""}`,
    `**Status:** ${inv.status.toUpperCase()}`,
    `**Issued:** ${inv.issued_date} | **Due:** ${inv.due_date || "Not set"}`,
    "",
    "## Line Items",
    "| # | Description | Qty | Rate | Amount |",
    "|---|-------------|-----|------|--------|",
  ];

  inv.line_items.forEach((item, i) => {
    lines.push(
      `| ${i + 1} | ${item.description} | ${item.quantity} | ${fc(item.unit_price)} | ${fc(item.amount)} |`
    );
  });

  lines.push(
    "",
    "## Totals",
    `| | |`,
    `|---|---|`,
    `| Subtotal | ${fc(inv.subtotal)} |`
  );

  if (inv.discount > 0) {
    lines.push(`| Discount (${inv.discount}%) | -${fc(inv.discount_amount)} |`);
  }
  if (inv.tax_rate > 0) {
    lines.push(`| Tax (${inv.tax_rate}%) | ${fc(inv.tax_amount)} |`);
  }
  lines.push(`| **Total** | **${fc(inv.total)}** |`);

  if (inv.amount_paid > 0) {
    lines.push(`| Paid | ${fc(inv.amount_paid)} |`);
    lines.push(`| **Balance Due** | **${fc(inv.amount_due)}** |`);
  }

  if (inv.notes) {
    lines.push("", `**Notes:** ${inv.notes}`);
  }

  if (inv.payments.length > 0) {
    lines.push("", "## Payments", "| Date | Method | Amount | Reference |", "|------|--------|--------|-----------|");
    inv.payments.forEach((p) => {
      lines.push(`| ${p.paid_at.split("T")[0]} | ${p.method} | ${fc(p.amount)} | ${p.reference || "—"} |`);
    });
  }

  return lines.join("\n");
}

function formatClientInfo(client: Client): string {
  const lines = [
    `**${client.name}** (ID: ${client.id})`,
  ];
  if (client.company) lines.push(`Company: ${client.company}`);
  if (client.email) lines.push(`Email: ${client.email}`);
  if (client.phone) lines.push(`Phone: ${client.phone}`);
  if (client.address) lines.push(`Address: ${client.address}`);
  if (client.notes) lines.push(`Notes: ${client.notes}`);
  return lines.join("\n");
}

function formatRevenueReport(report: RevenueReport): string {
  const fc = (amount: number) => `$${amount.toFixed(2)}`;
  const lines = [
    "# Revenue Report",
    "",
    "## Summary",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Invoiced | ${fc(report.total_invoiced)} |`,
    `| Total Paid | ${fc(report.total_paid)} |`,
    `| Outstanding | ${fc(report.total_outstanding)} |`,
    `| Overdue | ${fc(report.total_overdue)} |`,
    `| Invoice Count | ${report.invoice_count} |`,
    `| Paid | ${report.paid_count} |`,
    `| Outstanding | ${report.outstanding_count} |`,
    `| Overdue | ${report.overdue_count} |`,
  ];

  if (report.by_status.length > 0) {
    lines.push("", "## By Status", "| Status | Count | Total |", "|--------|-------|-------|");
    report.by_status.forEach((s) => {
      lines.push(`| ${s.status} | ${s.count} | ${fc(s.total)} |`);
    });
  }

  if (report.by_client.length > 0) {
    lines.push("", "## By Client", "| Client | Total | Paid | Outstanding |", "|--------|-------|------|-------------|");
    report.by_client.forEach((c) => {
      lines.push(`| ${c.client_name} | ${fc(c.total)} | ${fc(c.paid)} | ${fc(c.outstanding)} |`);
    });
  }

  return lines.join("\n");
}

// ─── Create MCP Server ──────────────────────────────────────────

const server = new McpServer({
  name: "invoice",
  version: "1.0.0",
});

// ─── Client Tools ────────────────────────────────────────────────

server.tool(
  "invoice_create_client",
  `Create a new client record for invoicing.

Use this tool to add a client before creating their first invoice. Clients are reused across invoices — create once, invoice many times.

Do NOT use this tool for:
- Searching existing clients (use invoice_search_clients instead)
- Creating an invoice (use invoice_create instead)

Limitations:
- Client name is required, all other fields are optional
- No duplicate detection — check with invoice_search_clients first
- Client records cannot be deleted if they have invoices

Returns: Markdown-formatted client record with ID, name, company, email, and all other fields.`,
  {
    name: z.string().describe("Client's full name or business name"),
    email: z.string().optional().describe("Client's email address"),
    company: z.string().optional().describe("Client's company name"),
    address: z.string().optional().describe("Client's billing address (multi-line supported)"),
    phone: z.string().optional().describe("Client's phone number"),
    notes: z.string().optional().describe("Internal notes about this client"),
  },
  async ({ name, email, company, address, phone, notes }) => {
    const client = createClient({ name, email, company, address, phone, notes });
    return {
      content: [{ type: "text" as const, text: `## Client Created\n${formatClientInfo(client)}` }],
    };
  }
);

server.tool(
  "invoice_search_clients",
  `Search for existing clients by name, email, or company.

Use this tool to find a client before creating an invoice — you need the client ID. Also useful for checking if a client already exists before creating a duplicate.

Do NOT use this tool for:
- Creating new clients (use invoice_create_client)
- Listing invoices for a client (use invoice_list with client_id filter)

Limitations:
- Search is case-insensitive and matches partial text
- Returns all matching clients — no pagination
- Empty search returns all clients

Returns: Numbered list of matching clients with ID, name, company, and email. Use the ID to create invoices.`,
  {
    query: z
      .string()
      .optional()
      .describe("Search query — matches against name, email, and company. Omit to list all clients."),
  },
  async ({ query }) => {
    const clients = query ? searchClients(query) : listClients();
    if (clients.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No clients found." }],
      };
    }
    const text = clients.map((c, i) => `${i + 1}. ${formatClientInfo(c)}`).join("\n\n");
    return {
      content: [{ type: "text" as const, text: `# Clients (${clients.length})\n\n${text}` }],
    };
  }
);

// ─── Invoice Tools ───────────────────────────────────────────────

server.tool(
  "invoice_create",
  `Create a new invoice with line items for an existing client.

Use this tool to generate a professional invoice. Requires a client ID (find it with invoice_search_clients). Each line item has a description, quantity, and unit price. The invoice number is auto-generated (INV-YYYYMM-NNN format).

Do NOT use this tool for:
- Adding a new client (use invoice_create_client first)
- Updating an existing invoice (update status with invoice_update_status)

Limitations:
- Client must exist — create them first with invoice_create_client
- At least one line item is required
- Invoice numbers are sequential per month and cannot be customized
- Invoices are created in 'draft' status — send to client manually
- Tax rate and discount are percentages (e.g., 20 for 20%)

Returns: Markdown-formatted invoice with all details — number, client, line items, subtotal, tax, discount, and total.`,
  {
    client_id: z.number().describe("Client ID — find it with invoice_search_clients"),
    items: z
      .array(
        z.object({
          description: z.string().describe("What was delivered (e.g., 'Web development — homepage redesign')"),
          quantity: z.number().describe("Number of units (hours, items, etc.)"),
          unit_price: z.number().describe("Price per unit in the invoice currency"),
        })
      )
      .min(1)
      .describe("Line items — at least one required"),
    currency: z
      .string()
      .optional()
      .describe("Currency code (USD, EUR, GBP, etc.). Default: 'USD'"),
    tax_rate: z
      .number()
      .optional()
      .describe("Tax rate as a percentage (e.g., 20 for 20%). Default: 0"),
    discount: z
      .number()
      .optional()
      .describe("Discount as a percentage (e.g., 10 for 10% off). Applied before tax. Default: 0"),
    notes: z
      .string()
      .optional()
      .describe("Notes to include on the invoice (payment terms, thank you, etc.)"),
    due_date: z
      .string()
      .optional()
      .describe("Due date in YYYY-MM-DD format. Example: '2026-03-30'"),
  },
  async ({ client_id, items, currency, tax_rate, discount, notes, due_date }) => {
    const client = getClient(client_id);
    if (!client) {
      return {
        content: [{ type: "text" as const, text: `Error: Client with ID ${client_id} not found. Use invoice_search_clients to find the correct ID.` }],
        isError: true,
      };
    }

    const invoice = createInvoice({
      client_id,
      items,
      currency,
      tax_rate,
      discount,
      notes,
      due_date,
    });

    return {
      content: [{ type: "text" as const, text: formatInvoiceDetail(invoice) }],
    };
  }
);

server.tool(
  "invoice_get",
  `Get full details of a specific invoice by ID or invoice number.

Use this tool to view an invoice's complete details — line items, totals, payment history, and status.

Do NOT use this tool for:
- Listing multiple invoices (use invoice_list)
- Creating a new invoice (use invoice_create)

Limitations:
- Accepts either numeric ID or invoice number string (INV-YYYYMM-NNN)
- Returns null if invoice not found

Returns: Markdown-formatted invoice with all details — number, client, line items, subtotal, tax, discount, total, payment history, and notes.`,
  {
    invoice: z
      .string()
      .describe("Invoice ID (numeric) or invoice number (e.g., 'INV-202602-001')"),
  },
  async ({ invoice: invoiceRef }) => {
    const inv = /^\d+$/.test(invoiceRef)
      ? getInvoiceWithDetails(parseInt(invoiceRef))
      : getInvoiceByNumber(invoiceRef);

    if (!inv) {
      return {
        content: [{ type: "text" as const, text: `Invoice not found: ${invoiceRef}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: formatInvoiceDetail(inv) }],
    };
  }
);

server.tool(
  "invoice_list",
  `List invoices with optional filters for status and client.

Use this tool to see all invoices or filter by status (draft, sent, paid, overdue, cancelled) or client. Shows a summary of each invoice.

Do NOT use this tool for:
- Getting full details of one invoice (use invoice_get)
- Creating a new invoice (use invoice_create)

Limitations:
- Returns summaries, not full details — use invoice_get for complete info
- Default limit is 20 invoices — increase with the limit parameter
- Sorted by creation date, newest first

Returns: Numbered list of invoice summaries with number, client, status, total, and due amount.`,
  {
    status: z
      .enum(["draft", "sent", "paid", "overdue", "cancelled", "partial"])
      .optional()
      .describe("Filter by status. Omit to show all statuses."),
    client_id: z.number().optional().describe("Filter by client ID"),
    limit: z.number().optional().describe("Maximum number of invoices to return. Default: 20"),
  },
  async ({ status, client_id, limit }) => {
    const invoices = listInvoices({ status, client_id, limit: limit || 20 });
    if (invoices.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No invoices found." }],
      };
    }
    const text = invoices.map((inv, i) => `${i + 1}. ${formatInvoiceSummary(inv)}`).join("\n\n");
    return {
      content: [{ type: "text" as const, text: `# Invoices (${invoices.length})\n\n${text}` }],
    };
  }
);

server.tool(
  "invoice_update_status",
  `Update the status of an invoice (draft → sent → paid/overdue/cancelled).

Use this tool to move an invoice through its lifecycle. Common transitions: draft → sent (when emailed to client), sent → paid (when payment received), sent → overdue (when past due date).

Do NOT use this tool for:
- Recording a specific payment amount (use invoice_record_payment instead)
- Modifying invoice line items (not supported — create a new invoice)

Limitations:
- Valid statuses: draft, sent, paid, overdue, cancelled, partial
- No validation on status transitions — you can set any status
- Setting 'paid' auto-fills the paid_date field
- Cannot undo — but you can change status back

Returns: Updated invoice detail with new status.`,
  {
    invoice: z.string().describe("Invoice ID (numeric) or invoice number"),
    status: z
      .enum(["draft", "sent", "paid", "overdue", "cancelled", "partial"])
      .describe("New status for the invoice"),
  },
  async ({ invoice: invoiceRef, status }) => {
    const inv = /^\d+$/.test(invoiceRef)
      ? getInvoiceWithDetails(parseInt(invoiceRef))
      : getInvoiceByNumber(invoiceRef);

    if (!inv) {
      return {
        content: [{ type: "text" as const, text: `Invoice not found: ${invoiceRef}` }],
        isError: true,
      };
    }

    const updated = updateInvoiceStatus(inv.id, status);
    return {
      content: [
        {
          type: "text" as const,
          text: `## Status Updated\n${formatInvoiceDetail(updated!)}`,
        },
      ],
    };
  }
);

server.tool(
  "invoice_record_payment",
  `Record a payment against an invoice.

Use this tool when a client makes a payment. Supports partial payments — multiple payments can be recorded against one invoice. If the total payments equal or exceed the invoice total, the status is automatically set to 'paid'.

Do NOT use this tool for:
- Marking an invoice as paid without a specific amount (use invoice_update_status)
- Creating a new invoice (use invoice_create)

Limitations:
- Payment amount must be positive
- No automatic refund support — record negative amounts manually if needed
- Payment method is freeform text (e.g., 'bank_transfer', 'paypal', 'cash')
- Auto-marks as paid when fully paid (within $0.01 tolerance)

Returns: Updated invoice with payment recorded and new balance due.`,
  {
    invoice: z.string().describe("Invoice ID (numeric) or invoice number"),
    amount: z.number().positive().describe("Payment amount in the invoice's currency"),
    method: z
      .string()
      .optional()
      .describe("Payment method (e.g., 'bank_transfer', 'paypal', 'stripe', 'cash', 'check'). Default: 'other'"),
    reference: z
      .string()
      .optional()
      .describe("Payment reference or transaction ID (e.g., 'TXN-123456')"),
    notes: z.string().optional().describe("Notes about this payment"),
  },
  async ({ invoice: invoiceRef, amount, method, reference, notes }) => {
    const inv = /^\d+$/.test(invoiceRef)
      ? getInvoiceWithDetails(parseInt(invoiceRef))
      : getInvoiceByNumber(invoiceRef);

    if (!inv) {
      return {
        content: [{ type: "text" as const, text: `Invoice not found: ${invoiceRef}` }],
        isError: true,
      };
    }

    const updated = recordPayment({
      invoice_id: inv.id,
      amount,
      method,
      reference,
      notes,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: `## Payment Recorded\n${formatInvoiceDetail(updated!)}`,
        },
      ],
    };
  }
);

server.tool(
  "invoice_export_html",
  `Export an invoice as a professional HTML file ready for printing or PDF conversion.

Use this tool to generate a beautifully formatted HTML invoice that can be opened in any browser and printed to PDF (Ctrl+P / Cmd+P). The HTML includes inline CSS for consistent rendering everywhere.

Do NOT use this tool for:
- Viewing invoice details in markdown (use invoice_get)
- Creating a new invoice (use invoice_create)

Limitations:
- Generates HTML file — not a PDF directly. Use browser's Print to PDF for PDF output
- Saved to INVOICE_OUTPUT_DIR (default: ./invoices/ in the plugin directory)
- Template is professional but not customizable (no branding/logo support yet)
- File is overwritten if exported again with the same invoice number

Returns: File path to the generated HTML invoice, ready to open in a browser.`,
  {
    invoice: z.string().describe("Invoice ID (numeric) or invoice number"),
  },
  async ({ invoice: invoiceRef }) => {
    const inv = /^\d+$/.test(invoiceRef)
      ? getInvoiceWithDetails(parseInt(invoiceRef))
      : getInvoiceByNumber(invoiceRef);

    if (!inv) {
      return {
        content: [{ type: "text" as const, text: `Invoice not found: ${invoiceRef}` }],
        isError: true,
      };
    }

    const html = renderInvoiceHTML(inv);
    const fileName = `${inv.invoice_number}.html`;
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, html, "utf-8");

    return {
      content: [
        {
          type: "text" as const,
          text: `## Invoice Exported\n**File:** ${filePath}\n**Invoice:** ${inv.invoice_number}\n**Client:** ${inv.client.name}\n**Total:** ${formatCurrency(inv.total, inv.currency)}\n\nOpen in a browser to view. Use Ctrl+P (Cmd+P on Mac) to save as PDF.`,
        },
      ],
    };
  }
);

server.tool(
  "invoice_report",
  `Generate a revenue report with totals, status breakdown, and per-client summary.

Use this tool to get an overview of your invoicing: total revenue, outstanding payments, overdue amounts, and per-client breakdowns.

Do NOT use this tool for:
- Getting details of a single invoice (use invoice_get)
- Listing invoices (use invoice_list)

Limitations:
- Report covers all invoices in the database — no date range filter
- Amounts in the report assume a single currency (reports raw numbers)
- Overdue detection requires due_date to be set on invoices

Returns: Markdown report with summary metrics, status breakdown table, and per-client revenue table.`,
  {},
  async () => {
    const report = getRevenueReport();
    return {
      content: [{ type: "text" as const, text: formatRevenueReport(report) }],
    };
  }
);

// ─── Start Server ────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Invoice MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
