---
name: market
description: End-to-end content marketing — create content, optimize for SEO, and distribute across social platforms
allowed-tools: Read, Write, Glob, Grep, Task, social_post_bluesky, social_post_mastodon, social_post_all, social_adapt_content, social_get_character_limits, seo_analyze_page, seo_check_meta_tags, seo_check_headings
---

# /market — Full Content Marketing Pipeline

Create and distribute marketing content end-to-end.

## Usage

```
/market [topic or content description]
```

## What This Does

Runs the complete content marketing pipeline:

1. **Research** — Understand the topic, audience, and angle
2. **Create** — Draft content using blog-writing and SEO-writing best practices
3. **Optimize** — Run SEO checks on the content (meta tags, headings, structure)
4. **Distribute** — Adapt content for Bluesky and Mastodon, generate platform-specific posts
5. **Report** — Summarize all created assets with links

## Examples

```
/market "Announce our new CLI tool for database migrations"
/market "Write a blog post about TypeScript best practices and share on social"
/market "Create a technical tutorial on Docker multi-stage builds"
```

## Process

1. Ask clarifying questions if the topic is vague:
   - Target audience (developers, founders, general)?
   - Content format (blog post, tutorial, announcement)?
   - Platforms to distribute on?
2. Draft the content and save to a file
3. Run SEO optimization if it's a blog post or web page
4. Generate 3-5 social posts adapted for each platform
5. Present all drafts for review before publishing
6. Post to social platforms after user approval

## Important

- Always save content as files, not just chat output
- Show all social post drafts before publishing
- Include links to the source content in social posts
- Follow the content-marketing-strategy skill's pillar ratio guidelines
