/**
 * Bluesky client using the AT Protocol (@atproto/api).
 *
 * Handles authentication via app passwords and provides methods for
 * posting, profile retrieval, and post deletion.
 */

import { AtpAgent, RichText } from "@atproto/api";

export interface BlueskyConfig {
  /** Bluesky handle (e.g. "alice.bsky.social") */
  identifier: string;
  /** App password generated in Bluesky settings (not the account password) */
  appPassword: string;
  /** PDS service URL. Default: https://bsky.social */
  service?: string;
}

export interface BlueskyPost {
  uri: string;
  cid: string;
  text: string;
  createdAt: string;
}

export interface BlueskyProfile {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  followersCount: number;
  followsCount: number;
  postsCount: number;
  avatar?: string;
}

export class BlueskyClient {
  private agent: AtpAgent;
  private config: BlueskyConfig;
  private authenticated = false;

  constructor(config: BlueskyConfig) {
    this.config = config;
    this.agent = new AtpAgent({
      service: config.service || "https://bsky.social",
    });
  }

  /** Authenticate with Bluesky using app password. Auto-called on first API use. */
  async login(): Promise<void> {
    if (this.authenticated) return;
    await this.agent.login({
      identifier: this.config.identifier,
      password: this.config.appPassword,
    });
    this.authenticated = true;
  }

  /** Ensure we're authenticated before making API calls. */
  private async ensureAuth(): Promise<void> {
    if (!this.authenticated) {
      await this.login();
    }
  }

  /**
   * Create a post on Bluesky.
   * Automatically detects mentions, links, and hashtags via RichText.
   */
  async post(text: string): Promise<BlueskyPost> {
    await this.ensureAuth();

    // RichText handles facet detection (mentions, links, tags)
    const rt = new RichText({ text });
    await rt.detectFacets(this.agent);

    const response = await this.agent.post({
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
    });

    return {
      uri: response.uri,
      cid: response.cid,
      text,
      createdAt: new Date().toISOString(),
    };
  }

  /** Delete a post by its AT URI. */
  async deletePost(uri: string): Promise<void> {
    await this.ensureAuth();
    await this.agent.deletePost(uri);
  }

  /** Get the authenticated user's profile. */
  async getProfile(): Promise<BlueskyProfile> {
    await this.ensureAuth();
    const response = await this.agent.getProfile({
      actor: this.config.identifier,
    });
    const p = response.data;
    return {
      did: p.did,
      handle: p.handle,
      displayName: p.displayName,
      description: p.description,
      followersCount: p.followersCount ?? 0,
      followsCount: p.followsCount ?? 0,
      postsCount: p.postsCount ?? 0,
      avatar: p.avatar,
    };
  }

  /** Get any user's public profile by handle or DID. */
  async getUserProfile(actor: string): Promise<BlueskyProfile> {
    await this.ensureAuth();
    const response = await this.agent.getProfile({ actor });
    const p = response.data;
    return {
      did: p.did,
      handle: p.handle,
      displayName: p.displayName,
      description: p.description,
      followersCount: p.followersCount ?? 0,
      followsCount: p.followsCount ?? 0,
      postsCount: p.postsCount ?? 0,
      avatar: p.avatar,
    };
  }
}

/** Format a Bluesky profile as readable markdown. */
export function formatBlueskyProfile(profile: BlueskyProfile): string {
  const lines = [
    `## ${profile.displayName || profile.handle}`,
    `**Handle:** @${profile.handle}`,
    `**DID:** ${profile.did}`,
  ];
  if (profile.description) {
    lines.push(`**Bio:** ${profile.description}`);
  }
  lines.push(
    `**Posts:** ${profile.postsCount.toLocaleString()} | **Followers:** ${profile.followersCount.toLocaleString()} | **Following:** ${profile.followsCount.toLocaleString()}`
  );
  return lines.join("\n");
}

/** Format a Bluesky post result as readable markdown. */
export function formatBlueskyPost(post: BlueskyPost): string {
  return [
    `## Post Published`,
    `**Text:** ${post.text}`,
    `**URI:** ${post.uri}`,
    `**CID:** ${post.cid}`,
    `**Created:** ${post.createdAt}`,
    `**Link:** https://bsky.app/profile/${post.uri.split("/")[2]}/post/${post.uri.split("/").pop()}`,
  ].join("\n");
}
