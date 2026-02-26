# seo-toolkit

Free SEO analysis toolkit for Claude Code. Analyze any web page for on-page SEO issues, technical problems, and optimization opportunities — without paid API subscriptions.

Get 80% of what SEMrush/Ahrefs offers using only free data sources: HTTP requests, HTML parsing, and SSL checking.

## MCP Tools (10)

| Tool | Description |
|------|-------------|
| `seo_analyze_page` | Full on-page SEO analysis with score (0-100) |
| `seo_check_meta_tags` | Extract and validate title, description, OG, Twitter Card |
| `seo_check_headings` | Analyze H1-H6 hierarchy and structure |
| `seo_check_images` | Audit alt text, dimensions, and accessibility |
| `seo_check_links` | Extract internal/external links with anchor text |
| `seo_check_ssl` | Validate SSL certificate and expiration |
| `seo_check_redirects` | Follow and report redirect chains |
| `seo_check_robots` | Parse and analyze robots.txt rules |
| `seo_check_sitemap` | Parse XML sitemap and count URLs |
| `seo_check_performance` | Response time, page size, security headers |

## Skills (3)

| Skill | Description |
|-------|-------------|
| **On-Page SEO** | Title/description formulas, heading structure, keyword placement, image SEO, internal linking |
| **Keyword Research** | Search intent framework, free research methods, long-tail strategy, content gap analysis |
| **Technical SEO** | HTTPS/SSL, redirects, robots.txt, sitemaps, URL structure, page speed, security headers |

## Commands (2)

| Command | Description |
|---------|-------------|
| `/seo <url>` | Quick SEO analysis with score and actionable fixes |
| `/site-audit <url>` | Comprehensive technical SEO audit (SSL + robots + sitemap + performance + on-page) |

## Agent (1)

| Agent | Description |
|-------|-------------|
| **seo-auditor** | Autonomous agent that runs all 10 tools to produce a full audit report with prioritized action plan |

## Setup

```bash
fourmis plugin install seo-toolkit
```

No API keys required. No environment variables needed. Just install and use.

## Usage Examples

### Quick page check
```
/seo https://example.com/blog/my-post
```

### Full site audit
```
/site-audit https://example.com
```

### Check specific aspects
```
Use seo_check_ssl on example.com
Use seo_check_redirects on http://example.com to verify HTTPS redirect
Use seo_check_robots on https://example.com to see crawl rules
```

## What This Tool Can Do

- Analyze meta tags (title, description, Open Graph, Twitter Card)
- Validate heading hierarchy (H1-H6)
- Audit image alt text and dimensions
- Extract and categorize all links (internal/external/nofollow)
- Check SSL certificate validity and expiration
- Trace redirect chains (301/302)
- Parse robots.txt rules and sitemap XML
- Measure response time, page size, and compression
- Detect structured data (JSON-LD)
- Score pages 0-100 with categorized issues

## What This Tool Cannot Do

- Historical ranking data (requires paid APIs)
- Backlink analysis (requires massive crawl infrastructure)
- Traffic estimates (Google doesn't publish this)
- Core Web Vitals measurement (requires browser engine)
- JavaScript rendering (uses static HTML only)
- Competitor keyword volume data (Google blocks automated access)

## Architecture

```
seo-toolkit/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
├── .mcp.json                # MCP server configuration (no env vars needed)
├── skills/
│   ├── on-page-seo/SKILL.md
│   ├── keyword-research/SKILL.md
│   └── technical-seo/SKILL.md
├── commands/
│   ├── seo.md               # /seo quick analysis
│   └── site-audit.md        # /site-audit full audit
├── agents/
│   └── seo-auditor.md       # Autonomous audit agent
├── src/
│   ├── index.ts             # MCP server with 10 tools
│   ├── analyzer.ts          # HTML analysis (meta, headings, images, links, content)
│   ├── fetcher.ts           # HTTP fetcher with redirect tracking and timing
│   └── formatter.ts         # Markdown report formatters
├── package.json
├── tsconfig.json
└── README.md
```

## Dependencies

Only 3 runtime dependencies (lightweight by design):

| Package | Purpose | Size |
|---------|---------|------|
| `@modelcontextprotocol/sdk` | MCP server framework | — |
| `cheerio` | HTML parsing (jQuery-like API) | ~200KB |
| `ssl-checker` | SSL certificate validation | ~5KB |
| `zod` | Schema validation | — |

No Puppeteer (200MB+), no Lighthouse, no heavy browser engines.

## License

MIT
