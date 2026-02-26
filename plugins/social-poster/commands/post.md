---
name: post
description: Compose and publish a social media post to Bluesky, Mastodon, or all platforms
arguments:
  - name: content
    description: What to post about — a topic, announcement, or the full post text
    required: true
---

# /post — Publish to Social Media

You are helping the user compose and publish a social media post.

## Steps

1. **Analyze the input**: Is it a full ready-to-post message, or a topic/idea that needs drafting?

2. **If it's an idea/topic**, draft a post:
   - Check character limits with `social_get_character_limits`
   - Write a concise, engaging post following the social-media-writing skill
   - Present the draft and ask for approval before posting

3. **If it's a ready message**, check platform fit:
   - Use `social_adapt_content` to verify it fits all target platforms
   - If too long for any platform, suggest a shorter version

4. **Ask which platform(s)** to post to (if not specified):
   - Bluesky only
   - Mastodon only
   - All platforms (cross-post)

5. **Post the content**:
   - Single platform: use `social_post_bluesky` or `social_post_mastodon`
   - All platforms: use `social_post_all`

6. **Report results** with links to the published posts.

## Important

- ALWAYS confirm with the user before posting — never auto-post
- If cross-posting, ensure the text fits the strictest limit (300 for Bluesky)
- For Mastodon, ask about visibility (public/unlisted/private) if not specified
- Suggest relevant hashtags for Mastodon posts
