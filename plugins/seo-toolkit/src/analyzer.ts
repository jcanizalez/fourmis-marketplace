/**
 * SEO page analyzer — extracts and scores on-page SEO elements.
 *
 * Uses cheerio for HTML parsing. Checks meta tags, headings, images,
 * links, content quality, and technical SEO factors.
 */

import * as cheerio from "cheerio";

// ─── Types ───────────────────────────────────────────────────────

export interface MetaTagAnalysis {
  title: string | null;
  titleLength: number;
  description: string | null;
  descriptionLength: number;
  canonical: string | null;
  robots: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogType: string | null;
  ogUrl: string | null;
  twitterCard: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
  viewport: string | null;
  charset: string | null;
  language: string | null;
  issues: string[];
}

export interface HeadingAnalysis {
  headings: { level: number; text: string }[];
  counts: Record<string, number>;
  issues: string[];
}

export interface ImageAnalysis {
  total: number;
  withAlt: number;
  withoutAlt: number;
  emptyAlt: number;
  images: { src: string; alt: string | null; width: string | null; height: string | null }[];
  issues: string[];
}

export interface LinkAnalysis {
  internal: { href: string; text: string }[];
  external: { href: string; text: string; rel: string | null }[];
  internalCount: number;
  externalCount: number;
  nofollow: number;
  emptyAnchors: number;
  issues: string[];
}

export interface ContentAnalysis {
  wordCount: number;
  paragraphCount: number;
  avgWordsPerParagraph: number;
  readingTimeMinutes: number;
  hasStructuredData: boolean;
  structuredDataTypes: string[];
  issues: string[];
}

export interface FullPageAnalysis {
  url: string;
  meta: MetaTagAnalysis;
  headings: HeadingAnalysis;
  images: ImageAnalysis;
  links: LinkAnalysis;
  content: ContentAnalysis;
  score: number;
  scoreBreakdown: Record<string, number>;
}

// ─── Analyzers ───────────────────────────────────────────────────

export function analyzeMetaTags(html: string, url: string): MetaTagAnalysis {
  const $ = cheerio.load(html);
  const issues: string[] = [];

  const title = $("title").first().text().trim() || null;
  const titleLength = title?.length || 0;
  const description =
    $('meta[name="description"]').attr("content")?.trim() || null;
  const descriptionLength = description?.length || 0;
  const canonical = $('link[rel="canonical"]').attr("href") || null;
  const robots = $('meta[name="robots"]').attr("content") || null;
  const viewport = $('meta[name="viewport"]').attr("content") || null;
  const language = $("html").attr("lang") || null;

  // Charset detection
  const charsetMeta = $('meta[charset]').attr("charset") || null;
  const httpEquivCharset =
    $('meta[http-equiv="Content-Type"]').attr("content") || null;
  const charset =
    charsetMeta ||
    (httpEquivCharset?.match(/charset=([^\s;]+)/i)?.[1] ?? null);

  // Open Graph
  const ogTitle = $('meta[property="og:title"]').attr("content") || null;
  const ogDescription =
    $('meta[property="og:description"]').attr("content") || null;
  const ogImage = $('meta[property="og:image"]').attr("content") || null;
  const ogType = $('meta[property="og:type"]').attr("content") || null;
  const ogUrl = $('meta[property="og:url"]').attr("content") || null;

  // Twitter Card
  const twitterCard = $('meta[name="twitter:card"]').attr("content") || null;
  const twitterTitle =
    $('meta[name="twitter:title"]').attr("content") || null;
  const twitterDescription =
    $('meta[name="twitter:description"]').attr("content") || null;
  const twitterImage =
    $('meta[name="twitter:image"]').attr("content") || null;

  // ─── Issue Detection ─────────────────────────────────────────

  if (!title) {
    issues.push("CRITICAL: Missing <title> tag");
  } else if (titleLength < 30) {
    issues.push(`WARNING: Title too short (${titleLength} chars) — aim for 50-60`);
  } else if (titleLength > 60) {
    issues.push(
      `WARNING: Title too long (${titleLength} chars) — may be truncated in SERPs (max ~60)`
    );
  }

  if (!description) {
    issues.push("CRITICAL: Missing meta description");
  } else if (descriptionLength < 120) {
    issues.push(
      `WARNING: Meta description too short (${descriptionLength} chars) — aim for 150-160`
    );
  } else if (descriptionLength > 160) {
    issues.push(
      `WARNING: Meta description too long (${descriptionLength} chars) — may be truncated (max ~160)`
    );
  }

  if (!canonical) {
    issues.push("WARNING: Missing canonical URL — may cause duplicate content issues");
  }

  if (!viewport) {
    issues.push("CRITICAL: Missing viewport meta tag — page may not be mobile-friendly");
  }

  if (!language) {
    issues.push("WARNING: Missing lang attribute on <html> — affects accessibility and SEO");
  }

  if (!ogTitle || !ogDescription || !ogImage) {
    const missing: string[] = [];
    if (!ogTitle) missing.push("og:title");
    if (!ogDescription) missing.push("og:description");
    if (!ogImage) missing.push("og:image");
    issues.push(
      `WARNING: Missing Open Graph tags: ${missing.join(", ")} — affects social sharing`
    );
  }

  if (!twitterCard) {
    issues.push("INFO: No Twitter Card meta tags — consider adding for better social previews");
  }

  return {
    title,
    titleLength,
    description,
    descriptionLength,
    canonical,
    robots,
    ogTitle,
    ogDescription,
    ogImage,
    ogType,
    ogUrl,
    twitterCard,
    twitterTitle,
    twitterDescription,
    twitterImage,
    viewport,
    charset,
    language,
    issues,
  };
}

