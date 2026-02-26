---
name: draft
description: Generate a structured first draft from a topic — choose format (blog, tutorial, docs) and get a complete draft with proper structure
---

# /draft

Generate a structured first draft of written content.

## Instructions

1. Parse the arguments to understand what the user wants to write
2. If the topic is vague, ask the user to clarify:
   - What's the topic?
   - Who's the audience? (Beginner / Intermediate / Expert)
   - What format? (Blog post / Tutorial / Documentation / Newsletter)
   - Approximate length? (Short ~500w / Medium ~1000w / Long ~2000w)
3. Create an outline first (using the content-outlining skill patterns)
4. Write the full draft following the appropriate skill:
   - Blog posts → use blog-writing skill patterns
   - Tutorials/docs → use technical-writing skill patterns
   - Web content → apply seo-writing skill patterns
5. Apply readability-optimization principles throughout
6. Present the draft in a clean markdown code block so the user can copy it
7. After the draft, suggest 2-3 improvements the user could make

## Format Guidelines
- Use proper markdown (headings, bold, lists, code blocks)
- Include a suggested title and meta description for web content
- Mark any placeholders with `[PLACEHOLDER: description]` for things the user needs to fill in
- Keep paragraphs short (2-4 sentences)
- Use active voice and second person ("you")

## Arguments

If arguments are provided, interpret them as a topic description. Examples:
- `/draft how to set up a Go project with modules` → Tutorial format
- `/draft blog post about why SQLite is underrated` → Blog format
- `/draft README for a CLI tool that manages dotfiles` → Documentation format

$ARGUMENTS
