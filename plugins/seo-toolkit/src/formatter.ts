/**
 * Markdown formatters for SEO analysis results.
 */

import type {
  MetaTagAnalysis,
  HeadingAnalysis,
  ImageAnalysis,
  LinkAnalysis,
  ContentAnalysis,
  FullPageAnalysis,
} from "./analyzer.js";
import type { FetchResult, RedirectHop } from "./fetcher.js";

// ─── Score Badge ─────────────────────────────────────────────────

function scoreBadge(score: number): string {
  if (score >= 90) return `${score}/100 (Excellent)`;
  if (score >= 70) return `${score}/100 (Good)`;
  if (score >= 50) return `${score}/100 (Needs Work)`;
  return `${score}/100 (Poor)`;
}

// ─── Full Page Report ────────────────────────────────────────────

export function formatFullAnalysis(analysis: FullPageAnalysis): string {
  const lines: string[] = [
    `# SEO Analysis: ${analysis.url}`,
    `**Score:** ${scoreBadge(analysis.score)}`,
    "",
    "## Score Breakdown",
    `| Category | Score | Max |`,
    `|----------|-------|-----|`,
  ];

  const maxScores: Record<string, number> = {
    meta: 30,
    headings: 20,
    images: 15,
    links: 15,
    content: 20,
  };

  for (const [cat, score] of Object.entries(analysis.scoreBreakdown)) {
    lines.push(`| ${cat.charAt(0).toUpperCase() + cat.slice(1)} | ${score} | ${maxScores[cat]} |`);
  }

  // Collect all issues sorted by severity
  const allIssues = [
    ...analysis.meta.issues,
    ...analysis.headings.issues,
    ...analysis.images.issues,
    ...analysis.links.issues,
    ...analysis.content.issues,
  ];

  const critical = allIssues.filter((i) => i.startsWith("CRITICAL"));
  const warnings = allIssues.filter((i) => i.startsWith("WARNING"));
  const info = allIssues.filter((i) => i.startsWith("INFO"));

  if (critical.length > 0) {
    lines.push("", "## Critical Issues");
    critical.forEach((i) => lines.push(`- ${i}`));
  }

  if (warnings.length > 0) {
    lines.push("", "## Warnings");
    warnings.forEach((i) => lines.push(`- ${i}`));
  }

  if (info.length > 0) {
    lines.push("", "## Suggestions");
    info.forEach((i) => lines.push(`- ${i}`));
  }

  if (allIssues.length === 0) {
    lines.push("", "## No Issues Found");
  }

  // Meta summary
  lines.push(
    "",
    "## Meta Tags",
    `- **Title:** ${analysis.meta.title || "(missing)"} (${analysis.meta.titleLength} chars)`,
    `- **Description:** ${analysis.meta.description ? analysis.meta.description.slice(0, 80) + "..." : "(missing)"} (${analysis.meta.descriptionLength} chars)`,
    `- **Canonical:** ${analysis.meta.canonical || "(not set)"}`,
    `- **Language:** ${analysis.meta.language || "(not set)"}`,
    `- **OG Image:** ${analysis.meta.ogImage ? "Yes" : "No"}`,
    `- **Twitter Card:** ${analysis.meta.twitterCard || "None"}`
  );

  // Content summary
  lines.push(
    "",
    "## Content",
    `- **Word count:** ${analysis.content.wordCount.toLocaleString()}`,
    `- **Paragraphs:** ${analysis.content.paragraphCount}`,
    `- **Reading time:** ~${analysis.content.readingTimeMinutes} min`,
    `- **Structured data:** ${analysis.content.hasStructuredData ? analysis.content.structuredDataTypes.join(", ") : "None"}`
  );

  // Heading summary
  lines.push(
    "",
    "## Headings",
    `| Level | Count |`,
    `|-------|-------|`
  );
  for (const [tag, count] of Object.entries(analysis.headings.counts)) {
    if (count > 0) lines.push(`| ${tag.toUpperCase()} | ${count} |`);
  }

  // Links summary
  lines.push(
    "",
    "## Links",
    `- **Internal:** ${analysis.links.internalCount}`,
    `- **External:** ${analysis.links.externalCount}`,
    `- **Nofollow:** ${analysis.links.nofollow}`,
    `- **Empty anchors:** ${analysis.links.emptyAnchors}`
  );

  // Images summary
  lines.push(
    "",
    "## Images",
    `- **Total:** ${analysis.images.total}`,
    `- **With alt text:** ${analysis.images.withAlt}`,
    `- **Missing alt:** ${analysis.images.withoutAlt}`,
    `- **Empty alt:** ${analysis.images.emptyAlt}`
  );

  return lines.join("\n");
}

