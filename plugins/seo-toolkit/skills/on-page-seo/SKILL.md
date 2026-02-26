# On-Page SEO Optimization

Expert guidance for optimizing individual web pages for search engines.

## When to Activate

Activate when the user asks about SEO for a specific page, wants to optimize content for search, or is reviewing meta tags, headings, or content structure. Also activate when using seo_analyze_page or seo_check_meta_tags tools.

## Title Tag Best Practices

| Rule | Guideline |
|------|-----------|
| Length | 50-60 characters (Google truncates at ~60) |
| Primary keyword | Place near the beginning |
| Brand | Add at the end with a separator: "Topic - Brand" |
| Unique | Every page needs a unique title |
| Avoid | ALL CAPS, keyword stuffing, clickbait without delivering |

### Title Formulas

```
[Primary Keyword]: [Benefit] | [Brand]
How to [Action] [Topic] in [Timeframe] - [Brand]
[Number] [Topic] Tips That [Outcome] | [Brand]
[Topic] Guide: [Subtitle] - [Brand]
[Topic] vs [Topic]: [Differentiator] | [Brand]
```

## Meta Description Best Practices

| Rule | Guideline |
|------|-----------|
| Length | 150-160 characters |
| Include | Primary keyword naturally |
| CTA | Include a call to action ("Learn how", "Discover", "Get started") |
| Unique | Every page needs a unique description |
| Match | Must match the actual page content (Google ignores mismatches) |

## Heading Structure

### Proper Hierarchy
```
H1: Main page topic (exactly one per page)
  H2: Major section
    H3: Subsection
      H4: Detail point
  H2: Next major section
    H3: Subsection
```

### H1 Rules
- Exactly ONE H1 per page
- Should contain the primary keyword
- Should match (or be similar to) the title tag
- 20-70 characters is optimal

### Heading SEO Tips
- Include keywords naturally in H2s and H3s
- Use question-format headings for featured snippets
- Don't skip levels (H1 → H3 without H2 is bad)
- Use headings for structure, not styling

## Content Optimization

### Keyword Placement
| Location | Priority | Notes |
|----------|----------|-------|
| Title tag | Critical | Primary keyword near the beginning |
| H1 | Critical | Primary keyword, naturally phrased |
| First 100 words | High | Include primary keyword early |
| H2/H3 headings | High | Secondary keywords and variations |
| URL slug | High | Short, hyphenated, keyword-rich |
| Image alt text | Medium | Describe image with relevant keywords |
| Meta description | Medium | Include keyword for bold highlighting in SERP |
| Body text | Medium | Use naturally, aim for 1-2% density |

### Content Length Guidelines
| Content Type | Minimum | Optimal | Notes |
|-------------|---------|---------|-------|
| Blog post | 300 | 1,500-2,500 | Longer ranks better for competitive terms |
| Product page | 200 | 500-1,000 | Focus on features, specs, reviews |
| Landing page | 300 | 500-1,500 | CTA-focused, clear value prop |
| Pillar page | 2,000 | 3,000-5,000 | Comprehensive topic coverage |
| FAQ page | 500 | 1,000-2,000 | Target featured snippets |

### Readability
- Short paragraphs (2-4 sentences)
- Short sentences (15-20 words average)
- Active voice over passive
- Grade 6-8 reading level for most content
- Bullet points and numbered lists for scannability
- Bold key terms for emphasis

## Open Graph & Social

### Required OG Tags
```html
<meta property="og:title" content="Page Title">
<meta property="og:description" content="Page description">
<meta property="og:image" content="https://example.com/image.jpg">
<meta property="og:url" content="https://example.com/page">
<meta property="og:type" content="article">
```

### OG Image Specs
- Recommended: 1200x630 pixels
- Minimum: 600x315 pixels
- Format: JPG or PNG
- File size: Under 1MB
- Include text overlay for context

### Twitter Card
```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Page Title">
<meta name="twitter:description" content="Page description">
<meta name="twitter:image" content="https://example.com/image.jpg">
```

## Image SEO

### Alt Text Rules
- Describe the image content accurately
- Include keywords when naturally relevant
- Keep under 125 characters
- Don't start with "Image of" or "Photo of"
- Use empty alt="" only for decorative images

### Image Optimization
- Set explicit width and height to prevent layout shift (CLS)
- Use modern formats (WebP, AVIF) with fallbacks
- Lazy load below-the-fold images
- Compress images (target <200KB for web)
- Use descriptive filenames: `blue-running-shoes.webp` not `IMG_3847.jpg`

## Internal Linking

- Every page should have at least 2-3 internal links
- Use descriptive anchor text (not "click here")
- Link to related content within the same topic cluster
- Important pages should receive more internal links
- Fix orphan pages (pages with no internal links pointing to them)
- Keep click depth shallow (3 clicks from homepage max)
