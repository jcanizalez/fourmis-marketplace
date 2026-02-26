# Technical SEO

Server-side and infrastructure SEO optimization — the foundation that on-page SEO builds on.

## When to Activate

Activate when the user asks about technical SEO, site speed, crawlability, indexing issues, SSL, redirects, robots.txt, sitemaps, or Core Web Vitals. Also when using seo_check_ssl, seo_check_redirects, seo_check_robots, seo_check_sitemap, or seo_check_performance tools.

## Technical SEO Checklist

### Critical (Fix Immediately)
- [ ] Site loads over HTTPS (no mixed content)
- [ ] SSL certificate is valid and not expiring soon
- [ ] robots.txt doesn't block important pages
- [ ] Sitemap exists and is referenced in robots.txt
- [ ] No redirect loops
- [ ] Pages return 200 status (not 404, 500, etc.)
- [ ] Mobile-friendly viewport meta tag present

### Important (Fix Soon)
- [ ] Redirect chains are ≤2 hops
- [ ] 301 redirects used for permanent moves (not 302)
- [ ] Canonical tags on all pages
- [ ] No duplicate content (www vs non-www, http vs https)
- [ ] Proper URL structure (lowercase, hyphens, no parameters)
- [ ] HSTS header enabled
- [ ] Gzip/Brotli compression enabled

### Nice to Have
- [ ] Structured data (JSON-LD) on key pages
- [ ] Security headers (CSP, X-Frame-Options, etc.)
- [ ] Cache-Control headers properly configured
- [ ] Preconnect/preload for critical resources
- [ ] HTTP/2 or HTTP/3 enabled

## HTTPS & SSL

### Requirements
- All pages must load over HTTPS
- HTTP → HTTPS redirect must be a 301
- SSL certificate must be valid and trusted
- No mixed content (HTTP resources on HTTPS pages)

### SSL Check Workflow
```
1. seo_check_ssl <domain>         → certificate validity
2. seo_check_redirects http://... → verify HTTP → HTTPS redirect
3. seo_check_performance https://... → verify HSTS header
```

## Redirects

### When to Use Each Type
| Code | Type | Use When |
|------|------|----------|
| 301 | Permanent | Page permanently moved, domain change, URL restructure |
| 302 | Temporary | A/B testing, maintenance, seasonal content |
| 307 | Temporary (strict) | Like 302 but preserves HTTP method |
| 308 | Permanent (strict) | Like 301 but preserves HTTP method |

### Redirect Best Practices
- **Maximum 2 hops** — each hop adds latency and dilutes link equity
- **Avoid chains** — redirect A→C directly, not A→B→C
- **Use 301 for permanent** — 302s don't pass full link equity
- **Update internal links** — point to final URLs, don't rely on redirects
- **Monitor** — use `seo_check_redirects` to catch chains

### Common Redirect Problems
| Problem | Symptom | Fix |
|---------|---------|-----|
| Redirect loop | ERR_TOO_MANY_REDIRECTS | Check rules for circular references |
| Long chain | >2 hops in seo_check_redirects | Collapse to single redirect |
| Wrong type | 302 for permanent moves | Change to 301 |
| Missing redirect | 404 on old URL | Add 301 to new URL |
| Mixed content | HTTP resources on HTTPS page | Update all resources to HTTPS |

## Robots.txt

### Standard Template
```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /private/
Disallow: /search?
Disallow: /*?utm_

Sitemap: https://example.com/sitemap.xml
```

### Rules
- Must be at domain root: `https://example.com/robots.txt`
- Case-sensitive paths
- `Disallow: /` blocks EVERYTHING (never do this accidentally!)
- Empty `Disallow:` allows everything for that user-agent
- Always include `Sitemap:` directive
- Test with `seo_check_robots` before deploying changes

## Sitemaps

### XML Sitemap Template
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/page</loc>
    <lastmod>2026-02-26</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

### Sitemap Best Practices
- Maximum 50,000 URLs per sitemap file
- Maximum 50MB uncompressed per file
- Use sitemap index for large sites
- Include only canonical, indexable URLs
- Update `<lastmod>` when content changes
- Reference in robots.txt: `Sitemap: https://example.com/sitemap.xml`
- Submit to Google Search Console

## URL Structure

### Best Practices
```
✅ https://example.com/blog/seo-guide
✅ https://example.com/products/blue-running-shoes

❌ https://example.com/page?id=123&cat=4
❌ https://example.com/Blog/SEO_Guide
❌ https://example.com/p/123
```

### Rules
- Lowercase only
- Hyphens between words (not underscores)
- Short and descriptive (3-5 words)
- Include primary keyword
- No special characters or parameters
- No trailing slashes (pick one convention and stick to it)

## Page Speed Optimization

### Quick Wins
| Action | Impact | Effort |
|--------|--------|--------|
| Enable gzip/brotli compression | High | Low |
| Add Cache-Control headers | High | Low |
| Optimize images (WebP, compression) | High | Medium |
| Minify CSS/JS | Medium | Low |
| Lazy load below-fold images | Medium | Low |
| Preconnect to third-party domains | Medium | Low |
| Remove unused CSS/JS | High | High |

### Security Headers
| Header | Purpose | Recommended Value |
|--------|---------|-------------------|
| Strict-Transport-Security | Force HTTPS | `max-age=31536000; includeSubDomains` |
| X-Content-Type-Options | Prevent MIME sniffing | `nosniff` |
| X-Frame-Options | Prevent clickjacking | `DENY` or `SAMEORIGIN` |
| Content-Security-Policy | Control resource loading | Site-specific policy |
| Referrer-Policy | Control referrer info | `strict-origin-when-cross-origin` |
| Permissions-Policy | Control browser features | Restrict unused APIs |
