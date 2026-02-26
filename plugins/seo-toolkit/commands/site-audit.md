---
name: site-audit
description: Run a comprehensive technical SEO audit on a domain
arguments:
  - name: url
    description: The homepage URL of the site to audit
    required: true
---

# /site-audit — Full Technical SEO Audit

Run a comprehensive technical SEO audit covering all aspects of the site.

## Steps

1. **Start with the homepage** — run `seo_analyze_page` on the provided URL
2. **Check technical foundations** — run these in sequence:
   - `seo_check_ssl` on the domain
   - `seo_check_robots` on the URL
   - `seo_check_sitemap` (try common paths: /sitemap.xml, /sitemap_index.xml)
   - `seo_check_redirects` for HTTP → HTTPS redirect
   - `seo_check_performance` for speed and security headers
3. **Compile the audit report** with sections:
   - **Overall Score** from the page analysis
   - **SSL Status** — valid/expiring/issues
   - **Crawlability** — robots.txt rules, sitemap health
   - **Redirects** — any chains or issues
   - **Performance** — response time, compression, caching
   - **Security Headers** — which are present/missing
   - **On-Page SEO** — meta tags, headings, images
4. **Prioritize findings**:
   - CRITICAL: Fix immediately (broken SSL, blocked by robots.txt, missing title)
   - WARNING: Fix soon (long redirects, missing compression, thin content)
   - INFO: Consider improving (missing structured data, security headers)
5. **Provide a prioritized action plan** — numbered list of fixes in order of impact