// ─── Meta Tags Report ────────────────────────────────────────────

export function formatMetaTags(meta: MetaTagAnalysis): string {
  const lines = [
    "# Meta Tag Analysis",
    "",
    "## Essential Tags",
    `| Tag | Value | Status |`,
    `|-----|-------|--------|`,
    `| Title | ${meta.title ? `"${meta.title.slice(0, 60)}"` : "(missing)"} | ${meta.title ? (meta.titleLength >= 30 && meta.titleLength <= 60 ? "OK" : `${meta.titleLength} chars`) : "MISSING"} |`,
    `| Description | ${meta.description ? `"${meta.description.slice(0, 60)}..."` : "(missing)"} | ${meta.description ? (meta.descriptionLength >= 120 && meta.descriptionLength <= 160 ? "OK" : `${meta.descriptionLength} chars`) : "MISSING"} |`,
    `| Canonical | ${meta.canonical || "(not set)"} | ${meta.canonical ? "OK" : "Missing"} |`,
    `| Viewport | ${meta.viewport ? "Set" : "(missing)"} | ${meta.viewport ? "OK" : "MISSING"} |`,
    `| Language | ${meta.language || "(not set)"} | ${meta.language ? "OK" : "Missing"} |`,
    `| Charset | ${meta.charset || "(not detected)"} | ${meta.charset ? "OK" : "Check"} |`,
    `| Robots | ${meta.robots || "(default)"} | ${meta.robots?.includes("noindex") ? "NOINDEX" : "OK"} |`,
    "",
    "## Open Graph",
    `| Property | Value |`,
    `|----------|-------|`,
    `| og:title | ${meta.ogTitle || "(missing)"} |`,
    `| og:description | ${meta.ogDescription ? meta.ogDescription.slice(0, 60) + "..." : "(missing)"} |`,
    `| og:image | ${meta.ogImage ? "Set" : "(missing)"} |`,
    `| og:type | ${meta.ogType || "(missing)"} |`,
    `| og:url | ${meta.ogUrl || "(missing)"} |`,
    "",
    "## Twitter Card",
    `| Property | Value |`,
    `|----------|-------|`,
    `| twitter:card | ${meta.twitterCard || "(missing)"} |`,
    `| twitter:title | ${meta.twitterTitle || "(missing)"} |`,
    `| twitter:description | ${meta.twitterDescription ? meta.twitterDescription.slice(0, 60) + "..." : "(missing)"} |`,
    `| twitter:image | ${meta.twitterImage ? "Set" : "(missing)"} |`,
  ];

  if (meta.issues.length > 0) {
    lines.push("", "## Issues");
    meta.issues.forEach((i) => lines.push(`- ${i}`));
  }

  return lines.join("\n");
}

// ─── Headings Report ─────────────────────────────────────────────

export function formatHeadings(headings: HeadingAnalysis): string {
  const lines = [
    "# Heading Analysis",
    "",
    "## Heading Hierarchy",
  ];

  if (headings.headings.length === 0) {
    lines.push("*No headings found on page.*");
  } else {
    for (const h of headings.headings) {
      const indent = "  ".repeat(h.level - 1);
      lines.push(`${indent}- **H${h.level}:** ${h.text.slice(0, 80)}${h.text.length > 80 ? "..." : ""}`);
    }
  }

  lines.push("", "## Counts", "| Level | Count |", "|-------|-------|");
  for (const [tag, count] of Object.entries(headings.counts)) {
    lines.push(`| ${tag.toUpperCase()} | ${count} |`);
  }

  if (headings.issues.length > 0) {
    lines.push("", "## Issues");
    headings.issues.forEach((i) => lines.push(`- ${i}`));
  }

  return lines.join("\n");
}

// ─── Images Report ───────────────────────────────────────────────