export function analyzeHeadings(html: string): HeadingAnalysis {
  const $ = cheerio.load(html);
  const issues: string[] = [];
  const headings: { level: number; text: string }[] = [];
  const counts: Record<string, number> = {};

  for (let level = 1; level <= 6; level++) {
    const tag = `h${level}`;
    counts[tag] = 0;
    $(tag).each((_i, el) => {
      const text = $(el).text().trim();
      headings.push({ level, text });
      counts[tag]++;
    });
  }

  // Issue detection
  if (counts.h1 === 0) {
    issues.push("CRITICAL: No H1 tag found — every page needs exactly one H1");
  } else if (counts.h1 > 1) {
    issues.push(
      `WARNING: Multiple H1 tags (${counts.h1}) — best practice is exactly one H1 per page`
    );
  }

  // Check for skipped heading levels
  let lastLevel = 0;
  for (const h of headings) {
    if (h.level > lastLevel + 1 && lastLevel > 0) {
      issues.push(
        `WARNING: Heading level skipped from H${lastLevel} to H${h.level} ("${h.text.slice(0, 50)}")`
      );
    }
    lastLevel = h.level;
  }

  // Check for very long headings
  for (const h of headings) {
    if (h.text.length > 70) {
      issues.push(
        `INFO: H${h.level} is very long (${h.text.length} chars): "${h.text.slice(0, 50)}..."`
      );
    }
  }

  if (headings.length === 0) {
    issues.push("WARNING: No headings found — headings help users and search engines understand content structure");
  }

  return { headings, counts, issues };
}

export function analyzeImages(html: string): ImageAnalysis {
  const $ = cheerio.load(html);
  const issues: string[] = [];
  const images: ImageAnalysis["images"] = [];

  $("img").each((_i, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || "";
    const alt = $(el).attr("alt") ?? null;
    const width = $(el).attr("width") || null;
    const height = $(el).attr("height") || null;
    images.push({ src, alt, width, height });
  });

  const total = images.length;
  const withAlt = images.filter((img) => img.alt !== null && img.alt.length > 0).length;
  const emptyAlt = images.filter((img) => img.alt !== null && img.alt.length === 0).length;
  const withoutAlt = images.filter((img) => img.alt === null).length;

  if (withoutAlt > 0) {
    issues.push(
      `CRITICAL: ${withoutAlt} image(s) missing alt attribute — bad for accessibility and SEO`
    );
  }

  if (emptyAlt > 0) {
    issues.push(
      `INFO: ${emptyAlt} image(s) with empty alt="" — acceptable for decorative images only`
    );
  }

  // Check for missing dimensions
  const missingDimensions = images.filter(
    (img) => !img.width || !img.height
  ).length;
  if (missingDimensions > 0) {
    issues.push(
      `WARNING: ${missingDimensions} image(s) without explicit width/height — may cause layout shift (CLS)`
    );
  }

  return { total, withAlt, withoutAlt, emptyAlt, images, issues };
}

export function analyzeLinks(html: string, pageUrl: string): LinkAnalysis {
  const $ = cheerio.load(html);
  const issues: string[] = [];
  const internal: LinkAnalysis["internal"] = [];
  const external: LinkAnalysis["external"] = [];
  let nofollow = 0;
  let emptyAnchors = 0;

  const pageOrigin = new URL(pageUrl).origin;

  $("a[href]").each((_i, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();
    const rel = $(el).attr("rel") || null;

    if (!text && !$(el).find("img").length) {
      emptyAnchors++;
    }

    if (rel?.includes("nofollow")) {
      nofollow++;
    }

    // Skip anchors, mailto, tel, javascript
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
      return;
    }

    try {
      const absoluteUrl = new URL(href, pageUrl).toString();
      const linkOrigin = new URL(absoluteUrl).origin;

      if (linkOrigin === pageOrigin) {
        internal.push({ href: absoluteUrl, text });
      } else {
        external.push({ href: absoluteUrl, text, rel });
      }
    } catch {
      // Invalid URL — skip
    }
  });

  if (internal.length === 0) {
    issues.push("WARNING: No internal links found — internal linking helps SEO and navigation");
  }

  if (emptyAnchors > 0) {
    issues.push(
      `WARNING: ${emptyAnchors} link(s) with empty anchor text — bad for accessibility and SEO`
    );
  }

  // Check for external links without rel="noopener"
  const unsafeExternal = external.filter(
    (l) => l.rel === null || (!l.rel.includes("noopener") && !l.rel.includes("noreferrer"))
  );
  if (unsafeExternal.length > 3) {
    issues.push(
      `INFO: ${unsafeExternal.length} external links without rel="noopener noreferrer" — consider adding for security`
    );
  }

  return {
    internal,
    external,
    internalCount: internal.length,
    externalCount: external.length,
    nofollow,
    emptyAnchors,
    issues,
  };
}

