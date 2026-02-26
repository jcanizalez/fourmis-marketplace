/**
 * Professional HTML invoice template with inline CSS.
 *
 * Renders to clean, printable HTML that looks great in browsers
 * and produces professional PDFs via Ctrl+P / browser print.
 */

import type { InvoiceWithDetails } from "./db.js";

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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function renderInvoiceHTML(invoice: InvoiceWithDetails): string {
  const fc = (amount: number) => formatCurrency(amount, invoice.currency);

  const statusColor: Record<string, string> = {
    draft: "#6b7280",
    sent: "#2563eb",
    paid: "#16a34a",
    overdue: "#dc2626",
    cancelled: "#9ca3af",
    partial: "#d97706",
  };

  const statusBg: Record<string, string> = {
    draft: "#f3f4f6",
    sent: "#dbeafe",
    paid: "#dcfce7",
    overdue: "#fef2f2",
    cancelled: "#f3f4f6",
    partial: "#fef3c7",
  };

  const lineItemRows = invoice.line_items
    .map(
      (item, i) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${i + 1}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.quantity}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right;">${fc(item.unit_price)}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500;">${fc(item.amount)}</td>
      </tr>`
    )
    .join("\n");

  const paymentRows =
    invoice.payments.length > 0
      ? `
    <div style="margin-top: 32px;">
      <h3 style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 12px;">Payment History</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #6b7280;">Date</th>
            <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #6b7280;">Method</th>
            <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #6b7280;">Reference</th>
            <th style="padding: 8px 12px; text-align: right; font-weight: 600; color: #6b7280;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.payments
            .map(
              (p) => `
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6;">${formatDate(p.paid_at)}</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6;">${p.method}</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6;">${p.reference || "—"}</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; text-align: right;">${fc(p.amount)}</td>
            </tr>`
            )
            .join("\n")}
        </tbody>
      </table>
    </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px; }
      .no-print { display: none; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; line-height: 1.5; background: #f9fafb; }
  </style>
</head>
<body>
  <div style="max-width: 800px; margin: 24px auto; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
    <!-- Header -->
    <div style="padding: 32px 40px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f3f4f6;">
      <div>
        <h1 style="font-size: 28px; font-weight: 700; color: #111827; margin-bottom: 4px;">INVOICE</h1>
        <p style="font-size: 16px; color: #6b7280; font-weight: 500;">${invoice.invoice_number}</p>
      </div>
      <div style="text-align: right;">
        <span style="display: inline-block; padding: 4px 16px; border-radius: 9999px; font-size: 13px; font-weight: 600; color: ${statusColor[invoice.status] || "#374151"}; background: ${statusBg[invoice.status] || "#f3f4f6"}; text-transform: uppercase; letter-spacing: 0.5px;">${invoice.status}</span>
      </div>
    </div>

    <!-- Dates and Client -->
    <div style="padding: 24px 40px; display: flex; justify-content: space-between; gap: 40px;">
      <div style="flex: 1;">
        <h3 style="font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Bill To</h3>
        <p style="font-size: 16px; font-weight: 600; color: #111827;">${invoice.client.name}</p>
        ${invoice.client.company ? `<p style="font-size: 14px; color: #6b7280;">${invoice.client.company}</p>` : ""}
        ${invoice.client.email ? `<p style="font-size: 14px; color: #6b7280;">${invoice.client.email}</p>` : ""}
        ${invoice.client.address ? `<p style="font-size: 14px; color: #6b7280; white-space: pre-line;">${invoice.client.address}</p>` : ""}
      </div>
      <div style="text-align: right;">
        <div style="margin-bottom: 12px;">
          <p style="font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Issued</p>
          <p style="font-size: 14px; color: #374151;">${formatDate(invoice.issued_date)}</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Due Date</p>
          <p style="font-size: 14px; color: #374151;">${formatDate(invoice.due_date)}</p>
        </div>
        ${
          invoice.paid_date
            ? `<div>
          <p style="font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Paid</p>
          <p style="font-size: 14px; color: #16a34a;">${formatDate(invoice.paid_date)}</p>
        </div>`
            : ""
        }
      </div>
    </div>

    <!-- Line Items -->
    <div style="padding: 0 40px 24px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; width: 40px;">#</th>
            <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Description</th>
            <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; width: 80px;">Qty</th>
            <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; width: 120px;">Rate</th>
            <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; width: 120px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemRows}
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div style="padding: 0 40px 32px;">
      <div style="display: flex; justify-content: flex-end;">
        <div style="width: 280px;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
            <span style="color: #6b7280;">Subtotal</span>
            <span style="font-weight: 500;">${fc(invoice.subtotal)}</span>
          </div>
          ${
            invoice.discount > 0
              ? `<div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
            <span style="color: #6b7280;">Discount (${invoice.discount}%)</span>
            <span style="font-weight: 500; color: #dc2626;">-${fc(invoice.discount_amount)}</span>
          </div>`
              : ""
          }
          ${
            invoice.tax_rate > 0
              ? `<div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
            <span style="color: #6b7280;">Tax (${invoice.tax_rate}%)</span>
            <span style="font-weight: 500;">${fc(invoice.tax_amount)}</span>
          </div>`
              : ""
          }
          <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #111827; margin-top: 4px;">
            <span style="font-size: 16px; font-weight: 700;">Total</span>
            <span style="font-size: 16px; font-weight: 700;">${fc(invoice.total)}</span>
          </div>
          ${
            invoice.amount_paid > 0
              ? `<div style="display: flex; justify-content: space-between; padding: 8px 0;">
            <span style="color: #16a34a;">Paid</span>
            <span style="font-weight: 500; color: #16a34a;">${fc(invoice.amount_paid)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; background: #fef3c7; margin: 4px -8px; padding: 8px; border-radius: 6px;">
            <span style="font-weight: 700; color: #92400e;">Balance Due</span>
            <span style="font-weight: 700; color: #92400e;">${fc(invoice.amount_due)}</span>
          </div>`
              : ""
          }
        </div>
      </div>
    </div>

    ${
      invoice.notes
        ? `<!-- Notes -->
    <div style="padding: 0 40px 32px;">
      <h3 style="font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Notes</h3>
      <p style="font-size: 14px; color: #6b7280; white-space: pre-line;">${invoice.notes}</p>
    </div>`
        : ""
    }

    ${paymentRows ? `<div style="padding: 0 40px 32px;">${paymentRows}</div>` : ""}

    <!-- Footer -->
    <div style="padding: 16px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="font-size: 12px; color: #9ca3af;">Generated by Fourmis Invoice Plugin</p>
    </div>
  </div>

  <!-- Print button (hidden when printing) -->
  <div class="no-print" style="text-align: center; padding: 16px;">
    <button onclick="window.print()" style="padding: 10px 24px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: 500;">Print / Save as PDF</button>
  </div>
</body>
</html>`;
}