export function formatImages(images: ImageAnalysis): string {
  const lines = [
    "# Image Analysis",
    "",
    `**Total images:** ${images.total} | **With alt:** ${images.withAlt} | **Missing alt:** ${images.withoutAlt} | **Empty alt:** ${images.emptyAlt}`,
    "",
  ];

  if (images.images.length > 0) {
    lines.push("## Image Details", "| # | Source | Alt Text | Dimensions |", "|---|--------|----------|------------|");
    const displayImages = images.images.slice(0, 50); // Limit to 50
    displayImages.forEach((img, i) => {
      const src = img.src.length > 50 ? "..." + img.src.slice(-47) : img.src;
      const alt = img.alt === null ? "**MISSING**" : img.alt.length === 0 ? '""' : img.alt.slice(0, 40);
      const dims = img.width && img.height ? `${img.width}x${img.height}` : "Not set";
      lines.push(`| ${i + 1} | ${src} | ${alt} | ${dims} |`);
    });
    if (images.images.length > 50) {
      lines.push(`\n*...and ${images.images.length - 50} more images*`);
    }
  }

  if (images.issues.length > 0) {
    lines.push("", "## Issues");
    images.issues.forEach((i) => lines.push(`- ${i}`));
  }

  return lines.join("\n");
}

// ─── Links Report ────────────────────────────────────────────────

export function formatLinks(links: LinkAnalysis): string {
  const lines = [
    "# Link Analysis",
    "",
    `**Internal:** ${links.internalCount} | **External:** ${links.externalCount} | **Nofollow:** ${links.nofollow} | **Empty anchors:** ${links.emptyAnchors}`,
  ];

  if (links.internal.length > 0) {
    lines.push("", "## Internal Links (first 30)", "| # | URL | Anchor Text |", "|---|-----|-------------|");
    links.internal.slice(0, 30).forEach((l, i) => {
      const url = l.href.length > 60 ? l.href.slice(0, 57) + "..." : l.href;
      const text = l.text || "(empty)";
      lines.push(`| ${i + 1} | ${url} | ${text.slice(0, 40)} |`);
    });
    if (links.internal.length > 30) {
      lines.push(`\n*...and ${links.internal.length - 30} more*`);
    }
  }

  if (links.external.length > 0) {
    lines.push("", "## External Links (first 30)", "| # | URL | Anchor Text | Rel |", "|---|-----|-------------|-----|");
    links.external.slice(0, 30).forEach((l, i) => {
      const url = l.href.length > 50 ? l.href.slice(0, 47) + "..." : l.href;
      const text = l.text || "(empty)";
      lines.push(`| ${i + 1} | ${url} | ${text.slice(0, 30)} | ${l.rel || "none"} |`);
    });
    if (links.external.length > 30) {
      lines.push(`\n*...and ${links.external.length - 30} more*`);
    }
  }

  if (links.issues.length > 0) {
    lines.push("", "## Issues");
    links.issues.forEach((i) => lines.push(`- ${i}`));
  }

  return lines.join("\n");
}

// ─── Redirect Chain Report ───────────────────────────────────────

export function formatRedirectChain(
  originalUrl: string,
  finalUrl: string,
  chain: RedirectHop[]
): string {
  const lines = [
    "# Redirect Chain Analysis",
    "",
    `**Original URL:** ${originalUrl}`,
    `**Final URL:** ${finalUrl}`,
    `**Redirects:** ${chain.length}`,
    "",
  ];

  if (chain.length === 0) {
    lines.push("No redirects detected — URL resolves directly.");
  } else {
    lines.push("## Chain", "| # | URL | Status |", "|---|-----|--------|");
    chain.forEach((hop, i) => {
      lines.push(`| ${i + 1} | ${hop.url} | ${hop.status} ${hop.statusText} |`);
    });
    lines.push(`| ${chain.length + 1} | ${finalUrl} | (final destination) |`);

    if (chain.length > 2) {
      lines.push(
        "",
        "**WARNING:** Long redirect chain (>2 hops) — slows page load and wastes crawl budget."
      );
    }

    const has302 = chain.some((h) => h.status === 302);
    if (has302) {
      lines.push(
        "",
        "**INFO:** Uses 302 (temporary) redirects — if these are permanent, use 301 instead for SEO benefit."
      );
    }
  }

  return lines.join("\n");
}

