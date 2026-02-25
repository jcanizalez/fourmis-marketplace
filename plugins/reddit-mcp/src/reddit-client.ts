/**
 * Reddit API client — handles OAuth2 authentication and all API calls.
 *
 * Uses Reddit's "script" app type with password grant flow:
 * - POST to https://www.reddit.com/api/v1/access_token with client credentials
 * - Use Bearer token for all subsequent requests to https://oauth.reddit.com
 * - Tokens expire after 1 hour, auto-refreshed on 401
 */

const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const API_BASE = "https://oauth.reddit.com";
const USER_AGENT = "fourmis-reddit-mcp/1.0.0";

interface RedditToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  obtained_at: number;
}

interface RedditConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
}

export class RedditClient {
  private config: RedditConfig;
  private token: RedditToken | null = null;

  constructor(config: RedditConfig) {
    this.config = config;
  }

  /**
   * Authenticate with Reddit using password grant (script app type).
   * Auto-called before any API request if no valid token exists.
   */
  private async authenticate(): Promise<void> {
    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString("base64");

    const body = new URLSearchParams({
      grant_type: "password",
      username: this.config.username,
      password: this.config.password,
    });

    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Reddit authentication failed (${response.status}): ${text}`
      );
    }

    const data = (await response.json()) as Omit<RedditToken, "obtained_at">;
    this.token = { ...data, obtained_at: Date.now() };
  }

  /**
   * Check if the current token is still valid (not expired).
   */
  private isTokenValid(): boolean {
    if (!this.token) return false;
    const elapsed = (Date.now() - this.token.obtained_at) / 1000;
    return elapsed < this.token.expires_in - 60; // 60s buffer
  }

  /**
   * Make an authenticated request to the Reddit API.
   * Handles token refresh automatically.
   */
  async request(
    method: string,
    path: string,
    params?: Record<string, string>,
    body?: Record<string, string>
  ): Promise<unknown> {
    if (!this.isTokenValid()) {
      await this.authenticate();
    }

    let url = `${API_BASE}${path}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token!.access_token}`,
      "User-Agent": USER_AGENT,
    };

    const fetchOptions: RequestInit = { method, headers };

    if (body) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      fetchOptions.body = new URLSearchParams(body).toString();
    }

    const response = await fetch(url, fetchOptions);

    // Auto-refresh on 401
    if (response.status === 401) {
      await this.authenticate();
      headers.Authorization = `Bearer ${this.token!.access_token}`;
      const retryResponse = await fetch(url, { method, headers });
      if (!retryResponse.ok) {
        throw new Error(`Reddit API error (${retryResponse.status}): ${await retryResponse.text()}`);
      }
      return retryResponse.json();
    }

    if (!response.ok) {
      throw new Error(`Reddit API error (${response.status}): ${await response.text()}`);
    }

    return response.json();
  }

  // ─── Read Operations ─────────────────────────────────────────────

  /**
   * Search posts across Reddit or within a specific subreddit.
   */
  async searchPosts(
    query: string,
    options: {
      subreddit?: string;
      sort?: string;
      time?: string;
      limit?: number;
    } = {}
  ): Promise<unknown> {
    const path = options.subreddit
      ? `/r/${options.subreddit}/search`
      : "/search";
    return this.request("GET", path, {
      q: query,
      sort: options.sort || "relevance",
      t: options.time || "all",
      limit: String(options.limit || 10),
      restrict_sr: options.subreddit ? "true" : "false",
      type: "link",
    });
  }

  /**
   * Get posts from a subreddit feed.
   */
  async getSubreddit(
    subreddit: string,
    options: { sort?: string; time?: string; limit?: number } = {}
  ): Promise<unknown> {
    const sort = options.sort || "hot";
    return this.request("GET", `/r/${subreddit}/${sort}`, {
      t: options.time || "day",
      limit: String(options.limit || 10),
    });
  }

  /**
   * Get comments on a specific post.
   */
  async getComments(
    subreddit: string,
    postId: string,
    options: { sort?: string; limit?: number } = {}
  ): Promise<unknown> {
    return this.request("GET", `/r/${subreddit}/comments/${postId}`, {
      sort: options.sort || "best",
      limit: String(options.limit || 25),
    });
  }

  /**
   * Get info about a subreddit.
   */
  async getSubredditInfo(subreddit: string): Promise<unknown> {
    return this.request("GET", `/r/${subreddit}/about`);
  }

  /**
   * Search for subreddits by name/topic.
   */
  async searchSubreddits(
    query: string,
    options: { limit?: number } = {}
  ): Promise<unknown> {
    return this.request("GET", "/subreddits/search", {
      q: query,
      limit: String(options.limit || 10),
    });
  }

  /**
   * Get a user's profile and recent activity.
   */
  async getUserInfo(username: string): Promise<unknown> {
    return this.request("GET", `/user/${username}/about`);
  }

  /**
   * Get the authenticated user's info.
   */
  async getMe(): Promise<unknown> {
    return this.request("GET", "/api/v1/me");
  }

  // ─── Write Operations ────────────────────────────────────────────

  /**
   * Submit a new post (text or link).
   */
  async submitPost(
    subreddit: string,
    title: string,
    options: { text?: string; url?: string; flair_id?: string } = {}
  ): Promise<unknown> {
    const body: Record<string, string> = {
      sr: subreddit,
      title,
      kind: options.url ? "link" : "self",
      api_type: "json",
    };
    if (options.text) body.text = options.text;
    if (options.url) body.url = options.url;
    if (options.flair_id) body.flair_id = options.flair_id;

    return this.request("POST", "/api/submit", undefined, body);
  }

  /**
   * Post a comment or reply to a post/comment.
   */
  async comment(parentFullname: string, text: string): Promise<unknown> {
    return this.request("POST", "/api/comment", undefined, {
      thing_id: parentFullname,
      text,
      api_type: "json",
    });
  }

  /**
   * Upvote, downvote, or remove vote on a post/comment.
   */
  async vote(
    fullname: string,
    direction: 1 | 0 | -1
  ): Promise<unknown> {
    return this.request("POST", "/api/vote", undefined, {
      id: fullname,
      dir: String(direction),
    });
  }
}

// ─── Formatting Helpers ────────────────────────────────────────────

interface RedditPost {
  data: {
    id: string;
    name: string;
    title: string;
    author: string;
    subreddit: string;
    score: number;
    num_comments: number;
    url: string;
    selftext: string;
    created_utc: number;
    permalink: string;
    is_self: boolean;
    link_flair_text?: string;
    over_18: boolean;
    upvote_ratio: number;
  };
}

interface RedditComment {
  data: {
    id: string;
    name: string;
    author: string;
    body: string;
    score: number;
    created_utc: number;
    permalink: string;
    depth: number;
    replies?: { data: { children: RedditComment[] } };
  };
}

interface RedditSubreddit {
  data: {
    display_name: string;
    title: string;
    public_description: string;
    subscribers: number;
    active_user_count: number;
    created_utc: number;
    over18: boolean;
    url: string;
  };
}

export function formatPosts(data: { data: { children: RedditPost[] } }): string {
  const posts = data.data.children;
  if (posts.length === 0) return "No posts found.";

  return posts
    .map((p, i) => {
      const d = p.data;
      const date = new Date(d.created_utc * 1000).toISOString().split("T")[0];
      const nsfw = d.over_18 ? " [NSFW]" : "";
      const flair = d.link_flair_text ? ` [${d.link_flair_text}]` : "";
      let text = `### ${i + 1}. ${d.title}${nsfw}${flair}\n`;
      text += `**r/${d.subreddit}** | u/${d.author} | ${date}\n`;
      text += `Score: ${d.score} | Comments: ${d.num_comments} | Upvote ratio: ${(d.upvote_ratio * 100).toFixed(0)}%\n`;
      if (d.is_self && d.selftext) {
        const preview = d.selftext.length > 300 ? d.selftext.slice(0, 300) + "..." : d.selftext;
        text += `\n${preview}\n`;
      } else if (!d.is_self) {
        text += `Link: ${d.url}\n`;
      }
      text += `Permalink: https://reddit.com${d.permalink}\n`;
      text += `Fullname: ${d.name}`;
      return text;
    })
    .join("\n\n---\n\n");
}

