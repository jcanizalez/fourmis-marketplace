/**
 * Social Poster MCP Server — Cross-platform social media posting.
 *
 * Publish to Bluesky and Mastodon from Claude Code. Compose once,
 * adapt for each platform's character limits and formatting, then
 * publish to one or all platforms.
 *
 * Environment variables:
 *   Bluesky:  BLUESKY_IDENTIFIER, BLUESKY_APP_PASSWORD
 *   Mastodon: MASTODON_INSTANCE, MASTODON_ACCESS_TOKEN
 *
 * At least one platform must be configured. Unconfigured platforms
 * are gracefully skipped.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  BlueskyClient,
  formatBlueskyProfile,
  formatBlueskyPost,
} from "./bluesky-client.js";
import {
  MastodonClient,
  formatMastodonProfile,
  formatMastodonStatus,
} from "./mastodon-client.js";

// ─── Platform Detection ──────────────────────────────────────────

const BLUESKY_ENABLED =
  !!process.env.BLUESKY_IDENTIFIER && !!process.env.BLUESKY_APP_PASSWORD;
const MASTODON_ENABLED =
  !!process.env.MASTODON_INSTANCE && !!process.env.MASTODON_ACCESS_TOKEN;

if (!BLUESKY_ENABLED && !MASTODON_ENABLED) {
  console.error(
    "Error: No platforms configured. Set environment variables for at least one platform:\n" +
      "  Bluesky:  BLUESKY_IDENTIFIER + BLUESKY_APP_PASSWORD\n" +
      "  Mastodon: MASTODON_INSTANCE + MASTODON_ACCESS_TOKEN"
  );
  process.exit(1);
}

const enabledPlatforms: string[] = [];
if (BLUESKY_ENABLED) enabledPlatforms.push("bluesky");
if (MASTODON_ENABLED) enabledPlatforms.push("mastodon");

console.error(
  `Social Poster: platforms enabled — ${enabledPlatforms.join(", ")}`
);

// ─── Initialize Clients ──────────────────────────────────────────

let bluesky: BlueskyClient | null = null;
let mastodon: MastodonClient | null = null;

if (BLUESKY_ENABLED) {
  bluesky = new BlueskyClient({
    identifier: process.env.BLUESKY_IDENTIFIER!,
    appPassword: process.env.BLUESKY_APP_PASSWORD!,
    service: process.env.BLUESKY_SERVICE || undefined,
  });
}

if (MASTODON_ENABLED) {
  mastodon = new MastodonClient({
    instance: process.env.MASTODON_INSTANCE!,
    accessToken: process.env.MASTODON_ACCESS_TOKEN!,
  });
}

// ─── Character Limits ────────────────────────────────────────────

const PLATFORM_LIMITS: Record<string, { maxChars: number; name: string }> = {
  bluesky: { maxChars: 300, name: "Bluesky" },
  mastodon: { maxChars: 500, name: "Mastodon" },
};

// ─── Create MCP Server ──────────────────────────────────────────

const server = new McpServer({
  name: "social-poster",
  version: "1.0.0",
});

// ─── Tool: Post to Bluesky ───────────────────────────────────────

server.tool(
  "social_post_bluesky",
  `Publish a post to Bluesky via the AT Protocol.

Use this tool when you need to post content specifically to Bluesky. The post text is published as-is — mentions (@handle.bsky.social), links, and hashtags (#tag) are automatically detected and rendered as rich text.

Do NOT use this tool for:
- Posting to Mastodon (use social_post_mastodon instead)
- Posting to all platforms at once (use social_post_all instead)
- Adapting content for platform limits (use social_adapt_content first)

Limitations:
- Maximum 300 graphemes (visual characters, not bytes) per post
- Requires BLUESKY_IDENTIFIER and BLUESKY_APP_PASSWORD environment variables
- No image or video upload support (text-only posts)
- App password must be generated in Bluesky settings (not your account password)
- Rate limited by Bluesky — approximately 100 posts/day

Returns: Markdown-formatted result with post text, AT URI, CID, creation timestamp, and a direct link to the post on bsky.app.`,
  {
    text: z
      .string()
      .max(300)
      .describe(
        "Post text (max 300 graphemes). Mentions (@handle.bsky.social), links, and #hashtags are auto-detected."
      ),
  },
  async ({ text }) => {
    if (!bluesky) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: Bluesky is not configured. Set BLUESKY_IDENTIFIER and BLUESKY_APP_PASSWORD environment variables.",
          },
        ],
        isError: true,
      };
    }

    const result = await bluesky.post(text);
    return {
      content: [{ type: "text" as const, text: formatBlueskyPost(result) }],
    };
  }
);

// ─── Tool: Post to Mastodon ──────────────────────────────────────

server.tool(
  "social_post_mastodon",
  `Publish a status to a Mastodon-compatible instance.

Use this tool when you need to post content specifically to Mastodon (or compatible fediverse instances like Pleroma, Akkoma, etc.). Supports visibility settings and content warnings.

Do NOT use this tool for:
- Posting to Bluesky (use social_post_bluesky instead)
- Posting to all platforms at once (use social_post_all instead)
- Adapting content for platform limits (use social_adapt_content first)

Limitations:
- Default maximum 500 characters per post (varies by instance — check with social_get_character_limits)
- Requires MASTODON_INSTANCE and MASTODON_ACCESS_TOKEN environment variables
- No image or video upload support (text-only posts)
- Access token must have write:statuses scope
- Rate limited: 300 requests per 5 minutes per account

Returns: Markdown-formatted result with status text (HTML stripped), status ID, visibility level, creation timestamp, and direct URL to the status.`,
  {
    text: z
      .string()
      .describe(
        "Status text. Default max 500 characters (varies by instance). Supports plain text, mentions (@user@instance), and #hashtags."
      ),
    visibility: z
      .enum(["public", "unlisted", "private", "direct"])
      .optional()
      .describe(
        "Post visibility. 'public' = visible everywhere + public timelines. 'unlisted' = visible but not in public timelines. 'private' = followers only. 'direct' = mentioned users only. Default: 'public'"
      ),
    spoiler_text: z
      .string()
      .optional()
      .describe(
        "Content warning text. If provided, the post body is hidden behind this warning. Use for sensitive topics."
      ),
    language: z
      .string()
      .optional()
      .describe(
        "ISO 639-1 language code (e.g. 'en', 'es', 'de'). Helps with language filtering on timelines."
      ),
  },
  async ({ text, visibility, spoiler_text, language }) => {
    if (!mastodon) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: Mastodon is not configured. Set MASTODON_INSTANCE and MASTODON_ACCESS_TOKEN environment variables.",
          },
        ],
        isError: true,
      };
    }

    const result = await mastodon.post(text, {
      visibility,
      spoilerText: spoiler_text,
      language,
    });
    return {
      content: [
        { type: "text" as const, text: formatMastodonStatus(result) },
      ],
    };
  }
);

// ─── Tool: Post to All Platforms ─────────────────────────────────

server.tool(
  "social_post_all",
  `Publish a post to ALL configured platforms simultaneously.

Use this tool when you want to cross-post the same content to every enabled platform (Bluesky and/or Mastodon). Each platform receives the text as-is — use social_adapt_content first if you need platform-specific versions.

IMPORTANT: This is a write operation — it creates public content on multiple platforms. Confirm with the user before posting.

Do NOT use this tool for:
- Posting to a single specific platform (use social_post_bluesky or social_post_mastodon)
- Posting different content to each platform (call individual post tools separately)

Limitations:
- Text must fit within ALL platforms' character limits (300 for Bluesky if enabled, 500 for Mastodon if enabled)
- Posts are sent sequentially — if one platform fails, others may still succeed
- No rollback — if Bluesky succeeds but Mastodon fails, the Bluesky post remains
- No image or video support (text-only)
- Each platform's rate limits apply independently

Returns: Markdown-formatted results showing success/failure for each platform, with post IDs and links where successful.`,
  {
    text: z
      .string()
      .describe(
        "Post text to publish on all platforms. Must respect the strictest character limit across enabled platforms."
      ),
    mastodon_visibility: z
      .enum(["public", "unlisted", "private", "direct"])
      .optional()
      .describe("Mastodon visibility setting. Default: 'public'"),
  },
  async ({ text, mastodon_visibility }) => {
    const results: string[] = [];
    let hasError = false;

    // Post to Bluesky
    if (bluesky) {
      try {
        const bskyResult = await bluesky.post(text);
        results.push(
          `### Bluesky: SUCCESS\n${formatBlueskyPost(bskyResult)}`
        );
      } catch (err) {
        hasError = true;
        results.push(
          `### Bluesky: FAILED\n**Error:** ${err instanceof Error ? err.message : String(err)}`
        );
      }
    } else {
      results.push("### Bluesky: SKIPPED (not configured)");
    }

    // Post to Mastodon
    if (mastodon) {
      try {
        const mastoResult = await mastodon.post(text, {
          visibility: mastodon_visibility,
        });
        results.push(
          `### Mastodon: SUCCESS\n${formatMastodonStatus(mastoResult)}`
        );
      } catch (err) {
        hasError = true;
        results.push(
          `### Mastodon: FAILED\n**Error:** ${err instanceof Error ? err.message : String(err)}`
        );
      }
    } else {
      results.push("### Mastodon: SKIPPED (not configured)");
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `# Cross-Post Results\n\n${results.join("\n\n")}`,
        },
      ],
      isError: hasError,
    };
  }
);

// ─── Tool: Get Profile ───────────────────────────────────────────

server.tool(
  "social_get_profile",
  `Get the authenticated user's profile from one or all configured platforms.

Use this tool to verify that platform credentials are working, check follower counts, or confirm which accounts are connected.

Do NOT use this tool for:
- Posting content (use social_post_bluesky, social_post_mastodon, or social_post_all)
- Looking up other users' profiles (not supported — only the authenticated account)

Limitations:
- Only returns the authenticated account's profile per platform
- Requires valid credentials for each platform
- Mastodon profile bio may contain HTML (stripped to plain text in output)

Returns: Markdown-formatted profile(s) with handle, display name, bio, and follower/following/post counts for each requested platform.`,
  {
    platform: z
      .enum(["bluesky", "mastodon", "all"])
      .optional()
      .describe(
        "Which platform to get the profile from. 'all' returns profiles from every configured platform. Default: 'all'"
      ),
  },
  async ({ platform }) => {
    const target = platform || "all";
    const results: string[] = [];

    if ((target === "all" || target === "bluesky") && bluesky) {
      try {
        const profile = await bluesky.getProfile();
        results.push(`## Bluesky\n${formatBlueskyProfile(profile)}`);
      } catch (err) {
        results.push(
          `## Bluesky\n**Error:** ${err instanceof Error ? err.message : String(err)}`
        );
      }
    } else if (target === "bluesky" && !bluesky) {
      results.push("## Bluesky\n**Not configured**");
    }

    if ((target === "all" || target === "mastodon") && mastodon) {
      try {
        const profile = await mastodon.getProfile();
        results.push(`## Mastodon\n${formatMastodonProfile(profile)}`);
      } catch (err) {
        results.push(
          `## Mastodon\n**Error:** ${err instanceof Error ? err.message : String(err)}`
        );
      }
    } else if (target === "mastodon" && !mastodon) {
      results.push("## Mastodon\n**Not configured**");
    }

    return {
      content: [
        {
          type: "text" as const,
          text:
            results.length > 0
              ? results.join("\n\n---\n\n")
              : "No platforms configured.",
        },
      ],
    };
  }
);

// ─── Tool: Adapt Content ─────────────────────────────────────────

server.tool(
  "social_adapt_content",
  `Analyze text and show how it fits each platform's character limits. Does NOT post anything.

Use this tool BEFORE posting when you have content that might exceed a platform's character limit. It shows the character count vs. each platform's limit and flags which platforms the text is too long for.

Do NOT use this tool for:
- Actually posting content (use social_post_bluesky/mastodon/all after adapting)
- Getting character limits only (use social_get_character_limits instead)

Limitations:
- Character counting is approximate — Bluesky uses grapheme clusters, Mastodon counts characters; edge cases with emojis may differ
- Does not auto-shorten or rewrite text — just reports fit/overflow per platform
- Only checks configured platforms

Returns: Markdown table showing each platform's character limit, the text length, and whether it fits (with characters to spare) or overflows (with excess count).`,
  {
    text: z
      .string()
      .describe("The text content you want to analyze for platform fit"),
  },
  async ({ text }) => {
    // Count graphemes (visual characters) — approximation using spread
    const graphemeCount = [...text].length;
    const charCount = text.length;

    const lines: string[] = [
      `# Content Analysis`,
      `**Text:** "${text.length > 100 ? text.slice(0, 100) + "..." : text}"`,
      `**Characters:** ${charCount} | **Graphemes:** ${graphemeCount}`,
      "",
      "| Platform | Limit | Length | Status |",
      "|----------|-------|--------|--------|",
    ];

    if (BLUESKY_ENABLED) {
      const limit = PLATFORM_LIMITS.bluesky.maxChars;
      const fits = graphemeCount <= limit;
      const delta = fits
        ? `${limit - graphemeCount} to spare`
        : `${graphemeCount - limit} over`;
      lines.push(
        `| Bluesky | ${limit} graphemes | ${graphemeCount} | ${fits ? `✅ Fits (${delta})` : `❌ Too long (${delta})`} |`
      );
    }

    if (MASTODON_ENABLED) {
      // Mastodon may have custom limits — try to fetch
      let limit = PLATFORM_LIMITS.mastodon.maxChars;
      if (mastodon) {
        try {
          const info = await mastodon.getInstanceInfo();
          limit = info.maxChars;
        } catch {
          // Fall back to default
        }
      }
      const fits = charCount <= limit;
      const delta = fits
        ? `${limit - charCount} to spare`
        : `${charCount - limit} over`;
      lines.push(
        `| Mastodon | ${limit} chars | ${charCount} | ${fits ? `✅ Fits (${delta})` : `❌ Too long (${delta})`} |`
      );
    }

    // Show strictest limit for cross-posting
    const strictest = BLUESKY_ENABLED ? 300 : 500;
    lines.push(
      "",
      `**Cross-post safe:** ${graphemeCount <= strictest ? "✅ Yes" : `❌ No — must be ≤${strictest} for all platforms`}`
    );

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
    };
  }
);

// ─── Tool: Get Character Limits ──────────────────────────────────

server.tool(
  "social_get_character_limits",
  `Get the character limits for each configured platform.

Use this tool to check maximum post lengths before composing content. Mastodon limits vary by instance — this tool fetches the actual limit from the configured instance.

Do NOT use this tool for:
- Checking if specific text fits (use social_adapt_content instead)
- Posting content (use the post tools)

Limitations:
- Bluesky limit is 300 graphemes (not characters — emojis and some Unicode count as 1 grapheme)
- Mastodon limit varies by instance (default 500, some instances allow more)
- Instance-specific limits require a network call to fetch

Returns: Markdown table with each platform's name, character limit, and the unit of measurement (graphemes vs characters).`,
  {},
  async () => {
    const lines: string[] = [
      "| Platform | Limit | Unit | Notes |",
      "|----------|-------|------|-------|",
    ];

    if (BLUESKY_ENABLED) {
      lines.push(
        "| Bluesky | 300 | graphemes | Visual characters — emojis count as 1 |"
      );
    }

    if (MASTODON_ENABLED && mastodon) {
      try {
        const info = await mastodon.getInstanceInfo();
        lines.push(
          `| Mastodon (${process.env.MASTODON_INSTANCE}) | ${info.maxChars} | characters | Instance: ${info.title} v${info.version} |`
        );
      } catch {
        lines.push(
          `| Mastodon (${process.env.MASTODON_INSTANCE}) | 500 (default) | characters | Could not fetch instance info |`
        );
      }
    }

    lines.push(
      "",
      `**Configured platforms:** ${enabledPlatforms.join(", ")}`,
      `**Cross-post safe limit:** ${BLUESKY_ENABLED ? "300 graphemes" : "500 characters"} (use the strictest limit)`
    );

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
    };
  }
);

// ─── Tool: Delete Post ───────────────────────────────────────────

server.tool(
  "social_delete_post",
  `Delete a previously published post from a specific platform.

Use this tool to remove a post you've published. Requires the platform-specific post identifier (AT URI for Bluesky, status ID for Mastodon).

IMPORTANT: Deletion is permanent and cannot be undone. Confirm with the user before deleting.

Do NOT use this tool for:
- Creating posts (use the post tools)
- Editing posts (not supported — delete and re-post instead)

Limitations:
- Bluesky: requires the full AT URI (at://did:plc:.../app.bsky.feed.post/...)
- Mastodon: requires the numeric status ID
- Can only delete posts from the authenticated account
- Federated copies on other Mastodon instances may not be deleted immediately
- Deletion is irreversible

Returns: Confirmation message with the platform and identifier of the deleted post.`,
  {
    platform: z
      .enum(["bluesky", "mastodon"])
      .describe("Platform to delete the post from"),
    post_id: z
      .string()
      .describe(
        "Post identifier. Bluesky: full AT URI (at://did:plc:.../app.bsky.feed.post/...). Mastodon: numeric status ID."
      ),
  },
  async ({ platform, post_id }) => {
    if (platform === "bluesky") {
      if (!bluesky) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: Bluesky is not configured.",
            },
          ],
          isError: true,
        };
      }
      await bluesky.deletePost(post_id);
      return {
        content: [
          {
            type: "text" as const,
            text: `## Post Deleted\n**Platform:** Bluesky\n**URI:** ${post_id}`,
          },
        ],
      };
    }

    if (platform === "mastodon") {
      if (!mastodon) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: Mastodon is not configured.",
            },
          ],
          isError: true,
        };
      }
      await mastodon.deleteStatus(post_id);
      return {
        content: [
          {
            type: "text" as const,
            text: `## Status Deleted\n**Platform:** Mastodon (${process.env.MASTODON_INSTANCE})\n**ID:** ${post_id}`,
          },
        ],
      };
    }

    return {
      content: [
        { type: "text" as const, text: `Unknown platform: ${platform}` },
      ],
      isError: true,
    };
  }
);

// ─── Tool: Platform Status ───────────────────────────────────────

server.tool(
  "social_platform_status",
  `Check which platforms are configured and test connectivity.

Use this tool to verify that platform credentials are valid and API connections are working before posting. Useful for troubleshooting authentication issues.

Do NOT use this tool for:
- Getting profile information (use social_get_profile instead)
- Posting content (use the post tools)

Limitations:
- Tests authentication by making a lightweight API call per platform
- Network errors may indicate transient issues, not invalid credentials
- Does not verify write permissions — only read access

Returns: Markdown status report showing each platform as configured/not configured, and connected/error with details for configured platforms.`,
  {},
  async () => {
    const lines: string[] = [
      "# Platform Status",
      "",
      "| Platform | Configured | Status |",
      "|----------|-----------|--------|",
    ];

    // Bluesky
    if (bluesky) {
      try {
        const profile = await bluesky.getProfile();
        lines.push(
          `| Bluesky | ✅ | Connected as @${profile.handle} |`
        );
      } catch (err) {
        lines.push(
          `| Bluesky | ✅ | ❌ Error: ${err instanceof Error ? err.message : String(err)} |`
        );
      }
    } else {
      lines.push("| Bluesky | ❌ Not configured | — |");
    }

    // Mastodon
    if (mastodon) {
      try {
        const profile = await mastodon.getProfile();
        lines.push(
          `| Mastodon | ✅ | Connected as @${profile.acct}@${profile.instance} |`
        );
      } catch (err) {
        lines.push(
          `| Mastodon | ✅ | ❌ Error: ${err instanceof Error ? err.message : String(err)} |`
        );
      }
    } else {
      lines.push("| Mastodon | ❌ Not configured | — |");
    }

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
    };
  }
);

// ─── Start Server ────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Social Poster MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