// ─── Performance Report ──────────────────────────────────────────

export function formatPerformance(result: FetchResult): string {
  const sizeKb = (result.contentLength / 1024).toFixed(1);
  const issues: string[] = [];

  if (result.timing.durationMs > 3000) {
    issues.push(`CRITICAL: Page took ${(result.timing.durationMs / 1000).toFixed(1)}s to load — aim for <3s`);
  } else if (result.timing.durationMs > 1000) {
    issues.push(`WARNING: Page took ${(result.timing.durationMs / 1000).toFixed(1)}s to load — aim for <1s`);
  }

  if (result.contentLength > 500_000) {
    issues.push(`WARNING: Large page size (${sizeKb} KB) — consider optimizing`);
  }

  if (!result.headers["content-encoding"]) {
    issues.push("WARNING: No content encoding (gzip/brotli) detected — enable compression");
  }

  if (!result.headers["cache-control"]) {
    issues.push("WARNING: No Cache-Control header — consider adding caching directives");
  }

  if (!result.headers["strict-transport-security"]) {
    issues.push("INFO: No HSTS header — consider adding Strict-Transport-Security");
  }

  if (!result.headers["x-content-type-options"]) {
    issues.push("INFO: No X-Content-Type-Options header");
  }

  const lines = [
    "# Performance Analysis",
    "",
    "## Metrics",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Response Time | ${result.timing.durationMs}ms |`,
    `| HTML Size | ${sizeKb} KB |`,
    `| HTTP Status | ${result.status} ${result.statusText} |`,
    `| Content-Type | ${result.contentType} |`,
    `| Encoding | ${result.headers["content-encoding"] || "none"} |`,
    `| Redirects | ${result.redirectChain.length} |`,
    "",
    "## Security Headers",
    `| Header | Present |`,
    `|--------|---------|`,
    `| Strict-Transport-Security | ${result.headers["strict-transport-security"] ? "Yes" : "No"} |`,
    `| X-Content-Type-Options | ${result.headers["x-content-type-options"] ? "Yes" : "No"} |`,
    `| X-Frame-Options | ${result.headers["x-frame-options"] ? "Yes" : "No"} |`,
    `| Content-Security-Policy | ${result.headers["content-security-policy"] ? "Yes" : "No"} |`,
    `| Referrer-Policy | ${result.headers["referrer-policy"] ? "Yes" : "No"} |`,
    `| Permissions-Policy | ${result.headers["permissions-policy"] ? "Yes" : "No"} |`,
  ];

  if (issues.length > 0) {
    lines.push("", "## Issues");
    issues.forEach((i) => lines.push(`- ${i}`));
  }

  return lines.join("\n");
}

// ─── Robots.txt Report ───────────────────────────────────────────

export function formatRobotsTxt(url: string, content: string | null): string {
  if (!content) {
    return `# Robots.txt Analysis\n\n**URL:** ${url}\n\nNo robots.txt found at this domain. All crawlers are allowed by default.`;
  }

  const lines = content.split("\n");
  const rules: { agent: string; allows: string[]; disallows: string[] }[] = [];
  let currentAgent = "";
  let currentAllows: string[] = [];
  let currentDisallows: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed === "") continue;

    const [key, ...valueParts] = trimmed.split(":");
    const value = valueParts.join(":").trim();

    if (key.toLowerCase() === "user-agent") {
      if (currentAgent) {
        rules.push({ agent: currentAgent, allows: currentAllows, disallows: currentDisallows });
      }
      currentAgent = value;
      currentAllows = [];
      currentDisallows = [];
    } else if (key.toLowerCase() === "allow") {
      currentAllows.push(value);
    } else if (key.toLowerCase() === "disallow") {
      currentDisallows.push(value);
    }
  }
  if (currentAgent) {
    rules.push({ agent: currentAgent, allows: currentAllows, disallows: currentDisallows });
  }

  // Find sitemaps
  const sitemaps = lines
    .filter((l) => l.trim().toLowerCase().startsWith("sitemap:"))
    .map((l) => l.split(":").slice(1).join(":").trim());

  const output = [
    "# Robots.txt Analysis",
    `**URL:** ${new URL(url).origin}/robots.txt`,
    "",
    "## Rules",
  ];

  if (rules.length === 0) {
    output.push("No rules found — all paths allowed.");
  } else {
    for (const rule of rules) {
      output.push(`### User-Agent: ${rule.agent}`);
      if (rule.disallows.length > 0) {
        output.push("**Disallowed:**");
        rule.disallows.forEach((d) => output.push(`- ${d || "(empty — allows all)"}`));
      }
      if (rule.allows.length > 0) {
        output.push("**Allowed:**");
        rule.allows.forEach((a) => output.push(`- ${a}`));
      }
      output.push("");
    }
  }

  if (sitemaps.length > 0) {
    output.push("## Sitemaps");
    sitemaps.forEach((s) => output.push(`- ${s}`));
  }

  // Issues
  const issues: string[] = [];
  const wildcardDisallow = rules.some(
    (r) => r.agent === "*" && r.disallows.includes("/")
  );
  if (wildcardDisallow) {
    issues.push("CRITICAL: Disallow: / for all user-agents — the entire site is blocked from indexing!");
  }
  if (sitemaps.length === 0) {
    issues.push("INFO: No sitemap referenced in robots.txt — consider adding one");
  }

  if (issues.length > 0) {
    output.push("", "## Issues");
    issues.forEach((i) => output.push(`- ${i}`));
  }

  return output.join("\n");
}

