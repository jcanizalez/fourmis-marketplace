# 📋 invoice

> Local-first invoicing for freelancers — create, track, and export professional invoices from Claude Code.

**Category:** Productivity | **1 skill** | **2 commands** | **1 agent** | **MCP server**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/invoice
```

## Overview

Local-first invoicing for freelancers — create, track, and export professional invoices from Claude Code. SQLite-based with 10 MCP tools for clients, invoices, payments, HTML export, and revenue reports. Zero cloud dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `invoicing-best-practices` | When the user asks about invoicing best practices |

## Commands

| Command | Description |
|---------|-------------|
| `/invoice` | Create a new invoice from a natural language description |
| `/invoices` | List and manage recent invoices — see status, outstanding, overdue |

## Agents

### invoice-manager
Freelance invoicing specialist — creates professional invoices, tracks payments, manages clients, exports HTML invoices, and generates revenue reports.

## MCP Server

This plugin includes an MCP (Model Context Protocol) server that provides additional tools. The server starts automatically when the plugin is loaded.

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
