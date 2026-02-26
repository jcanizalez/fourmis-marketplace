/**
 * SEO Toolkit MCP Server — Free on-page and technical SEO analysis.
 *
 * Analyzes web pages for SEO issues: meta tags, headings, images, links,
 * content quality, SSL certificates, redirects, robots.txt, sitemaps,
 * and basic performance metrics. No paid API keys required.
 *
 * 10 tools covering the 80% of SEO work that can be done with free data sources.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fetchPage, fetchHead, fetchRobotsTxt, fetchSitemap } from "./fetcher.js";
import {
  analyzeMetaTags,
  analyzeHeadings,
  analyzeImages,
  analyzeLinks,
  analyzeContent,
  analyzeFullPage,
} from "./analyzer.js";
import {
  formatFullAnalysis,
  formatMetaTags,
  formatHeadings,
  formatImages,
  formatLinks,
  formatRedirectChain,
  formatPerformance,
  formatRobotsTxt,
  formatSitemap,
  formatSSL,
} from "./formatter.js";

// ─── Create MCP Server ──────────────────────────────────────────

const server = new McpServer({
  name: "seo-toolkit",
  version: "1.0.0",
});

// ─── Tool: Full Page Analysis ────────────────────────────────────

server.tool(
  "seo_analyze_page",
  `Run a comprehensive on-page SEO analysis on any URL.

Use this tool to get a complete SEO health check of a web page. Analyzes meta tags, heading structure, image alt text, links, content quality, and structured data. Returns an SEO score (0-100) with categorized issues.

Do NOT use this tool for:
- Checking only meta tags (use seo_check_meta_tags for faster results)
- Technical checks like SSL or redirects (use the specialized tools)
- Analyzing sites that block bots (returns the blocked response)

Limitations:
- Only analyzes the HTML as returned by the server — does not execute JavaScript
- Single-page apps (React/Vue/Angular) may show incomplete content unless server-rendered
- Score is heuristic-based, not a Google ranking predictor
- Rate limit yourself — avoid hammering sites with rapid requests
- Maximum HTML size processed: ~10MB

Returns: Markdown report with SEO score (0-100), score breakdown by category (meta/headings/images/links/content), critical issues, warnings, suggestions, and detailed metrics.`,
  {
    url: z
      .string()
      .url()
      .describe(
        "Full URL to analyze (must include https://). Example: 'https://example.com/blog/my-post'"
      ),
  },
  async ({ url }) => {
    try {
      const result = await fetchPage(url);
      const analysis = analyzeFullPage(result.html, result.finalUrl);
      return {
        content: [{ type: "text" as const, text: formatFullAnalysis(analysis) }],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error analyzing ${url}: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Tool: Meta Tags ─────────────────────────────────────────────

server.tool(
  "seo_check_meta_tags",
  `Extract and validate all SEO-relevant meta tags from a URL.

Use this tool when you need to quickly check a page's meta tags — title, description, Open Graph, Twitter Card, canonical, robots, viewport, and language. Faster than a full analysis when you only need meta information.

Do NOT use this tool for:
- Full page analysis including headings, images, links (use seo_analyze_page)
- Checking technical SEO like SSL or performance (use specialized tools)

Limitations:
- Does not execute JavaScript — meta tags injected by client-side code won't be detected
- Some CDNs serve different content to bots vs browsers
- Title and description length guidelines are approximate (Google renders, not counts)

Returns: Markdown table of all meta tags with their values, optimal length indicators, and issues for missing or misconfigured tags.`,
  {
    url: z.string().url().describe("Full URL to check meta tags for"),
  },
  async ({ url }) => {
    try {
      const result = await fetchPage(url);
      const meta = analyzeMetaTags(result.html, result.finalUrl);
      return {
        content: [{ type: "text" as const, text: formatMetaTags(meta) }],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching ${url}: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Tool: Headings ──────────────────────────────────────────────

server.tool(
  "seo_check_headings",
  `Analyze the heading hierarchy (H1-H6) of a web page.

Use this tool to check heading structure — whether there's exactly one H1, if heading levels are properly nested (no skipped levels), and the overall heading outline.

Do NOT use this tool for:
- Full page analysis (use seo_analyze_page)
- Content readability analysis (headings only, not full content)

Limitations:
- Only sees headings in the initial HTML — JavaScript-rendered headings won't appear
- Some themes use CSS to style non-heading elements as headings (won't be detected)

Returns: Markdown heading hierarchy tree, level counts table, and issues for missing H1, multiple H1s, or skipped heading levels.`,
  {
    url: z.string().url().describe("Full URL to check heading structure"),
  },
  async ({ url }) => {
    try {
      const result = await fetchPage(url);
      const headings = analyzeHeadings(result.html);
      return {
        content: [{ type: "text" as const, text: formatHeadings(headings) }],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching ${url}: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Tool: Images ────────────────────────────────────────────────

server.tool(
  "seo_check_images",
  `Audit all images on a page for alt text, dimensions, and accessibility.

Use this tool to find images missing alt attributes (critical for accessibility and SEO), images without explicit dimensions (causes layout shift), and get a full inventory of page images.

Do NOT use this tool for:
- Full page analysis (use seo_analyze_page)
- Checking image file sizes or formats (requires individual HEAD requests)

Limitations:
- Only detects <img> tags — CSS background images are not included
- Lazy-loaded images using data-src are detected but the actual src may be a placeholder
- Shows first 50 images to keep output manageable

Returns: Markdown summary with image counts, table of all images with their alt text and dimensions, and issues for missing alt attributes or dimensions.`,
  {
    url: z.string().url().describe("Full URL to audit images on"),
  },
  async ({ url }) => {
    try {
      const result = await fetchPage(url);
      const images = analyzeImages(result.html);
      return {
        content: [{ type: "text" as const, text: formatImages(images) }],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching ${url}: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Tool: Links ─────────────────────────────────────────────────

server.tool(
  "seo_check_links",
  `Extract and categorize all links on a page — internal, external, nofollow.

Use this tool to audit a page's link profile: internal links (for site structure), external links (for authority signals), nofollow links, and empty anchor text issues.

Do NOT use this tool for:
- Checking if links are broken (this tool extracts links but doesn't verify them)
- Full page analysis (use seo_analyze_page)

Limitations:
- Only extracts <a href> links — JavaScript navigation and onclick handlers are not detected
- Shows first 30 links per category to keep output manageable
- Does not follow or verify links — only extracts and categorizes them

Returns: Markdown report with internal/external link counts, tables showing first 30 links per category with anchor text and rel attributes, and issues for empty anchors or missing security attributes.`,
  {
    url: z.string().url().describe("Full URL to extract links from"),
  },
  async ({ url }) => {
    try {
      const result = await fetchPage(url);
      const links = analyzeLinks(result.html, result.finalUrl);
      return {
        content: [{ type: "text" as const, text: formatLinks(links) }],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching ${url}: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Tool: SSL Check ─────────────────────────────────────────────

server.tool(
  "seo_check_ssl",
  `Validate the SSL/TLS certificate for a domain.

Use this tool to check if a site's SSL certificate is valid, when it expires, and which domains it covers. Useful for technical SEO audits and security checks.

Do NOT use this tool for:
- Full page content analysis (use seo_analyze_page)
- Checking other security headers (use seo_check_performance which includes security headers)

Limitations:
- Only checks the SSL certificate — does not validate the full TLS configuration
- Cannot check internal/private domains not accessible from the internet
- Some CDNs (Cloudflare, Fastly) show their own certificate, not the origin's

Returns: Markdown report with certificate validity status, days until expiration, valid date range, covered domains, and issues for expiring or invalid certificates.`,
  {
    hostname: z
      .string()
      .describe(
        "Domain name to check SSL for (without https://). Example: 'example.com'"
      ),
  },
  async ({ hostname }) => {
    try {
      // Dynamic import for ssl-checker (CommonJS module)
      const sslModule = await import("ssl-checker");
      const sslChecker = (sslModule as unknown as { default: (host: string) => Promise<Record<string, unknown>> }).default;
      const data = await sslChecker(hostname);
      return {
        content: [
          {
            type: "text" as const,
            text: formatSSL(hostname, data as { valid: boolean; daysRemaining: number; validFrom: string; validTo: string; validFor: string[] }),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: formatSSL(hostname, null, err instanceof Error ? err.message : String(err)),
          },
        ],
      };
    }
  }
);

// ─── Tool: Redirects ─────────────────────────────────────────────

server.tool(
  "seo_check_redirects",
  `Follow and report the full redirect chain for a URL.

Use this tool to check how a URL resolves — whether it redirects, how many hops, what status codes are used (301 vs 302), and where it ends up. Important for SEO because redirect chains waste crawl budget and dilute link equity.

Do NOT use this tool for:
- Full page content analysis (use seo_analyze_page)
- Bulk URL checking (call this tool once per URL)

Limitations:
- Maximum 10 redirects followed before stopping
- Only follows HTTP redirects (3xx status codes) — JavaScript redirects are not detected
- Some servers respond differently to bot User-Agents vs browsers

Returns: Markdown report showing the original URL, final destination URL, number of redirects, and a table of each hop with its URL and HTTP status code. Warns about long chains and 302 (temporary) redirects.`,
  {
    url: z.string().url().describe("Full URL to follow redirects for"),
  },
  async ({ url }) => {
    try {
      const result = await fetchPage(url);
      return {
        content: [
          {
            type: "text" as const,
            text: formatRedirectChain(url, result.finalUrl, result.redirectChain),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error following redirects for ${url}: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Tool: Robots.txt ────────────────────────────────────────────

server.tool(
  "seo_check_robots",
  `Fetch and analyze a site's robots.txt file.

Use this tool to check what a site's robots.txt allows and disallows for crawlers. Shows per-user-agent rules, blocked paths, allowed paths, and sitemap references.

Do NOT use this tool for:
- Checking if a specific URL is crawlable (this shows raw rules, doesn't test specific URLs)
- Full site audit (combine with other seo_check tools)

Limitations:
- Only fetches {domain}/robots.txt — does not test individual URL matching
- Cannot parse non-standard robots.txt extensions
- If robots.txt doesn't exist, reports it as "no rules" (default: all allowed)

Returns: Markdown report with parsed rules per user-agent, allowed/disallowed paths, referenced sitemaps, and issues like blocking all crawlers or missing sitemap references.`,
  {
    url: z
      .string()
      .url()
      .describe(
        "Any URL on the domain to check robots.txt for (fetches from domain root). Example: 'https://example.com/any-page'"
      ),
  },
  async ({ url }) => {
    try {
      const content = await fetchRobotsTxt(url);
      return {
        content: [
          { type: "text" as const, text: formatRobotsTxt(url, content) },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching robots.txt: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Tool: Sitemap ───────────────────────────────────────────────

server.tool(
  "seo_check_sitemap",
  `Fetch and analyze an XML sitemap — count URLs, detect sitemap indexes.

Use this tool to check a site's sitemap: how many URLs it contains, whether it's a sitemap index (pointing to child sitemaps), and list the URLs/sitemaps found.

Do NOT use this tool for:
- Checking robots.txt (use seo_check_robots — it also shows sitemap references)
- Validating individual URLs in the sitemap (only parses the sitemap structure)

Limitations:
- Only parses XML sitemaps — HTML sitemaps are not supported
- Large sitemaps (100K+ URLs) will be truncated in output (shows first 50)
- Does not validate URLs — only extracts them from the sitemap XML
- Compressed sitemaps (.gz) are not automatically decompressed

Returns: Markdown report showing sitemap type (index or urlset), total URL count, and a list of the first 50 URLs or child sitemaps.`,
  {
    url: z
      .string()
      .url()
      .describe(
        "Direct URL to the XML sitemap. Example: 'https://example.com/sitemap.xml'"
      ),
  },
  async ({ url }) => {
    try {
      const data = await fetchSitemap(url);
      return {
        content: [
          { type: "text" as const, text: formatSitemap(url, data) },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching sitemap: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Tool: Performance ───────────────────────────────────────────

server.tool(
  "seo_check_performance",
  `Check basic page performance metrics and security headers.

Use this tool for a quick technical health check: response time, page size, compression, caching headers, and security headers (HSTS, CSP, X-Frame-Options, etc.).

Do NOT use this tool for:
- Full on-page SEO analysis (use seo_analyze_page)
- Detailed performance profiling (this is HTTP-level only, not browser rendering)

Limitations:
- Response time measures server response, not browser render time
- Does not measure Core Web Vitals (LCP, CLS, FID) — requires browser engine
- Page size is the HTML only — does not include CSS, JS, images, or fonts
- Security header presence is checked but values are not validated

Returns: Markdown report with response time, HTML size, HTTP status, compression, redirect count, and a table of security headers (present/absent) with issues for slow responses, missing compression, or missing headers.`,
  {
    url: z.string().url().describe("Full URL to check performance for"),
  },
  async ({ url }) => {
    try {
      const result = await fetchPage(url);
      return {
        content: [
          { type: "text" as const, text: formatPerformance(result) },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching ${url}: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Start Server ────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SEO Toolkit MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