export function analyzeContent(html: string): ContentAnalysis {
  const $ = cheerio.load(html);
  const issues: string[] = [];

  // Extract visible text content
  $("script, style, noscript, iframe").remove();
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const words = bodyText.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  // Paragraph analysis
  const paragraphs = $("p")
    .map((_i, el) => $(el).text().trim())
    .get()
    .filter((p) => p.length > 0);
  const paragraphCount = paragraphs.length;
  const avgWordsPerParagraph =
    paragraphCount > 0
      ? Math.round(
          paragraphs.reduce(
            (sum, p) => sum + p.split(/\s+/).length,
            0
          ) / paragraphCount
        )
      : 0;

  // Reading time (average 200 wpm)
  const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200));

  // Structured data (JSON-LD, microdata)
  const structuredDataTypes: string[] = [];
  let hasStructuredData = false;

  $('script[type="application/ld+json"]').each((_i, el) => {
    hasStructuredData = true;
    try {
      const data = JSON.parse($(el).html() || "{}");
      if (data["@type"]) {
        structuredDataTypes.push(data["@type"]);
      } else if (Array.isArray(data["@graph"])) {
        for (const item of data["@graph"]) {
          if (item["@type"]) structuredDataTypes.push(item["@type"]);
        }
      }
    } catch {
      // Invalid JSON-LD
    }
  });

  // Issue detection
  if (wordCount < 300) {
    issues.push(
      `WARNING: Thin content (${wordCount} words) — aim for 300+ words for better rankings`
    );
  }

  if (paragraphCount === 0) {
    issues.push("WARNING: No <p> tags found — proper paragraph markup helps readability");
  }

  if (avgWordsPerParagraph > 150) {
    issues.push(
      `WARNING: Very long paragraphs (avg ${avgWordsPerParagraph} words) — break into shorter paragraphs for readability`
    );
  }

  if (!hasStructuredData) {
    issues.push(
      "INFO: No structured data (JSON-LD) found — adding schema markup can enhance search appearance"
    );
  }

  return {
    wordCount,
    paragraphCount,
    avgWordsPerParagraph,
    readingTimeMinutes,
    hasStructuredData,
    structuredDataTypes,
    issues,
  };
}

// ─── Full Page Analysis ──────────────────────────────────────────

export function analyzeFullPage(html: string, url: string): FullPageAnalysis {
  const meta = analyzeMetaTags(html, url);
  const headings = analyzeHeadings(html);
  const images = analyzeImages(html);
  const links = analyzeLinks(html, url);
  const content = analyzeContent(html);

  // Score calculation (0-100)
  const scoreBreakdown: Record<string, number> = {};

  // Meta tags (30 points)
  let metaScore = 30;
  const criticalMeta = meta.issues.filter((i) => i.startsWith("CRITICAL")).length;
  const warningMeta = meta.issues.filter((i) => i.startsWith("WARNING")).length;
  metaScore -= criticalMeta * 10;
  metaScore -= warningMeta * 3;
  scoreBreakdown.meta = Math.max(0, metaScore);

  // Headings (20 points)
  let headingScore = 20;
  const criticalHeading = headings.issues.filter((i) => i.startsWith("CRITICAL")).length;
  const warningHeading = headings.issues.filter((i) => i.startsWith("WARNING")).length;
  headingScore -= criticalHeading * 10;
  headingScore -= warningHeading * 3;
  scoreBreakdown.headings = Math.max(0, headingScore);

  // Images (15 points)
  let imageScore = 15;
  const criticalImage = images.issues.filter((i) => i.startsWith("CRITICAL")).length;
  const warningImage = images.issues.filter((i) => i.startsWith("WARNING")).length;
  imageScore -= criticalImage * 8;
  imageScore -= warningImage * 3;
  scoreBreakdown.images = Math.max(0, imageScore);

  // Links (15 points)
  let linkScore = 15;
  const warningLink = links.issues.filter((i) => i.startsWith("WARNING")).length;
  linkScore -= warningLink * 3;
  scoreBreakdown.links = Math.max(0, linkScore);

  // Content (20 points)
  let contentScore = 20;
  const warningContent = content.issues.filter((i) => i.startsWith("WARNING")).length;
  contentScore -= warningContent * 5;
  scoreBreakdown.content = Math.max(0, contentScore);

  const score = Object.values(scoreBreakdown).reduce((a, b) => a + b, 0);

  return { url, meta, headings, images, links, content, score, scoreBreakdown };
}
