# reddit-mcp

Full Reddit integration for Claude Code via MCP (Model Context Protocol). Browse subreddits, search posts, read comment threads, submit posts, comment, and vote — all through authenticated Reddit API calls.

## Tools

| Tool | Type | Description |
|------|------|-------------|
| `reddit_search_posts` | Read | Search posts across Reddit or within a subreddit |
| `reddit_get_subreddit` | Read | Browse a subreddit feed (hot, new, top, rising) |
| `reddit_get_comments` | Read | Get comments on a specific post |
| `reddit_get_subreddit_info` | Read | Get subreddit metadata and stats |
| `reddit_search_subreddits` | Read | Find subreddits by name or topic |
| `reddit_get_user` | Read | Look up a user's public profile |
| `reddit_get_me` | Read | Get the authenticated account's info |
| `reddit_submit_post` | Write | Submit a new text or link post |
| `reddit_comment` | Write | Reply to a post or comment |
| `reddit_vote` | Write | Upvote, downvote, or remove vote |

## Commands

- **`/reddit`** — Browse, search, and interact with Reddit from the CLI

## Skills

- **Reddit Engagement** — Research, monitor, and engage with Reddit communities

## Setup

This plugin requires a Reddit "script" app for OAuth2 authentication.

### 1. Create a Reddit App

1. Go to [https://www.reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
2. Click "create another app..."
3. Select **"script"** as the app type
4. Set redirect URI to `http://localhost:8080` (not used but required)
5. Note the **client ID** (under the app name) and **client secret**

### 2. Configure Environment Variables

After installing the plugin, update the MCP configuration with your credentials:

```json
{
  "reddit": {
    "type": "stdio",
    "command": "node",
    "args": ["${CLAUDE_PLUGIN_ROOT}/dist/index.js"],
    "env": {
      "REDDIT_CLIENT_ID": "your_client_id",
      "REDDIT_CLIENT_SECRET": "your_client_secret",
      "REDDIT_USERNAME": "your_reddit_username",
      "REDDIT_PASSWORD": "your_reddit_password"
    }
  }
}
```

### 3. Build

```bash
cd plugins/reddit-mcp
npm install
npm run build
```

## Rate Limits

Reddit's API allows approximately 60 requests per minute. The MCP server handles authentication and token refresh automatically.

## License

MIT
