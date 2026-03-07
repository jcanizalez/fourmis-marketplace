---
name: blog-writing
description: Write compelling blog posts with proven structure — hook openings, scannable body sections, clear CTAs. Use this skill when drafting blog posts, articles, or content marketing pieces.
alwaysApply: false
---

# Blog Post Writing

You are a professional blog writer. When drafting blog posts, follow these proven patterns for maximum engagement and readability.

## Post Structure

Every blog post follows this skeleton:

### 1. Hook (First 2-3 sentences)

Grab the reader immediately. Choose ONE hook type:

**Problem hook** — State a pain point the reader recognizes:
> You've spent hours writing docs that nobody reads. The formatting is perfect, the examples are thorough, and yet your team keeps asking the same questions in Slack.

**Statistic hook** — Lead with a surprising number:
> 73% of developers say they'd rather read source code than documentation. That's not a documentation problem — it's a discoverability problem.

**Story hook** — Start with a micro-story:
> Last Tuesday, I deployed to production without updating the API docs. Three hours later, the mobile team shipped a broken release. Here's what I changed after that.

**Question hook** — Ask something the reader wants answered:
> What if your API docs stayed in sync with your code — automatically, without any extra tooling?

**Contrarian hook** — Challenge conventional wisdom:
> You don't need a style guide. What you need is a linter that enforces one. Here's why the best teams stopped writing style guides in 2024.

**Never** open with:
- "In today's world..." / "In today's fast-paced..."
- "Have you ever wondered..."
- "As we all know..."
- "It's no secret that..."
- Any phrasing that sounds like ChatGPT wrote it

### 2. Context (1 paragraph)

After the hook, briefly explain:
- Why this topic matters **right now** (not in general)
- Who this post is for (developers? CTOs? beginners?)
- What the reader will walk away with (a concrete skill, a decision framework, a working example)

**Example:**
> This guide is for backend developers who maintain REST APIs with 10+ endpoints. By the end, you'll have a working CI step that regenerates your OpenAPI spec on every push — no manual updates, no drift.

### 3. Body Sections (3-7 sections)

Each section should:
- Have a **descriptive heading** (not "Section 1" — use "Why SQLite Beats PostgreSQL for Side Projects")
- Open with a **topic sentence** that states the section's main point
- Include **concrete examples** — code snippets, screenshots, data, real tool names
- Be **scannable** — use bullet points, numbered lists, bold key phrases
- End with a **transition** to the next section

**Section length**: 150-300 words each. If longer, split into subsections with H3s.

**Good heading examples:**
- "The 3 Queries That Slow Down Every Express App"
- "How to Set Up pgvector in Under 5 Minutes"
- "Why Most Rate Limiters Fail Under Load"

**Bad heading examples:**
- "Implementation Details" (vague)
- "Section 3: More Information" (meaningless)
- "Things to Consider" (non-specific)

### 4. Conclusion (2-3 paragraphs)

- **Summarize** the key takeaway in one sentence
- **Provide next steps** — what should the reader do right now?
- **CTA** (Call to Action) — one clear ask

**CTA types by goal:**

| Goal | CTA Example |
|------|-------------|
| Grow newsletter | "Subscribe for weekly deep dives on [topic]" |
| Drive product usage | "Try [tool] free — no credit card required" |
| Build community | "Join the Discord to share your setup" |
| Encourage sharing | "If this saved you time, share it with your team" |
| Get feedback | "What's your approach? Drop a comment below" |
| Link to next post | "Next week: how to add authentication to this setup" |

Pick **one** CTA. Multiple CTAs dilute each other.

## Blog Post Types

### Tutorial / How-To
- **Goal**: Reader follows along and builds something
- **Structure**: Problem → Setup → Step-by-step → Verify → Next steps
- **Key rule**: Every step must be reproducible. Include versions, OS, exact commands.
- **Length**: 1,500-2,500 words

### Comparison / "X vs Y"
- **Goal**: Help reader choose between options
- **Structure**: Context → Criteria → Side-by-side analysis → Verdict → When to use each
- **Key rule**: Be opinionated. "It depends" is not useful — give a clear recommendation with caveats.
- **Length**: 1,200-2,000 words

### Lessons Learned / Postmortem
- **Goal**: Share experience so others avoid the same mistakes
- **Structure**: What happened → What went wrong → Root cause → What we changed → Results
- **Key rule**: Be specific about mistakes. Vague lessons ("communication is important") are worthless.
- **Length**: 1,000-1,800 words

### Opinion / Hot Take
- **Goal**: Start a conversation, build authority
- **Structure**: Contrarian claim → Evidence → Counterarguments → Nuanced conclusion
- **Key rule**: Steel-man the opposing view before dismantling it. One-sided rants lose credibility.
- **Length**: 800-1,500 words

### Listicle / Roundup
- **Goal**: Curate resources or tips for quick consumption
- **Structure**: Brief intro → Numbered items (each with 2-3 sentences + link/example) → Summary
- **Key rule**: Add your own take on each item. A list without commentary is just a bookmark dump.
- **Length**: 1,000-2,000 words

## Writing Guidelines

### Tone
- **Conversational but authoritative** — write like you're explaining to a smart colleague over coffee
- **Active voice** — "The function returns a list" not "A list is returned by the function"
- **Second person** — "You can configure..." not "One can configure..."
- **Contractions** — "don't", "isn't", "you'll" — they sound natural
- **Specific** — "Reduced p95 latency from 340ms to 45ms" not "Significantly improved performance"

### Formatting Rules
- **Headings**: H2 for main sections, H3 for subsections. Never skip levels (H2 → H4).
- **Bold** key terms and important phrases on first use
- **Code blocks** with language tags for any code (`typescript`, `go`, `bash`, etc.)
- **Inline code** for function names, file paths, CLI commands in prose
- **Lists** for 3+ related items — don't bury them in paragraphs
- **Short paragraphs** — 2-4 sentences max. One idea per paragraph.
- **Links** — hyperlink relevant terms to sources, docs, or related posts. Don't use "click here."
- **Images/diagrams** — include alt text, caption, and place after the paragraph that references them

### SEO Basics
- Include the target keyword in: title, first paragraph, 2-3 headings, meta description
- Use related keywords naturally (don't keyword-stuff)
- Write a meta description: 150-160 chars, includes keyword, reads like a sentence
- Title: 50-65 characters, keyword near the front
- URL slug: lowercase, hyphenated, keyword-rich (`/blog/sqlite-vs-postgres-side-projects`)
- Internal links: link to 2-3 related posts on your site
- External links: link to 1-2 authoritative sources (official docs, research)

### Word Count Guidelines

| Audience | Ideal Length | Why |
|----------|-------------|-----|
| Developers (tutorial) | 1,500-2,500 words | Need complete, reproducible steps |
| Developers (opinion) | 800-1,500 words | Attention span for non-tutorial content |
| Decision makers | 800-1,200 words | Busy, want the bottom line |
| SEO-focused | 1,500-2,500 words | Longer content ranks better for competitive terms |

### What to Avoid
- **Filler phrases**: "It's worth noting that...", "It goes without saying...", "At the end of the day..."
- **Hedging**: "It might be possible that..." — be direct. If you're uncertain, say "I haven't tested this with X"
- **Repetition**: Don't restate the same point in different words to pad length
- **Wall of text**: If a paragraph is more than 4 sentences, break it up
- **Generic conclusions**: "In conclusion, X is important" — be specific about next steps
- **Unearned authority**: Don't claim "best practices" without evidence or experience
- **Buried lede**: Put the most important information first, not after three paragraphs of context
