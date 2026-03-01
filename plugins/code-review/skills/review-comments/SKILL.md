---
description: When the user asks about writing code review comments, providing PR feedback, commenting on code changes, structuring review feedback, review comment tone, categorizing review findings, or how to give constructive code review feedback
---

# Review Comments

How to write effective, constructive, and actionable code review comments. Covers comment structure, tone, categorization, and common anti-patterns.

## Comment Structure

Every review comment should follow this format:

```
[Category] Brief description of the issue

Explanation of why this matters.

Suggested fix or alternative approach.
```

### Example

```
[Bug] Off-by-one error in pagination

The `skip` calculation uses `page * limit` but pages are 1-indexed,
so page 1 skips the first `limit` records.

Suggestion:
  const skip = (page - 1) * limit;
```

## Comment Categories

Use these prefixes to classify comments:

| Prefix | Meaning | Blocking? |
|--------|---------|-----------|
| **[Bug]** | Incorrect behavior, logic error | ✅ Yes |
| **[Security]** | Security vulnerability | ✅ Yes |
| **[Perf]** | Performance issue | Depends |
| **[Nit]** | Style, formatting, minor preference | ❌ No |
| **[Question]** | Need clarification on intent | ❌ No |
| **[Suggestion]** | Alternative approach, improvement idea | ❌ No |
| **[Praise]** | Positive feedback, well-done code | ❌ No |
| **[TODO]** | Acknowledge tech debt, track for later | ❌ No |

## Effective Comment Examples

### Bug Report
```
[Bug] `findUser` returns null but caller doesn't check

Line 42: `const user = findUser(id)` — if the user doesn't exist,
`findUser` returns null, but line 43 immediately accesses
`user.email` which will throw.

Fix:
  const user = findUser(id);
  if (!user) return res.status(404).json({ error: 'User not found' });
```

### Security Issue
```
[Security] User input directly in SQL query

This query interpolates `req.params.id` directly:
  `SELECT * FROM users WHERE id = '${id}'`

This is a SQL injection vulnerability. Use parameterized queries:
  db.query('SELECT * FROM users WHERE id = $1', [id])
```

### Constructive Suggestion
```
[Suggestion] Consider extracting this into a utility function

This date formatting logic appears in 3 files (here, orders.ts,
and reports.ts). Extracting to a shared `formatDate()` utility
would reduce duplication and ensure consistent formatting.
```

### Positive Feedback
```
[Praise] Great error handling here

The retry logic with exponential backoff is well-implemented.
Clean separation between transient and permanent errors. 👍
```

### Non-Blocking Nit
```
[Nit] Could use optional chaining here

  const name = user && user.profile && user.profile.name;

Could be simplified to:
  const name = user?.profile?.name;

Not blocking — just a readability improvement.
```

## Comment Tone Guidelines

### Do
- Be specific — point to exact lines and explain why
- Be constructive — suggest fixes, not just problems
- Be kind — assume the author's best intent
- Ask questions when unsure — "Is this intentional?"
- Praise good work — positive feedback matters
- Explain the "why" — not just "change this"
- Use "we" language — "we should handle this case" vs "you missed this"

### Don't
- Be vague — "this needs work" (what specifically?)
- Be condescending — "obviously this is wrong"
- Nitpick everything — focus on what matters
- Make it personal — "you always do this"
- Block on style preferences — use a linter instead
- Leave only negative comments — balance with positives
- Write essays — keep comments concise

## Comment Volume Guidelines

| PR Size | Target Comments |
|---------|----------------|
| XS (1-10 lines) | 0-2 comments |
| S (11-50 lines) | 1-5 comments |
| M (51-200 lines) | 3-10 comments |
| L (201-400 lines) | 5-15 comments |
| XL (400+) | 10-20 + suggest splitting |

## Review Summary Template

After reviewing all files, provide a summary:

```markdown
## Review Summary

**Verdict**: ✅ Approve / 🔄 Request Changes / 💬 Comment

### What I Reviewed
- [list of files reviewed]

### What Looks Good
- [positive observations]

### Issues Found
- 🔴 **[Bug]** description (file:line)
- 🟠 **[Security]** description (file:line)
- 🟡 **[Suggestion]** description (file:line)

### Questions
- [any clarifying questions]

### Overall
[1-2 sentence summary of the review]
```
