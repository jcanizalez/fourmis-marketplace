# markdown-writer

Professional writing toolkit for Claude Code. Turn Claude into a skilled writer and editor with proven techniques for blog posts, technical documentation, SEO content, and more.

## Skills (6)

| Skill | What It Does |
|-------|-------------|
| **Blog Writing** | Hook patterns, post structure (hook → context → body → CTA), tone guidelines, formatting standards |
| **Technical Writing** | README templates, tutorial structure, architecture docs, code example standards, audience calibration |
| **Readability Optimization** | Flesch-Kincaid analysis, sentence/paragraph length, passive voice detection, word simplification |
| **SEO Writing** | Keyword placement, meta descriptions, heading optimization, featured snippet targeting, content patterns |
| **Content Outlining** | 6 outline frameworks (problem-solution, AIDA, tutorial, comparison, listicle, deep dive), brief definition |
| **Editing Checklist** | Three-pass editing method (structure → clarity → polish), before/after rewrites, wordy-to-concise replacements |

## Commands (3)

| Command | Description |
|---------|-------------|
| `/draft` | Generate a structured first draft from a topic — auto-selects format and applies relevant skills |
| `/readability` | Analyze text readability with metrics, scores, and specific improvement suggestions |
| `/outline` | Create a structured content outline using the appropriate framework for the content type |

## Agent (1)

| Agent | Description |
|-------|-------------|
| **Editor** | Reviews and improves written content using the three-pass editing method — structural, clarity, and polish passes with specific, actionable suggestions |

## Setup

No setup required. This is a pure skills plugin — no MCP server, no API keys, no dependencies. Install and use immediately.

```bash
fourmis plugin install markdown-writer
```

## Usage Examples

### Draft a blog post
```
/draft blog post about why TypeScript is worth the learning curve
```

### Analyze readability
```
/readability
[paste your text]
```

### Create an outline
```
/outline comparing React, Vue, and Svelte for new projects
```

### Edit existing content
The editor agent activates when you say:
- "Edit this article"
- "Review my writing"
- "Proofread this README"
- "Make this text better"

## Why This Plugin?

Claude writes well by default, but these skills encode **specific professional techniques**:

- **Blog hooks** that grab attention (not "In today's world...")
- **Readability metrics** with concrete thresholds (not just "make it clearer")
- **SEO checklists** covering title, meta, headings, keyword density
- **Editing passes** that catch different types of issues systematically
- **Outline frameworks** that match the content type (tutorial ≠ listicle ≠ comparison)

The result: distinctly better content that follows industry best practices.

## License

MIT
