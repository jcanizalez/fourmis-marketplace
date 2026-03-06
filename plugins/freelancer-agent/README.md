# 📋 freelancer-agent

> Freelancer business agent profile — orchestrates local-crm, invoice, and time-tracker into end-to-end workflows.

**Category:** Productivity | **3 skills** | **4 commands** | **3 agents**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/freelancer-agent
```

## Overview

Freelancer business agent profile — orchestrates local-crm, invoice, and time-tracker into end-to-end workflows. Onboard clients, track time, bill clients, monitor business health. 3 agents, 3 skills, 4 commands. No MCP server — pure coordination.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `client-onboarding` | When the user asks to onboard a new client |
| `freelancer-workflow` | When the user asks about freelancing workflows |
| `pricing-strategy` | When the user asks about freelance pricing |

## Commands

| Command | Description |
|---------|-------------|
| `/bill` | Billing workflow — generate timesheet, review hours, create invoice, and export for a client or period |
| `/biz` | Business dashboard — quick overview of your freelance business status across CRM, time tracking, and invoicing |
| `/freelance` | General freelance assistant — ask any business question or get help with client management, billing, or time tracking |
| `/onboard` | Onboard a new client — create CRM contact, invoice client, time project, and deal in one flow |

## Agents

### billing-assistant
Handles the billing cycle — reviews tracked time, generates timesheets, creates invoices, and tracks payments. Coordinates time-tracker and invoice plugins for end-of-period billing.

### client-onboarder
Guided client onboarding — creates CRM contact, sets up invoice client, creates time tracking project, and schedules initial follow-up. All from a single conversation.

### freelancer
End-to-end freelancer business assistant — manages clients, tracks time, generates invoices, and monitors your pipeline. Orchestrates the full freelancing workflow from lead to payment.

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
