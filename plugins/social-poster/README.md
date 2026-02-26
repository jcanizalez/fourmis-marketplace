# social-poster

Cross-platform social media posting from Claude Code. Compose once, adapt for each platform's character limits, and publish to Bluesky and Mastodon — individually or simultaneously.

## Platforms

| Platform | Auth Method | Character Limit | Status |
|----------|------------|-----------------|--------|
| **Bluesky** | App password | 300 graphemes | Supported |
| **Mastodon** | OAuth2 access token | 500 chars (varies by instance) | Supported |

At least one platform must be configured. Unconfigured platforms are gracefully skipped.

## MCP Tools (8)

| Tool | Description |
|------|-------------|
| `social_post_bluesky` | Post to Bluesky with auto-detected mentions, links, and hashtags |
| `social_post_mastodon` | Post to Mastodon with visibility and content warning support |
| `social_post_all` | Cross-post to all configured platforms simultaneously |
| `social_get_profile` | Get authenticated profile from one or all platforms |
| `social_adapt_content` | Check if text fits each platform's character limits |
| `social_get_character_limits` | Get character limits for all configured platforms |
| `social_delete_post` | Delete a post from a specific platform |
| `social_platform_status` | Test platform connectivity and credentials |

## Commands (2)

| Command | Description |
|---------|-------------|
| `/post` | Compose and publish a social media post with guided flow |
| `/social-status` | Check which platforms are connected and working |

## Skills (1)

| Skill | Description |
|-------|-------------|
| **Social Media Writing** | Platform-specific writing guidance, hook patterns, hashtag strategy, cross-post adaptation |

## Setup

### 1. Install the plugin

```bash
fourmis plugin install social-poster
```

### 2. Configure platforms

Edit `.mcp.json` in the plugin directory and fill in credentials for your platforms:

#### Bluesky

1. Go to [Bluesky Settings > App Passwords](https://bsky.app/settings/app-passwords)
2. Create a new app password
3. Set environment variables:
   - `BLUESKY_IDENTIFIER`: Your handle (e.g. `alice.bsky.social`)
   - `BLUESKY_APP_PASSWORD`: The generated app password

#### Mastodon

1. Go to your instance's Preferences > Development > New Application
2. Create an app with `write:statuses` and `read:statuses` scopes
3. Copy the access token
4. Set environment variables:
   - `MASTODON_INSTANCE`: Your instance domain (e.g. `mastodon.social`)
   - `MASTODON_ACCESS_TOKEN`: The access token

## Usage Examples

### Post to all platforms
```
/post Just shipped v2.0 of my CLI tool — 3x faster with streaming support
```

### Check platform status
```
/social-status
```

### Cross-post with character limit check
```
Use social_adapt_content to check if my post fits, then social_post_all to publish
```

## Architecture

```
social-poster/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
├── .mcp.json                # MCP server configuration
├── skills/
│   └── social-media-writing/
│       └── SKILL.md         # Writing guidance for social platforms
├── commands/
│   ├── post.md              # /post command
│   └── social-status.md     # /social-status command
├── src/
│   ├── index.ts             # MCP server with 8 tools
│   ├── bluesky-client.ts    # Bluesky AT Protocol client
│   └── mastodon-client.ts   # Mastodon REST API client
├── package.json
├── tsconfig.json
└── README.md
```

## Why This Plugin?

Social media presence matters for developers and projects, but context-switching to web UIs breaks flow. This plugin lets you:

- **Post from your terminal** without leaving Claude Code
- **Cross-post efficiently** — write once, publish to multiple platforms
- **Check limits before posting** — no more "post too long" errors
- **Use AI to compose** — let Claude draft posts with platform-aware writing guidance

Supports the two most developer-friendly open platforms: Bluesky (AT Protocol) and Mastodon (ActivityPub). No walled gardens, no approval processes.

## License

MIT
