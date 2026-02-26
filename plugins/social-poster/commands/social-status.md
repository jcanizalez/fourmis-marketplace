---
name: social-status
description: Check which social media platforms are configured and connected
---

# /social-status — Platform Connection Check

Check the status of all configured social media platforms.

## Steps

1. Run `social_platform_status` to test connectivity for all platforms
2. If any platform shows errors, suggest troubleshooting steps:
   - **Bluesky auth error**: Verify BLUESKY_IDENTIFIER is your full handle (e.g. alice.bsky.social) and BLUESKY_APP_PASSWORD is an app password (not your account password) generated at Settings > App Passwords
   - **Mastodon auth error**: Verify MASTODON_INSTANCE is just the domain (e.g. mastodon.social, no https://) and MASTODON_ACCESS_TOKEN has write:statuses scope
3. Show a summary of connected accounts with handles and follower counts
