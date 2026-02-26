# Invoicing Best Practices

Expert guidance for creating professional invoices and managing freelance finances.

## When to Activate

Activate when the user asks about invoicing, billing, payment tracking, or when using the invoice plugin MCP tools.

## Invoice Essentials

Every professional invoice must include:

| Field | Required | Notes |
|-------|----------|-------|
| Invoice number | Yes | Sequential, unique (INV-YYYYMM-NNN format) |
| Issue date | Yes | When the invoice was created |
| Due date | Yes | When payment is expected |
| Your business info | Yes | Name, address, tax ID if applicable |
| Client info | Yes | Name, company, billing address |
| Line items | Yes | Description, quantity, rate, amount |
| Subtotal | Yes | Sum of line items |
| Tax | If applicable | Rate and amount |
| Total | Yes | Final amount due |
| Payment terms | Yes | How and when to pay |
| Currency | Yes | Explicit currency code (USD, EUR, etc.) |

## Payment Terms

| Term | Meaning | When to Use |
|------|---------|-------------|
| Due on receipt | Pay immediately | Small amounts, trusted clients |
| Net 15 | Due in 15 days | Quick turnaround work |
| Net 30 | Due in 30 days | Standard for most freelance work |
| Net 45 | Due in 45 days | Enterprise clients, larger projects |
| Net 60 | Due in 60 days | Large corporations, government |
| 50/50 | 50% upfront, 50% on delivery | New clients, large projects |

### Recommended Default
For freelancers: **Net 30** with a note saying "Due within 30 days of invoice date."

For new or untrusted clients: **50% upfront before work begins.**

## Line Item Descriptions

### Good Descriptions
```
Web development — Homepage redesign (React, Tailwind CSS)
Consulting — Architecture review for API migration (4 hours)
Design — Logo design with 3 revision rounds
Writing — Technical blog post: "Getting Started with Kubernetes" (2,500 words)
```

### Bad Descriptions
```
Work done            ← too vague
Stuff                ← unprofessional
Development (10h)    ← what was developed?
Services rendered    ← meaningless
```

### Hourly vs Fixed Rate

| Billing Type | Line Item Format | Example |
|-------------|------------------|---------|
| Hourly | "Description (X hours)" at $rate/hr | "Backend development — API endpoints (8 hours)" × 8 × $150 |
| Fixed | "Deliverable — scope" at fixed price | "Homepage redesign — desktop + mobile" × 1 × $3,000 |
| Retainer | "Monthly retainer — scope" at monthly rate | "Monthly maintenance — bug fixes + updates" × 1 × $2,000 |

## Tax Considerations

### US Freelancers
- **No sales tax** on services in most states
- **1099-NEC** — clients who pay you $600+ must issue one
- Track all income for **self-employment tax** (15.3%)
- Set aside **25-30%** of each invoice for taxes
- Consider **quarterly estimated tax payments**

### International
- **VAT** — EU freelancers must charge VAT (varies 17-27% by country)
- **Reverse charge** — B2B cross-border EU services may use reverse charge
- **Tax treaties** — check if your country has a treaty with the client's country
- **W-8BEN** — non-US freelancers working with US clients need this form

## Late Payment Strategy

### Prevention
1. **Clear terms upfront** — state payment terms before starting work
2. **Deposits** — require 50% upfront for new clients
3. **Shorter terms** — Net 15 instead of Net 30 for smaller clients
4. **Multiple payment options** — bank transfer, PayPal, Stripe, etc.

### Collection Timeline
| Day | Action |
|-----|--------|
| Due date | Send reminder: "Invoice INV-XXX is due today" |
| +3 days | Gentle reminder: "Just checking in on invoice INV-XXX" |
| +7 days | Firm reminder: "Invoice INV-XXX is overdue. Please pay within 7 days." |
| +14 days | Final notice: "This is a final notice. Payment required within 48 hours." |
| +30 days | Consider late fees, collection agency, or small claims court |

### Late Fee Clause
Include in your contract/terms:
> "Invoices not paid within [terms] will be subject to a late fee of 1.5% per month on the outstanding balance."

## Currency & International Payments

### Best Practices
- **Always specify currency** — never assume
- **State which party bears transfer fees** — "Client pays all bank transfer fees"
- **Offer multiple payment methods** for international clients
- **Consider Wise (TransferWise)** for lower international transfer fees

### Common Currency Codes
| Code | Currency | Symbol |
|------|----------|--------|
| USD | US Dollar | $ |
| EUR | Euro | € |
| GBP | British Pound | £ |
| CAD | Canadian Dollar | CA$ |
| AUD | Australian Dollar | A$ |
| JPY | Japanese Yen | ¥ |
| MXN | Mexican Peso | MX$ |
| CHF | Swiss Franc | CHF |

## Invoice Workflow

```
Create Client → Create Invoice (draft)
    → Review line items, totals, dates
    → Export HTML → Print to PDF
    → Send to client (email PDF)
    → Update status: draft → sent
    → Record payment when received
    → Auto-marked as paid when fully paid
    → Generate revenue report monthly
```
