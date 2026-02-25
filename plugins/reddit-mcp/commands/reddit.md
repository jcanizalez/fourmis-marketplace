---
name: reddit
description: Browse, search, and interact with Reddit — get trending posts, search discussions, read comments, and post content
allowed-tools: reddit_search_posts, reddit_get_subreddit, reddit_get_comments, reddit_get_subreddit_info, reddit_search_subreddits, reddit_get_user, reddit_get_me, reddit_submit_post, reddit_comment, reddit_vote
---

# /reddit

You have access to the Reddit MCP tools. Help the user with their Reddit request.

## What you can do

**Browse & Search:**
- Search posts across Reddit or in a specific subreddit
- Browse subreddit feeds (hot, new, top, rising)
- Read comment threads on posts
- Search for subreddits by topic
- Look up user profiles

**Create & Interact:**
- Submit new text or link posts
- Reply to posts and comments
- Upvote/downvote content

## Instructions

1. If the user gives a vague request like "check Reddit", ask what subreddit or topic they're interested in
2. For browsing requests, start with `reddit_get_subreddit` for a specific subreddit or `reddit_search_posts` for a topic
3. Present results in a clear, scannable format — highlight the most relevant or highest-engagement posts
4. For write operations (posting, commenting, voting), **always show the user exactly what will be submitted and get confirmation before executing**
5. Include permalinks so the user can follow up on Reddit directly

## Arguments

If the user provides arguments after `/reddit`, interpret them as:
- A subreddit name (e.g., `/reddit typescript`) → browse r/typescript hot posts
- A search query (e.g., `/reddit search MCP plugins`) → search all of Reddit
- "post" followed by details → draft a post for review

$ARGUMENTS
