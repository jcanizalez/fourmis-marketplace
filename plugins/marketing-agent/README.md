# marketing-agent

> Content marketing agent profile for Claude Code — orchestrates writing, SEO, and social distribution into end-to-end marketing workflows.

## What Is This?

A **coordination plugin** that bundles three specialized plugins into a unified content marketing workflow:

- **[markdown-writer](../markdown-writer)** — content creation (blog posts, tutorials, technical articles)
- **[seo-toolkit](../seo-toolkit)** — SEO optimization (meta tags, headings, technical audits)
- **[social-poster](../social-poster)** — social distribution (Bluesky, Mastodon)

This plugin adds the **glue** — agents, skills, and commands that orchestrate these tools into complete marketing workflows.

## Components

| Type | Count | Details |
|------|-------|---------|
| Agents | 3 | content-marketer, campaign-manager, content-repurposer |
| Skills | 3 | content-marketing-strategy, campaign-planning, content-repurposing |
| Commands | 3 | /market, /campaign, /repurpose |

No MCP server — this is a pure orchestration layer.

## Prerequisites

For full functionality, install the upstream plugins:

```bash
# Content creation (skills-only, no setup needed)
fourmis plugin install markdown-writer

# SEO analysis (MCP server, no API keys needed)
fourmis plugin install seo-toolkit

# Social posting (MCP server, needs API credentials)
fourmis plugin install social-poster
```

The marketing-agent works with any combination — if social-poster isn't configured, the agents will create content and optimize it but skip distribution.

## Commands

### `/market` — Full Pipeline
Create, optimize, and distribute content in one flow.

```
/market "Announce our new open-source CLI tool"
/market "Write a tutorial on Docker multi-stage builds and share on social"
```

Pipeline: Research → Write → SEO Check → Generate Social Posts → Review → Publish

### `/campaign` — Plan a Campaign
Design multi-piece content campaigns with calendars and briefs.

```
/campaign "Product launch for v2.0"
/campaign "Weekly content series about TypeScript patterns"
```

Output: Campaign directory with README, calendar, and individual content briefs.

### `/repurpose` — Maximize Existing Content
Turn one blog post or article into 5-10 social media posts.

```
/repurpose ./blog/my-article.md
/repurpose README.md
```

Output: Platform-adapted posts for Bluesky and Mastodon, plus thread versions.

## Agents

### content-marketer
The main orchestrator. Handles the full pipeline: ideation → creation → SEO optimization → social distribution. Give it a topic and it handles everything, presenting drafts for your approval before publishing.

### campaign-manager
Plans multi-piece campaigns. Creates structured campaign plans with content calendars, briefs for each piece, and distribution strategies. Supports product launches, content series, and awareness pushes.

### content-repurposer
Takes existing content and transforms it into platform-specific social posts. Extracts key insights, stats, and hooks from articles and rewrites them natively for each platform. Uses haiku model for fast, cost-effective repurposing.

## Skills

### content-marketing-strategy
The content marketing flywheel, content pillar framework (60/20/10/10 ratio), distribution strategy, and common mistakes. Foundational knowledge for any content marketing effort.

### campaign-planning
Campaign templates (product launch, content series, awareness push), content calendar template, brief template, timing best practices, and execution checklists.

### content-repurposing
The 1-to-10 rule for content extraction, platform adaptation rules, hashtag strategies, and quality checklist for repurposed content.

## Architecture

```
marketing-agent (this plugin)
├── Orchestration layer (agents, skills, commands)
│
├── Uses: markdown-writer
│   └── Skills: blog-writing, seo-writing, readability, editing
│
├── Uses: seo-toolkit
│   └── MCP: seo_analyze_page, seo_check_meta_tags, seo_check_headings
│
└── Uses: social-poster
    └── MCP: social_post_all, social_adapt_content, social_get_character_limits
```

## Example Workflow

```
You: /market "Announce our new database migration tool"

Content Marketer:
1. Drafts a 800-word blog post with SEO-optimized headings
2. Runs SEO checks on heading structure and meta tags
3. Generates 3 Bluesky posts (announcement, key feature, question)
4. Generates 3 Mastodon posts (detailed announcement, thread, how-to)
5. Presents all drafts for your review
6. Posts to approved platforms after confirmation
```

## License

MIT