export function formatComments(
  data: unknown[],
  maxDepth: number = 3
): string {
  if (!Array.isArray(data) || data.length < 2) return "No comments found.";

  // First element is the post, second is comments
  const commentListing = (data as { data: { children: RedditComment[] } }[])[1];
  const comments = commentListing.data.children;

  function renderComment(c: RedditComment, depth: number): string {
    if (!c.data || !c.data.body || c.data.author === undefined) return "";
    const indent = "  ".repeat(depth);
    const d = c.data;
    let text = `${indent}**u/${d.author}** (${d.score} pts)\n`;
    const body = d.body.length > 500 ? d.body.slice(0, 500) + "..." : d.body;
    text += body.split("\n").map((line) => `${indent}${line}`).join("\n");
    text += `\n${indent}Fullname: ${d.name}\n`;

    if (depth < maxDepth && d.replies && d.replies.data) {
      for (const reply of d.replies.data.children) {
        text += "\n" + renderComment(reply, depth + 1);
      }
    }
    return text;
  }

  return comments
    .filter((c) => c.data && c.data.body)
    .map((c) => renderComment(c, 0))
    .join("\n---\n");
}

export function formatSubredditInfo(data: { data: RedditSubreddit["data"] }): string {
  const d = data.data;
  let text = `## r/${d.display_name}\n`;
  text += `**${d.title}**\n\n`;
  text += d.public_description ? `${d.public_description}\n\n` : "";
  text += `Subscribers: ${d.subscribers?.toLocaleString() || "unknown"}\n`;
  text += `Active users: ${d.active_user_count?.toLocaleString() || "unknown"}\n`;
  text += `NSFW: ${d.over18 ? "Yes" : "No"}\n`;
  text += `URL: https://reddit.com${d.url}`;
  return text;
}

export function formatSubredditSearch(data: { data: { children: RedditSubreddit[] } }): string {
  const subs = data.data.children;
  if (subs.length === 0) return "No subreddits found.";

  return subs
    .map((s, i) => {
      const d = s.data;
      let text = `${i + 1}. **r/${d.display_name}** — ${d.title}\n`;
      text += `   ${d.subscribers?.toLocaleString() || "?"} subscribers`;
      if (d.public_description) {
        const desc = d.public_description.length > 150
          ? d.public_description.slice(0, 150) + "..."
          : d.public_description;
        text += `\n   ${desc}`;
      }
      return text;
    })
    .join("\n\n");
}

export function formatUserInfo(data: { data: { name: string; link_karma: number; comment_karma: number; created_utc: number; is_gold: boolean; subreddit?: { display_name: string; public_description: string } } }): string {
  const d = data.data;
  const created = new Date(d.created_utc * 1000).toISOString().split("T")[0];
  let text = `## u/${d.name}\n`;
  text += `Joined: ${created}\n`;
  text += `Link karma: ${d.link_karma?.toLocaleString()}\n`;
  text += `Comment karma: ${d.comment_karma?.toLocaleString()}\n`;
  text += `Reddit Premium: ${d.is_gold ? "Yes" : "No"}`;
  if (d.subreddit?.public_description) {
    text += `\n\nBio: ${d.subreddit.public_description}`;
  }
  return text;
}
