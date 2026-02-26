/**
 * Mastodon client using raw fetch — no extra dependencies.
 *
 * Supports any Mastodon-compatible instance (Mastodon, Pleroma, Akkoma, etc.).
 * Authentication requires an access token obtained through the OAuth2 flow.
 */

import crypto from "crypto";

export interface MastodonConfig {
  /** Instance domain (e.g. "mastodon.social", "fosstodon.org") */
  instance: string;
  /** OAuth2 access token */
  accessToken: string;
}

export interface MastodonStatus {
  id: string;
  url: string;
  content: string;
  createdAt: string;
  visibility: string;
}

export interface MastodonProfile {
  id: string;
  username: string;
  acct: string;
  displayName: string;
  note: string;
  url: string;
  followersCount: number;
  followingCount: number;
  statusesCount: number;
  avatar: string;
  instance: string;
}

export type MastodonVisibility = "public" | "unlisted" | "private" | "direct";

export class MastodonClient {
  private config: MastodonConfig;
  private baseUrl: string;

  constructor(config: MastodonConfig) {
    this.config = config;
    this.baseUrl = `https://${config.instance}`;
  }

  /** Make an authenticated API request. */
  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, string>
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.accessToken}`,
    };

    const init: RequestInit = { method, headers };

    if (body) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      // Generate idempotency key for POST requests to prevent duplicates
      if (method === "POST") {
        headers["Idempotency-Key"] = crypto.randomUUID();
      }
      init.body = new URLSearchParams(body).toString();
    }

    const response = await fetch(`${this.baseUrl}${path}`, init);

    if (!response.ok) {
      const errorBody = await response.text();
      const remaining = response.headers.get("X-RateLimit-Remaining");
      const reset = response.headers.get("X-RateLimit-Reset");

      if (response.status === 429) {
        throw new Error(
          `Mastodon rate limit exceeded. Resets at: ${reset}. ` +
            `Try again after that time.`
        );
      }

      throw new Error(
        `Mastodon API error ${response.status}: ${errorBody}` +
          (remaining ? ` (${remaining} requests remaining)` : "")
      );
    }

    // DELETE returns empty body
    if (response.status === 200 && method === "DELETE") {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  /**
   * Post a status to Mastodon.
   *
   * @param text - Status text (default max 500 chars, varies by instance)
   * @param options - Visibility, content warning, language
   */
  async post(
    text: string,
    options?: {
      visibility?: MastodonVisibility;
      spoilerText?: string;
      language?: string;
    }
  ): Promise<MastodonStatus> {
    const body: Record<string, string> = {
      status: text,
      visibility: options?.visibility || "public",
    };

    if (options?.spoilerText) {
      body.spoiler_text = options.spoilerText;
    }
    if (options?.language) {
      body.language = options.language;
    }

    interface RawStatus {
      id: string;
      url: string;
      content: string;
      created_at: string;
      visibility: string;
    }

    const data = await this.request<RawStatus>("POST", "/api/v1/statuses", body);

    return {
      id: data.id,
      url: data.url,
      content: data.content,
      createdAt: data.created_at,
      visibility: data.visibility,
    };
  }

  /** Delete a status by ID. */
  async deleteStatus(id: string): Promise<void> {
    await this.request("DELETE", `/api/v1/statuses/${id}`);
  }

  /** Get the authenticated user's profile. */
  async getProfile(): Promise<MastodonProfile> {
    interface RawAccount {
      id: string;
      username: string;
      acct: string;
      display_name: string;
      note: string;
      url: string;
      followers_count: number;
      following_count: number;
      statuses_count: number;
      avatar: string;
    }

    const data = await this.request<RawAccount>(
      "GET",
      "/api/v1/accounts/verify_credentials"
    );

    return {
      id: data.id,
      username: data.username,
      acct: data.acct,
      displayName: data.display_name,
      note: data.note,
      url: data.url,
      followersCount: data.followers_count,
      followingCount: data.following_count,
      statusesCount: data.statuses_count,
      avatar: data.avatar,
      instance: this.config.instance,
    };
  }

  /** Get instance info — useful for checking character limits. */
  async getInstanceInfo(): Promise<{
    title: string;
    description: string;
    maxChars: number;
    version: string;
  }> {
    interface RawInstance {
      title: string;
      short_description?: string;
      description: string;
      version: string;
      configuration?: {
        statuses?: {
          max_characters?: number;
        };
      };
      max_toot_chars?: number;
    }

    const data = await this.request<RawInstance>("GET", "/api/v1/instance");

    // Different Mastodon versions expose max chars differently
    const maxChars =
      data.configuration?.statuses?.max_characters ||
      data.max_toot_chars ||
      500;

    return {
      title: data.title,
      description: data.short_description || data.description,
      maxChars,
      version: data.version,
    };
  }
}

/** Format a Mastodon profile as readable markdown. */
export function formatMastodonProfile(profile: MastodonProfile): string {
  // Strip HTML tags from bio
  const bio = profile.note.replace(/<[^>]*>/g, "").trim();
  const lines = [
    `## ${profile.displayName || profile.username}`,
    `**Handle:** @${profile.acct}@${profile.instance}`,
    `**URL:** ${profile.url}`,
  ];
  if (bio) {
    lines.push(`**Bio:** ${bio}`);
  }
  lines.push(
    `**Statuses:** ${profile.statusesCount.toLocaleString()} | **Followers:** ${profile.followersCount.toLocaleString()} | **Following:** ${profile.followingCount.toLocaleString()}`
  );
  return lines.join("\n");
}

/** Format a Mastodon status result as readable markdown. */
export function formatMastodonStatus(status: MastodonStatus): string {
  // Strip HTML from content
  const text = status.content.replace(/<[^>]*>/g, "").trim();
  return [
    `## Status Published`,
    `**Text:** ${text}`,
    `**ID:** ${status.id}`,
    `**Visibility:** ${status.visibility}`,
    `**Created:** ${status.createdAt}`,
    `**URL:** ${status.url}`,
  ].join("\n");
}
