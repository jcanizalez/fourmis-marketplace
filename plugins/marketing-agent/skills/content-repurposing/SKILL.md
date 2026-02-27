# Content Repurposing

Turn one piece of content into many — maximize reach by adapting content across formats and platforms. Activate when the user wants to repurpose, redistribute, or adapt existing content for different channels.

## When to Activate

Activate when the user:
- Has written a blog post and wants social posts from it
- Wants to repurpose content across platforms
- Asks to "turn this into social posts", "promote this article"
- Mentions "repurposing", "cross-posting", "content recycling"

## The 1-to-10 Rule

Every substantial piece of content (blog post, tutorial, README) contains at least 10 social-ready fragments:

```
1 Blog Post (1500 words)
├── 1 announcement post (all platforms)
├── 1 thread (3-5 posts breaking down key points)
├── 2-3 standalone insight posts (one per key section)
├── 1-2 question/engagement posts (invite discussion)
├── 1 quote/stat post (the most shareable data point)
├── 1 "TL;DR" summary post
└── 1 "behind the scenes" post (why you wrote this)
```

## Extraction Patterns

### From Blog Posts
| Source Section | Social Post Type | Example |
|---------------|-----------------|---------|
| Title | Announcement | "Just published: [Title]. Here's why it matters..." |
| Introduction hook | Standalone post | "Most people think X. Here's why that's wrong..." |
| Key statistic | Data post | "We found that 73% of developers..." |
| Each H2 section | Tip/insight post | "One thing I learned about X: [key insight]" |
| Conclusion/CTA | Action post | "If you're dealing with X, try this approach..." |
| Whole article | Thread | Break into 3-5 post thread |

### From READMEs
| Source Section | Social Post Type |
|---------------|-----------------|
| One-liner description | Product announcement |
| Problem statement | Pain point post |
| Features list | "X things [tool] does for you" |
| Installation section | Quick start post |
| Usage example | "How to [use case] with [tool]" |

### From Changelogs
| Source Section | Social Post Type |
|---------------|-----------------|
| Breaking changes | Important update post |
| New features | "Just shipped" announcement |
| Bug fixes (major) | "Fixed the thing where..." |
| Multiple updates | "What's new this week" roundup |

## Platform Adaptation Rules

### Length Adaptation

| Source Length | Bluesky (300) | Mastodon (500) |
|-------------|---------------|----------------|
| 1 sentence | Use as-is + hashtags | Expand with context + hashtags |
| 1 paragraph | Extract core message | Use full paragraph + hashtags |
| Full article | Hook + key takeaway + link | Summary + key insight + link + hashtags |

### Tone Adaptation

| Platform | Tone | Structure |
|----------|------|-----------|
| Bluesky | Casual, punchy, conversational | Short sentences. Bold claims. Questions. |
| Mastodon | Thoughtful, detailed, community-aware | Longer context. CamelCase hashtags. CW when appropriate. |

### Hashtag Strategy

**Bluesky**: 1-2 hashtags, placed naturally or at end
```
Just shipped a faster build pipeline. 40% reduction in CI time.
#DevOps #CI
```

**Mastodon**: 3-5 hashtags, CamelCase, always at end
```
Just shipped a faster build pipeline with 40% reduction in CI time.

Here's what we changed and why it matters for large monorepos.

#DevOps #ContinuousIntegration #BuildOptimization #OpenSource #WebDev
```

## Quality Checklist for Repurposed Content

For each repurposed post:
- [ ] Standalone — makes sense without reading the original
- [ ] Platform-native — reads like it was written for this platform
- [ ] Has a hook — first line grabs attention
- [ ] Not truncated — rewritten, not just cut off at the character limit
- [ ] Has CTA — link to full article or clear next step
- [ ] Adds value — not just "read my blog post" (share an actual insight)

## Anti-Patterns

| Don't | Do Instead |
|-------|-----------|
| Copy-paste the same text everywhere | Rewrite for each platform's tone and limits |
| Post all versions at once | Space out over days for sustained visibility |
| Only link-post ("Check out my article!") | Share a real insight + link as supporting resource |
| Use the same hook for every post | Vary angles: stat, question, hot take, tip |
| Ignore engagement after posting | Reply to comments within 24h |
