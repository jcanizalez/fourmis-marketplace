---
name: outline
description: Create a structured content outline for any format — blog posts, tutorials, documentation, comparisons, or listicles
---

# /outline

Create a structured content outline before writing.

## Instructions

1. Parse the arguments to understand the topic
2. If the topic is vague, ask the user to clarify:
   - What's the topic?
   - Who's the audience?
   - What format? (Blog / Tutorial / Comparison / Listicle / Deep Dive / Documentation)
   - Approximate length?
   - Any SEO keyword to target?
3. Apply the content-outlining skill to:
   - Define the brief (topic, audience, goal, format, length)
   - Select the appropriate framework
   - Fill the skeleton with section summaries, key points, and word count estimates
   - Validate the outline for flow, completeness, and coverage
4. Present the outline in the standard format with:
   - Title suggestion
   - Content type and audience
   - Section-by-section breakdown with estimated word counts
   - Key research items or facts to verify
   - Total estimated length
5. Ask the user if they want to adjust anything before drafting
6. If the user approves, offer to generate the full draft with `/draft`

## Arguments

If arguments are provided, interpret them as a topic description. Examples:
- `/outline React server components guide for beginners` → Tutorial framework
- `/outline comparing Bun vs Node.js vs Deno` → Comparison framework
- `/outline 10 tips for writing better commit messages` → Listicle framework

$ARGUMENTS
