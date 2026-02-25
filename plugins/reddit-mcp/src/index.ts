/**
 * Reddit MCP Server — Model Context Protocol server for Reddit API access.
 *
 * Provides tools for browsing, searching, posting, and interacting with Reddit
 * content through authenticated OAuth2 API calls.
 *
 * Requires environment variables:
 *   REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  RedditClient,
  formatPosts,
  formatComments,
  formatSubredditInfo,
  formatSubredditSearch,
  formatUserInfo,
} from "./reddit-client.js";

// ─── Validate environment ─────────────────────────────────────────

const REQUIRED_ENV = [
  "REDDIT_CLIENT_ID",
  "REDDIT_CLIENT_SECRET",
  "REDDIT_USERNAME",
  "REDDIT_PASSWORD",
] as const;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const client = new RedditClient({
  clientId: process.env.REDDIT_CLIENT_ID!,
  clientSecret: process.env.REDDIT_CLIENT_SECRET!,
  username: process.env.REDDIT_USERNAME!,
  password: process.env.REDDIT_PASSWORD!,
});

// ─── Create MCP Server ────────────────────────────────────────────

const server = new McpServer({
  name: "reddit",
  version: "1.0.0",
});

// ─── Read Tools ───────────────────────────────────────────────────

server.tool(
  "reddit_search_posts",
  `Search for posts across Reddit or within a specific subreddit.

Use this tool when you need to find discussions, threads, or content about a topic on Reddit. Supports filtering by subreddit, sort order, and time range.

Do NOT use this tool for:
- Searching for subreddits themselves (use reddit_search_subreddits instead)
- Getting the latest posts from a subreddit feed (use reddit_get_subreddit instead)

Limitations:
- Returns a maximum of 100 posts per query (Reddit API limit)
- Reddit search can be imprecise — broad queries may return loosely related results
- NSFW content is included in results but flagged
- Deleted or removed posts may still appear in search results with empty bodies
- Rate limited by Reddit API (60 requests/minute)

Returns: Markdown-formatted list of posts with title, author, score, comment count, upvote ratio, text preview (first 300 chars for self posts), permalink, and fullname identifier.`,
  {
    query: z.string().describe("Search query string"),
    subreddit: z
      .string()
      .optional()
      .describe(
        "Restrict search to a specific subreddit (e.g. 'typescript'). Omit to search all of Reddit."
      ),
    sort: z
      .enum(["relevance", "hot", "top", "new", "comments"])
      .optional()
      .describe("Sort order for results. Default: 'relevance'"),
    time: z
      .enum(["hour", "day", "week", "month", "year", "all"])
      .optional()
      .describe(
        "Time range filter. Only applies when sort is 'top' or 'relevance'. Default: 'all'"
      ),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Number of results to return (1-100). Default: 10"),
  },
  async ({ query, subreddit, sort, time, limit }) => {
    const data = await client.searchPosts(query, {
      subreddit,
      sort,
      time,
      limit,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: formatPosts(data as Parameters<typeof formatPosts>[0]),
        },
      ],
    };
  }
);

server.tool(
  "reddit_get_subreddit",
  `Get the latest posts from a subreddit's feed (hot, new, top, rising).

Use this tool when you want to browse a subreddit's current content — its front page, newest posts, or top posts in a time range. Good for monitoring subreddits or getting a pulse on community activity.

Do NOT use this tool for:
- Searching for specific topics (use reddit_search_posts instead)
- Getting subreddit metadata like subscriber count (use reddit_get_subreddit_info instead)

Limitations:
- Returns a maximum of 100 posts per request
- The 'rising' sort is volatile and changes frequently
- Private or quarantined subreddits may not be accessible
- Rate limited by Reddit API (60 requests/minute)

Returns: Markdown-formatted list of posts with title, author, score, comment count, upvote ratio, text preview, permalink, and fullname identifier.`,
  {
    subreddit: z
      .string()
      .describe(
        "Subreddit name without the r/ prefix (e.g. 'typescript', 'webdev')"
      ),
    sort: z
      .enum(["hot", "new", "top", "rising"])
      .optional()
      .describe("Sort order for the feed. Default: 'hot'"),
    time: z
      .enum(["hour", "day", "week", "month", "year", "all"])
      .optional()
      .describe(
        "Time range filter. Only applies when sort is 'top'. Default: 'day'"
      ),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Number of posts to return (1-100). Default: 10"),
  },
  async ({ subreddit, sort, time, limit }) => {
    const data = await client.getSubreddit(subreddit, { sort, time, limit });
    return {
      content: [
        {
          type: "text" as const,
          text: formatPosts(data as Parameters<typeof formatPosts>[0]),
        },
      ],
    };
  }
);

server.tool(
  "reddit_get_comments",
  `Get comments on a specific Reddit post, with nested reply threads.

Use this tool when you need to read the discussion on a specific post — to understand community sentiment, find answers, or analyze a conversation thread.

Do NOT use this tool for:
- Getting posts from a subreddit (use reddit_get_subreddit instead)
- Searching for posts (use reddit_search_posts instead)

Limitations:
- Returns a maximum of 500 comments per request (Reddit API limit)
- Deeply nested replies beyond maxDepth (default 3) are truncated
- Comment bodies longer than 500 characters are truncated in output
- "More comments" stubs are not automatically expanded
- Rate limited by Reddit API (60 requests/minute)

Returns: Markdown-formatted comment tree with author, score, body text (up to 500 chars), fullname identifier, and nested replies up to the specified depth.`,
  {
    subreddit: z
      .string()
      .describe(
        "Subreddit name without the r/ prefix (e.g. 'typescript')"
      ),
    post_id: z
      .string()
      .describe(
        "The post ID (the alphanumeric string from the URL, e.g. '1abc2de'). NOT the fullname — do not include the 't3_' prefix."
      ),
    sort: z
      .enum(["best", "top", "new", "controversial", "old", "qa"])
      .optional()
      .describe("Sort order for comments. Default: 'best'"),
    limit: z
      .number()
      .min(1)
      .max(500)
      .optional()
      .describe("Maximum number of top-level comments to return (1-500). Default: 25"),
  },
  async ({ subreddit, post_id, sort, limit }) => {
    const data = await client.getComments(subreddit, post_id, { sort, limit });
    return {
      content: [
        {
          type: "text" as const,
          text: formatComments(data as unknown[]),
        },
      ],
    };
  }
);

server.tool(
  "reddit_get_subreddit_info",
  `Get metadata and stats about a subreddit — subscriber count, description, active users, and rules.

Use this tool when you need to understand what a subreddit is about, check its size, or verify it exists before posting or searching.

Do NOT use this tool for:
- Browsing posts in a subreddit (use reddit_get_subreddit instead)
- Finding subreddits by topic (use reddit_search_subreddits instead)

Limitations:
- Private subreddits return limited or no data
- Quarantined subreddits may require opt-in
- Active user count is an estimate and updates with delay
- Rate limited by Reddit API (60 requests/minute)

Returns: Markdown-formatted subreddit profile with display name, title, description, subscriber count, active user count, NSFW flag, and URL.`,
  {
    subreddit: z
      .string()
      .describe(
        "Subreddit name without the r/ prefix (e.g. 'typescript', 'webdev')"
      ),
  },
  async ({ subreddit }) => {
    const data = await client.getSubredditInfo(subreddit);
    return {
      content: [
        {
          type: "text" as const,
          text: formatSubredditInfo(
            data as Parameters<typeof formatSubredditInfo>[0]
          ),
        },
      ],
    };
  }
);

server.tool(
  "reddit_search_subreddits",
  `Search for subreddits by name or topic.

Use this tool when you need to discover relevant subreddits for a topic — for example, finding the best communities for TypeScript discussion, or checking what subreddits exist for a niche topic.

Do NOT use this tool for:
- Searching for posts/content (use reddit_search_posts instead)
- Getting info about a known subreddit (use reddit_get_subreddit_info instead)

Limitations:
- Returns a maximum of 100 subreddits per query
- Search matches subreddit names and descriptions, not post content
- Very new or very small subreddits may not appear in results
- Rate limited by Reddit API (60 requests/minute)

Returns: Numbered list of subreddits with display name, title, subscriber count, and short description (up to 150 chars).`,
  {
    query: z.string().describe("Search query for subreddit names/topics"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Number of results to return (1-100). Default: 10"),
  },
  async ({ query, limit }) => {
    const data = await client.searchSubreddits(query, { limit });
    return {
      content: [
        {
          type: "text" as const,
          text: formatSubredditSearch(
            data as Parameters<typeof formatSubredditSearch>[0]
          ),
        },
      ],
    };
  }
);

server.tool(
  "reddit_get_user",
  `Get a Reddit user's public profile — karma, account age, and bio.

Use this tool when you need to look up a Reddit user's public information, check account age, or see their karma scores.

Do NOT use this tool for:
- Getting the authenticated account's info (use reddit_get_me instead)
- Reading a user's posts or comments (not yet supported)

Limitations:
- Only returns public profile data — no private info
- Suspended or deleted accounts return errors
- Some users hide karma or profile details
- Rate limited by Reddit API (60 requests/minute)

Returns: Markdown-formatted user profile with username, join date, link karma, comment karma, Reddit Premium status, and bio (if set).`,
  {
    username: z
      .string()
      .describe("Reddit username without the u/ prefix (e.g. 'spez')"),
  },
  async ({ username }) => {
    const data = await client.getUserInfo(username);
    return {
      content: [
        {
          type: "text" as const,
          text: formatUserInfo(
            data as Parameters<typeof formatUserInfo>[0]
          ),
        },
      ],
    };
  }
);

server.tool(
  "reddit_get_me",
  `Get the authenticated Reddit account's profile info.

Use this tool to verify the connected Reddit account, check karma, or confirm authentication is working.

Do NOT use this tool for:
- Looking up other users (use reddit_get_user instead)

Limitations:
- Returns only the account linked via REDDIT_USERNAME/REDDIT_PASSWORD
- Requires valid OAuth2 credentials
- Rate limited by Reddit API (60 requests/minute)

Returns: JSON object with the authenticated user's profile data including name, karma, and account details.`,
  {},
  async () => {
    const data = await client.getMe();
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

// ─── Write Tools ──────────────────────────────────────────────────

server.tool(
  "reddit_submit_post",
  `Submit a new text or link post to a subreddit.

Use this tool when you need to create a new post on Reddit. Supports both self (text) posts and link posts. Optionally attach a flair.

IMPORTANT: This is a write operation — it creates public content on Reddit under the authenticated account. Confirm with the user before submitting.

Do NOT use this tool for:
- Replying to existing posts (use reddit_comment instead)
- Voting on posts (use reddit_vote instead)

Limitations:
- Requires the authenticated account to have posting permissions in the target subreddit
- Some subreddits have minimum karma/age requirements
- Post titles are limited to 300 characters by Reddit
- Self post body supports Reddit markdown
- Flair may be required by some subreddits — check subreddit rules first
- Rate limited by Reddit API — new accounts have stricter limits
- Cannot post images or videos (only text and links)

Returns: JSON response from Reddit containing the new post's fullname, URL, and any errors.`,
  {
    subreddit: z
      .string()
      .describe(
        "Target subreddit name without r/ prefix (e.g. 'typescript')"
      ),
    title: z
      .string()
      .max(300)
      .describe("Post title (max 300 characters)"),
    text: z
      .string()
      .optional()
      .describe(
        "Post body text in Reddit markdown format. Required for self/text posts. Omit for link posts."
      ),
    url: z
      .string()
      .url()
      .optional()
      .describe(
        "URL for link posts. If provided, creates a link post instead of a text post."
      ),
    flair_id: z
      .string()
      .optional()
      .describe(
        "Flair template ID to apply to the post. Get available flairs from subreddit info."
      ),
  },
  async ({ subreddit, title, text, url, flair_id }) => {
    const data = await client.submitPost(subreddit, title, {
      text,
      url,
      flair_id,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "reddit_comment",
  `Post a comment or reply on a Reddit post or comment.

Use this tool to reply to a post or to reply to an existing comment in a thread. Uses Reddit's "fullname" identifier (e.g. t3_abc123 for posts, t1_xyz789 for comments).

IMPORTANT: This is a write operation — it creates public content on Reddit under the authenticated account. Confirm with the user before commenting.

Do NOT use this tool for:
- Creating new posts (use reddit_submit_post instead)
- Voting on content (use reddit_vote instead)

Limitations:
- Requires the authenticated account to have commenting permissions
- Some subreddits restrict comments (approved users only, minimum karma, etc.)
- Comment body supports Reddit markdown
- The parent_fullname must be a valid Reddit fullname (t3_ for posts, t1_ for comments)
- Rate limited by Reddit API — new accounts have stricter limits
- Cannot edit or delete comments after posting

Returns: JSON response from Reddit containing the new comment's fullname, body, and any errors.`,
  {
    parent_fullname: z
      .string()
      .describe(
        "Reddit fullname of the post or comment to reply to. Format: 't3_<post_id>' for posts, 't1_<comment_id>' for comments. Get these from search/feed results."
      ),
    text: z
      .string()
      .describe("Comment body in Reddit markdown format"),
  },
  async ({ parent_fullname, text }) => {
    const data = await client.comment(parent_fullname, text);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "reddit_vote",
  `Upvote, downvote, or remove a vote on a Reddit post or comment.

Use this tool to vote on content. Uses Reddit's "fullname" identifier (e.g. t3_abc123 for posts, t1_xyz789 for comments).

Do NOT use this tool for:
- Creating posts or comments (use reddit_submit_post or reddit_comment)
- Searching or browsing (use the read tools)

Limitations:
- Votes are tied to the authenticated account
- Vote manipulation (mass voting) violates Reddit TOS
- The fullname must be a valid Reddit fullname (t3_ for posts, t1_ for comments)
- Rate limited by Reddit API (60 requests/minute)
- Cannot see current vote state — only set a new one

Returns: Empty response on success (HTTP 200). Errors are thrown as exceptions.`,
  {
    fullname: z
      .string()
      .describe(
        "Reddit fullname of the post or comment to vote on. Format: 't3_<post_id>' for posts, 't1_<comment_id>' for comments."
      ),
    direction: z
      .enum(["up", "down", "none"])
      .describe(
        "Vote direction: 'up' = upvote (+1), 'down' = downvote (-1), 'none' = remove vote (0)"
      ),
  },
  async ({ fullname, direction }) => {
    const dirMap = { up: 1, down: -1, none: 0 } as const;
    const data = await client.vote(fullname, dirMap[direction]);
    return {
      content: [
        {
          type: "text" as const,
          text: data
            ? JSON.stringify(data, null, 2)
            : `Vote '${direction}' applied to ${fullname}`,
        },
      ],
    };
  }
);

// ─── Start Server ─────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Reddit MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
