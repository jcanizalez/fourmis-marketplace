/**
 * HTTP fetcher with SEO-relevant metadata extraction.
 *
 * Handles page fetching, redirect chain tracking, response timing,
 * and basic HTTP header analysis. Uses Node 18+ native fetch.
 */

export interface FetchResult {
  url: string;
  finalUrl: string;
  status: number;
  statusText: string;
  html: string;
  headers: Record<string, string>;
  redirectChain: RedirectHop[];
  timing: {
    startMs: number;
    endMs: number;
    durationMs: number;
  };
  contentLength: number;
  contentType: string;
}

export interface RedirectHop {
  url: string;
  status: number;
  statusText: string;
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; FourmisSEO/1.0; +https://github.com/jcanizalez/fourmis-marketplace)";

/**
 * Fetch a URL and track redirects, timing, and headers.
 * Manual redirect following to capture the full chain.
 */
export async function fetchPage(url: string): Promise<FetchResult> {
  const redirectChain: RedirectHop[] = [];
  let currentUrl = url;
  const startMs = Date.now();

  // Follow redirects manually to capture the chain
  const MAX_REDIRECTS = 10;
  let response: Response | null = null;

  for (let i = 0; i < MAX_REDIRECTS; i++) {
    response = await fetch(currentUrl, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "manual",
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) break;

      redirectChain.push({
        url: currentUrl,
        status: response.status,
        statusText: response.statusText,
      });

      // Handle relative redirects
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    break;
  }

  if (!response) {
    throw new Error(`Failed to fetch ${url}: no response after redirects`);
  }

  const endMs = Date.now();
  const html = await response.text();

  // Extract headers as plain object
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    url,
    finalUrl: currentUrl,
    status: response.status,
    statusText: response.statusText,
    html,
    headers,
    redirectChain,
    timing: {
      startMs,
      endMs,
      durationMs: endMs - startMs,
    },
    contentLength: html.length,
    contentType: headers["content-type"] || "unknown",
  };
}

/**
 * Fetch only headers (HEAD request) — faster for link checking.
 */
export async function fetchHead(
  url: string
): Promise<{ status: number; statusText: string; headers: Record<string, string> }> {
  const response = await fetch(url, {
    method: "HEAD",
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
  });

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    status: response.status,
    statusText: response.statusText,
    headers,
  };
}

/**
 * Fetch robots.txt for a domain.
 */
export async function fetchRobotsTxt(url: string): Promise<string | null> {
  try {
    const origin = new URL(url).origin;
    const response = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Fetch and parse a sitemap. Supports sitemap index files.
 */
export async function fetchSitemap(
  url: string
): Promise<{ type: "index" | "urlset"; urls: string[]; raw: string } | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) return null;
    const raw = await response.text();

    // Check if it's a sitemap index
    if (raw.includes("<sitemapindex")) {
      const urls: string[] = [];
      const locRegex = /<loc>\s*(.*?)\s*<\/loc>/g;
      let match;
      while ((match = locRegex.exec(raw)) !== null) {
        urls.push(match[1]);
      }
      return { type: "index", urls, raw };
    }

    // Regular urlset
    const urls: string[] = [];
    const locRegex = /<loc>\s*(.*?)\s*<\/loc>/g;
    let match;
    while ((match = locRegex.exec(raw)) !== null) {
      urls.push(match[1]);
    }
    return { type: "urlset", urls, raw };
  } catch {
    return null;
  }
}
