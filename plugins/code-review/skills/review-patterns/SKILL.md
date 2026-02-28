# Review Patterns

Systematic patterns for reviewing code across languages. Knows what to look for in JavaScript/TypeScript, Python, Go, and general codebases.

## When to Activate

When the user asks to:
- Review code or a code change
- Check code quality of a file
- Find issues in a code snippet
- Perform a code audit or walkthrough

## Review Priority Order

Always review in this order — catch the big issues first:

### 1. Correctness
- Does it do what it's supposed to?
- Are there off-by-one errors?
- Are error cases handled?
- Are null/undefined/nil checks present where needed?
- Do async operations handle failures?

### 2. Security
- Input validation on user data?
- SQL injection, XSS, command injection risks?
- Hardcoded secrets or credentials?
- Authentication/authorization checks?
- Sensitive data in logs or error messages?

### 3. Edge Cases
- Empty inputs ([], "", {}, null, undefined)?
- Boundary values (0, -1, MAX_INT)?
- Concurrent access / race conditions?
- Network failures / timeouts?
- Large inputs / memory constraints?

### 4. Error Handling
- Are errors caught and handled?
- Are error messages helpful to the user?
- Does error handling preserve the error chain (cause)?
- Are resources cleaned up on error (files, connections)?
- Is there dead-catch-block anti-pattern (catch + ignore)?

### 5. Performance
- N+1 query patterns?
- Unbounded list/loop operations?
- Missing pagination on large datasets?
- Unnecessary re-renders (React) or re-computations?
- Large allocations in hot paths?

### 6. Readability
- Clear naming for variables and functions?
- Functions under ~50 lines?
- Nesting depth under 3 levels?
- Comments explain "why" not "what"?
- Consistent code style?

## Language-Specific Patterns

### JavaScript / TypeScript
| Pattern | What to Check |
|---------|--------------|
| `any` type usage | Should use specific types |
| Missing `await` | Async function called without await |
| `==` vs `===` | Use strict equality |
| Array mutation | `.push()` on state arrays (React) |
| Missing `?.` | Optional chaining for nullable access |
| `console.log` | Remove debugging logs |
| Unused imports | Dead imports increase bundle |
| Missing error boundary | React components without error handling |

### Python
| Pattern | What to Check |
|---------|--------------|
| Bare `except:` | Should catch specific exceptions |
| Mutable defaults | `def f(x=[])` — shared mutable default |
| Missing type hints | Public functions should be typed |
| f-string in SQL | SQL injection risk |
| `import *` | Namespace pollution |
| Missing `with` | File/resource handles without context manager |
| No `if __name__` | Module-level code runs on import |

### Go
| Pattern | What to Check |
|---------|--------------|
| Unchecked error | `result, _ := func()` — ignoring error |
| Goroutine leak | Goroutine without cancellation/context |
| nil pointer | Dereferencing without nil check |
| Race condition | Shared state without mutex/channel |
| Unbuffered channel | Can deadlock with single goroutine |
| Missing `defer` | Resource cleanup without defer |
| Error wrapping | Use `fmt.Errorf("...: %w", err)` |

## Review Depth Levels

| Level | Time | When | Focus |
|-------|------|------|-------|
| **Quick scan** | 2-5 min | Small changes, trusted author | Logic, obvious bugs |
| **Standard** | 10-20 min | Normal PRs | All 6 priorities above |
| **Deep dive** | 30-60 min | Security, core logic, new architecture | Everything + design |
