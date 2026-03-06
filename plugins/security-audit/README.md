# 🔒 security-audit

> Local code security scanning MCP server — detect hardcoded secrets and API keys, scan dependencies for known CVEs, find SQL injection and XSS and command injection patterns, audit configurations for misconfigurations, check HTTP security headers (HSTS, CSP, X-Frame-Options), verify .

**Category:** Security | **1 skill** | **2 commands** | **1 agent** | **MCP server**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/security-audit
```

## Overview

Local code security scanning MCP server — detect hardcoded secrets and API keys, scan dependencies for known CVEs, find SQL injection and XSS and command injection patterns, audit configurations for misconfigurations, check HTTP security headers (HSTS, CSP, X-Frame-Options), verify .env exposure and file permissions, generate security grades and audit reports. 1 skill, 2 commands, 1 agent, MCP server. Zero cloud dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `security-scanning` | When the user asks to run a security audit |

## Commands

| Command | Description |
|---------|-------------|
| `/audit` | Run a comprehensive security audit on the current project or a specified directory |
| `/headers` | Check HTTP security headers for a live URL |

## Agents

### security-auditor
When the user asks for a comprehensive security audit, full codebase security review, or wants an autonomous security assessment with findings and recommendations

## MCP Server

This plugin includes an MCP (Model Context Protocol) server that provides additional tools. The server starts automatically when the plugin is loaded.

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
