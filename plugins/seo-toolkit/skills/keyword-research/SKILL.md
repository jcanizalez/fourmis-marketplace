# Keyword Research Methodology

Systematic approach to finding and evaluating keywords without paid tools.

## When to Activate

Activate when the user asks about keywords, search terms, content topics, or search intent. Also when planning new content or optimizing existing pages for search.

## Search Intent Framework

Every keyword has an intent. Matching content to intent is the #1 ranking factor.

| Intent | Signal Words | Content Type | Example |
|--------|-------------|--------------|---------|
| Informational | how, what, why, guide, tutorial, tips | Blog post, guide, FAQ | "how to deploy docker" |
| Navigational | [brand name], login, docs, pricing | Homepage, product page | "github pricing" |
| Commercial | best, vs, review, comparison, top | Comparison, review, listicle | "best ci cd tools 2026" |
| Transactional | buy, download, sign up, free trial | Landing page, pricing | "buy ssl certificate" |

## Free Keyword Research Methods

### 1. Google Autocomplete
Type your seed keyword in Google and note the suggestions:
```
docker deploy →
  docker deploy to aws
  docker deploy container
  docker deploy compose production
  docker deploy kubernetes
```
Each suggestion = a real search query.

### 2. Google "People Also Ask"
Search your keyword and expand "People Also Ask" boxes. Each question is:
- A real user query
- A featured snippet opportunity
- A potential H2 or FAQ item

### 3. Google "Related Searches"
Scroll to the bottom of search results for related queries. These are:
- Semantically related terms
- Potential long-tail variations
- Content gap indicators

### 4. Google Search Console (if you have access)
```
Performance → Search Results → Queries tab
Sort by Impressions → find keywords you rank for but don't target
```
These are "low-hanging fruit" — you already rank, just need optimization.

### 5. Competitor Analysis (Free Method)
1. Search your target keyword
2. Open top 3-5 results
3. Use seo_check_meta_tags on each to see their title/description strategy
4. Use seo_check_headings to see their content structure
5. Note keywords they use in headings that you're missing

### 6. SearXNG/Search Engine Results
Use `seo_analyze_page` on top-ranking pages to understand:
- What keywords they emphasize in titles and headings
- Content depth (word count) for competitive terms
- Structured data they use (JSON-LD types)

## Keyword Evaluation Criteria

| Factor | Low Competition | High Competition |
|--------|----------------|------------------|
| Search results | <100M results | >1B results |
| SERP features | Few ads, no featured snippets | Ads, snippets, knowledge panel |
| Top results | Small sites, forums, old content | Major brands, .gov, Wikipedia |
| Content type | Diverse (blogs, forums, videos) | Homogeneous (all major brands) |
| Domain authority | Low-authority sites ranking | Only high-authority sites |

## Long-Tail Keyword Strategy

Long-tail keywords = 3+ words, lower volume, higher conversion.

### Pattern Templates
```
[action] [topic] [modifier]
  → deploy docker production
  → optimize postgres queries slow
  → fix github actions timeout

[topic] for [audience]
  → kubernetes for beginners
  → seo tools for developers
  → crm for freelancers

[topic] [comparison/vs]
  → docker vs podman 2026
  → next.js vs remix performance
  → sqlite vs postgres serverless
```

## Content Gap Analysis Process

1. **Identify your topic cluster** — what's the broad topic?
2. **Map existing content** — what pages do you already have?
3. **Search competitor sitemaps** — use `seo_check_sitemap` on competitors
4. **Compare headings** — use `seo_check_headings` on top-ranking pages
5. **Find missing subtopics** — what do they cover that you don't?
6. **Prioritize** — target gaps with commercial intent first

## Keyword-to-Content Mapping

| Keyword Type | Best Content Format | Length |
|-------------|-------------------|--------|
| "What is X" | Definitive guide with definition | 1,500-2,500 words |
| "How to X" | Step-by-step tutorial | 1,000-2,000 words |
| "X vs Y" | Comparison table + analysis | 1,500-3,000 words |
| "Best X" | Curated list with reviews | 2,000-4,000 words |
| "X tutorial" | Hands-on guide with code/screenshots | 2,000-5,000 words |
| "X pricing" | Pricing table + feature comparison | 500-1,500 words |
| "X review" | In-depth analysis with pros/cons | 1,000-2,000 words |
