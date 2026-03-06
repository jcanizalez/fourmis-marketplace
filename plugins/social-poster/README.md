# 🌐 social-poster

> Cross-platform social media posting — publish to Bluesky and Mastodon from Claude Code.

**Category:** Social | **1 skill** | **2 commands** | **1 agent** | **MCP server**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/social-poster
```

## Overview

Cross-platform social media posting — publish to Bluesky and Mastodon from Claude Code. Compose once, adapt for character limits, post to one or all platforms. 8 MCP tools, 1 skill, 2 commands.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `social-media-writing` | When the user asks to write social media posts |

## Commands

| Command | Description |
|---------|-------------|
| `/post` | Compose and publish a social media post to Bluesky, Mastodon, or all platforms |
| `/social-status` | Check which social media platforms are configured and connected |

## Agents

### social-publisher
Social media content specialist — composes platform-adapted posts for Bluesky and Mastodon, handles cross-posting, manages character limits, and applies hashtag strategy per platform.

## MCP Server

This plugin includes an MCP (Model Context Protocol) server that provides additional tools. The server starts automatically when the plugin is loaded.

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
