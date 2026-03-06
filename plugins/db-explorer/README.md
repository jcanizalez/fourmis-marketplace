# 🔧 db-explorer

> Database exploration MCP server — connect to SQLite or PostgreSQL, list and describe tables, view column types and constraints and indexes, map table relationships, run read-only SQL queries, sample data, export results to CSV, data quality checks (orphaned FKs, duplicates, null analysis).

**Category:** Development | **1 skill** | **2 commands** | **1 agent** | **MCP server**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/db-explorer
```

## Overview

Database exploration MCP server — connect to SQLite or PostgreSQL, list and describe tables, view column types and constraints and indexes, map table relationships, run read-only SQL queries, sample data, export results to CSV, data quality checks (orphaned FKs, duplicates, null analysis). 1 skill, 2 commands, 1 agent, 10 MCP tools. Zero cloud dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `database-exploration` | When the user asks to explore a database |

## Commands

| Command | Description |
|---------|-------------|
| `/db` | Quick database exploration — connect, list tables, describe schema, and preview data |
| `/query` | Run a read-only SQL query on the connected database and see formatted results |

## Agents

### database-analyst
When the user asks to analyze a database, perform a full database exploration, reverse-engineer a schema, generate documentation for a database, or wants an autonomous database assessment

## MCP Server

This plugin includes an MCP (Model Context Protocol) server that provides additional tools. The server starts automatically when the plugin is loaded.

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
