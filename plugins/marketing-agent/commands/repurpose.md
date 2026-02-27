---
name: repurpose
description: Turn existing content (blog post, README, article) into social media posts for all platforms
allowed-tools: Read, Glob, social_adapt_content, social_get_character_limits, social_post_bluesky, social_post_mastodon, social_post_all
---

# /repurpose — Repurpose Content for Social Media

Transform existing content into platform-specific social media posts.

## Usage

```
/repurpose [path to content file or URL]
```

## What This Does

Takes a blog post, README, article, or any text content and generates:
- 3-5 standalone social posts per platform (Bluesky + Mastodon)
- 1 thread version (3-5 connected posts)
- Platform-adapted versions with proper hashtags and tone

## Examples

```
/repurpose ./blog/2026-02-new-feature.md
/repurpose README.md
/repurpose ./changelog.md
```

## Process

1. Read and analyze the source content
2. Extract shareable units: key stats, insights, hooks, takeaways
3. Generate platform-specific versions:
   - **Bluesky** (300 chars): Punchy, conversational, 1-2 hashtags
   - **Mastodon** (500 chars): Detailed, CamelCase hashtags, 3-5 tags
4. Create a thread version breaking down the key points
5. Present all drafts grouped by platform
6. Post to selected platforms after user approval

## Output Format

Presents all generated posts organized by platform:

```
## Bluesky Posts (3 ready)
1. [Announcement] — 285/300 chars
2. [Key insight] — 292/300 chars
3. [Question post] — 245/300 chars

## Mastodon Posts (3 ready)
1. [Detailed announcement] — 478/500 chars
2. [Thread opener] — 490/500 chars
3. [How-to highlight] — 455/500 chars
```

## Important

- Shows drafts before posting — never auto-publishes
- Each post stands alone (doesn't require reading the original)
- Posts are rewritten for each platform, not truncated
- Includes link to source content in each post
