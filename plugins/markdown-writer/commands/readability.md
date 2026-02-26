---
name: readability
description: Analyze text readability — Flesch score, sentence length, passive voice, word complexity, and actionable improvement suggestions
---

# /readability

Analyze the readability of text and provide a detailed report with improvement suggestions.

## Instructions

1. Identify the text to analyze:
   - If the user provides text after `/readability`, analyze that text
   - If the user provides a file path, read the file and analyze its content
   - If no text is provided, ask the user to paste the text or provide a file path
2. Apply the readability-optimization skill to perform a thorough analysis
3. Generate a readability report covering:
   - **Flesch Reading Ease score** (estimated)
   - **Average sentence length** (words per sentence)
   - **Longest sentence** (flag anything over 30 words)
   - **Average paragraph length** (sentences per paragraph)
   - **Passive voice percentage** (target: <10%)
   - **Complex word percentage** (words with 4+ syllables)
4. Identify the **top 5 worst offenders** — the specific sentences or paragraphs that hurt readability most
5. Provide **before/after rewrites** for each offender
6. Give an overall assessment and 3 prioritized recommendations

## Report Format

Present the report in a clear, structured format:
```
## Readability Report

**Overall Score**: X/100 (Level)
**Target Audience**: [estimated]

### Metrics Table
[table with metrics, values, targets, and status icons]

### Top Issues
[numbered list with specific locations and suggested fixes]

### Suggested Rewrites
[before/after comparisons]

### Recommendations
[3 prioritized action items]
```

## Arguments

$ARGUMENTS