// ─── Sitemap Report ──────────────────────────────────────────────

export function formatSitemap(
  url: string,
  data: { type: "index" | "urlset"; urls: string[] } | null
): string {
  if (!data) {
    return `# Sitemap Analysis\n\n**URL:** ${url}\n\nNo sitemap found at this URL. Check robots.txt for sitemap references.`;
  }

  const lines = [
    "# Sitemap Analysis",
    `**URL:** ${url}`,
    `**Type:** ${data.type === "index" ? "Sitemap Index" : "URL Set"}`,
    `**Entries:** ${data.urls.length}`,
    "",
  ];

  if (data.type === "index") {
    lines.push("## Child Sitemaps");
    data.urls.slice(0, 50).forEach((u, i) => lines.push(`${i + 1}. ${u}`));
    if (data.urls.length > 50) {
      lines.push(`\n*...and ${data.urls.length - 50} more sitemaps*`);
    }
  } else {
    lines.push("## URLs (first 50)");
    data.urls.slice(0, 50).forEach((u, i) => lines.push(`${i + 1}. ${u}`));
    if (data.urls.length > 50) {
      lines.push(`\n*...and ${data.urls.length - 50} more URLs*`);
    }
  }

  return lines.join("\n");
}

// ─── SSL Report ──────────────────────────────────────────────────

export function formatSSL(
  hostname: string,
  data: { valid: boolean; daysRemaining: number; validFrom: string; validTo: string; validFor: string[] } | null,
  error?: string
): string {
  if (error || !data) {
    return `# SSL Certificate Analysis\n\n**Host:** ${hostname}\n\n**Error:** ${error || "Could not retrieve certificate information"}`;
  }

  const issues: string[] = [];
  if (!data.valid) {
    issues.push("CRITICAL: SSL certificate is NOT valid");
  }
  if (data.daysRemaining < 30) {
    issues.push(`WARNING: Certificate expires in ${data.daysRemaining} days — renew soon!`);
  } else if (data.daysRemaining < 90) {
    issues.push(`INFO: Certificate expires in ${data.daysRemaining} days — plan renewal`);
  }

  const lines = [
    "# SSL Certificate Analysis",
    `**Host:** ${hostname}`,
    "",
    "## Certificate Details",
    `| Property | Value |`,
    `|----------|-------|`,
    `| Valid | ${data.valid ? "Yes" : "No"} |`,
    `| Days Remaining | ${data.daysRemaining} |`,
    `| Valid From | ${data.validFrom} |`,
    `| Valid To | ${data.validTo} |`,
    `| Valid For | ${data.validFor.slice(0, 5).join(", ")} |`,
  ];

  if (issues.length > 0) {
    lines.push("", "## Issues");
    issues.forEach((i) => lines.push(`- ${i}`));
  }

  return lines.join("\n");
}
