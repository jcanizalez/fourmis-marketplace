# Social Media Writing

Expert guidance for writing effective social media posts across Bluesky and Mastodon.

## When to Activate

Activate when the user asks to write, compose, or draft social media posts, or when using the social-poster plugin tools.

## Platform Character Limits

| Platform | Limit | Unit | Notes |
|----------|-------|------|-------|
| Bluesky | 300 | graphemes | Visual characters — most emojis count as 1 |
| Mastodon | 500 | characters | Default — some instances allow more |
| Cross-post safe | 300 | graphemes | Use this when posting to all platforms |

## Writing for Short-Form Social

### Structure Pattern

For posts under 300 characters:

```
[Hook — 1 sentence that grabs attention]
[Value — the key insight, tip, or announcement]
[CTA or hashtag — drive engagement]
```

### Hook Patterns

| Type | Example | Best For |
|------|---------|----------|
| Question | "Ever wonder why...?" | Engagement, discussions |
| Bold claim | "Most developers get this wrong:" | Hot takes, expertise |
| Stat/number | "3 tools that saved me 10h/week:" | Lists, productivity |
| Announcement | "Just shipped:" | Launches, updates |
| Thread opener | "Here's what I learned building X:" | Longer stories (thread) |

### Hashtag Strategy

**Bluesky:**
- Hashtags auto-detected with # prefix
- Keep to 1-3 per post — more looks spammy
- Place at the end or weave naturally into text
- Popular tech tags: #WebDev #TypeScript #OpenSource #DevOps

**Mastodon:**
- Hashtags are critical for discoverability (no algorithm)
- CamelCase for accessibility: #WebDev not #webdev
- 3-5 hashtags is optimal
- Can use content warnings (CW) for sensitive topics

## Platform-Specific Tone

### Bluesky
- Casual, conversational, Twitter-like
- Threads supported (reply chains)
- Mentions: @handle.bsky.social
- Community is tech-forward, early-adopter-heavy
- Alt text on images valued

### Mastodon
- More considered, long-form friendly
- Content warnings appreciated for politics, food, eye contact in photos
- Community norms vary by instance — fosstodon.org is FOSS-focused, etc.
- Boosts (reblogs) are the main discovery mechanism
- No algorithm — hashtags are the ONLY discoverability tool

## Cross-Post Adaptation

When adapting a single message for multiple platforms:

1. **Write for the strictest limit first** (Bluesky at 300)
2. **Expand for platforms with more room** — add hashtags for Mastodon
3. **Adjust tone** — Bluesky is punchier, Mastodon is more thoughtful
4. **Don't just copy-paste** — each platform's community expects native-feeling content

### Adaptation Example

**Original idea:** Announcing an open-source tool release

**Bluesky (280 chars):**
```
Just shipped social-poster — post to Bluesky + Mastodon from Claude Code with a single command. Compose once, publish everywhere. Open source.

github.com/example/social-poster
```

**Mastodon (490 chars):**
```
Just released social-poster — a Claude Code plugin that lets you publish to Bluesky and Mastodon from your terminal.

Write once, adapt for each platform's character limits, and post to all platforms simultaneously. No web UI needed.

Fully open source, MIT licensed.

github.com/example/social-poster

#OpenSource #ClaudeCode #Fediverse #WebDev #DevTools
```

## Engagement Best Practices

1. **Ask questions** — "What's your experience with X?" drives replies
2. **Share specific numbers** — "Reduced build time by 40%" beats "made it faster"
3. **Thread for depth** — break complex topics into 3-5 posts
4. **Time your posts** — weekday mornings (9-11 AM local) for tech audiences
5. **Reply to replies** — engagement begets engagement
6. **Give credit** — mention tools, people, and inspirations by handle
