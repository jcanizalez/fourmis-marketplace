---
name: seo
description: Run a quick SEO analysis on a URL — meta tags, headings, score
arguments:
  - name: url
    description: The URL to analyze
    required: true
---

# /seo — Quick SEO Analysis

Run a comprehensive SEO analysis on the given URL.

## Steps

1. **Run the full analysis** using `seo_analyze_page` with the provided URL
2. **Highlight the most important findings**:
   - Show the overall SEO score prominently
   - List critical issues first (these need immediate attention)
   - Then warnings (should fix soon)
   - Then suggestions (nice-to-have improvements)
3. **Provide actionable recommendations**:
   - For each critical issue, explain exactly how to fix it
   - Prioritize fixes by impact (meta tags > headings > images > links)
4. **If the score is below 70**, suggest running specialized checks:
   - `seo_check_ssl` for SSL issues
   - `seo_check_redirects` if URL seems off
   - `seo_check_robots` to verify crawlability
   - `seo_check_performance` for speed and security headers
