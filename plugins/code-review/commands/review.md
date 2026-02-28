---
name: review
description: Review a file or code changes for bugs, security issues, and quality improvements
---

# /review — Code Review

Review a file, function, or set of changes for issues.

## Usage

```
/review <file>                  # Review an entire file
/review <file> <function>       # Review a specific function
/review --diff                  # Review unstaged git changes
/review --staged                # Review staged git changes
/review --quick <file>          # Quick scan (correctness + security only)
/review --deep <file>           # Deep review (all categories)
```

## Examples

```
/review src/services/auth.ts
/review src/api/orders.go handleCreateOrder
/review --diff
/review --staged
/review --deep src/payments/stripe.ts
```

## Process

1. **File argument**: Read the file and perform a systematic review:
   - Correctness: logic errors, off-by-one, null handling
   - Security: injection, secrets, auth checks
   - Edge cases: empty inputs, boundaries, concurrency
   - Error handling: catch blocks, error messages, cleanup
   - Performance: N+1 queries, unbounded loops, missing pagination
   - Readability: naming, complexity, duplication
2. **Function argument**: Focus review on the specified function
3. **--diff / --staged**: Run `git diff` or `git diff --staged`, review the changes
4. **--quick**: Only check correctness and security (fast)
5. **--deep**: Check everything including design patterns, SOLID, testing

## Output Format

Group findings by severity:
- 🔴 **Critical** — must fix (bugs, security)
- 🟠 **Important** — should fix (error handling, edge cases)
- 🟡 **Suggestion** — nice to fix (readability, performance)
- 🔵 **Nit** — optional (style, naming)

End with a summary and overall assessment.

## Notes

- Reviews the code in context — considers the project's patterns
- For PR reviews, use `/pr-review` instead
- Combine with `/audit` for security-focused review
