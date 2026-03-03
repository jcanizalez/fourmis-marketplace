---
name: go-errors
description: Audit error handling in Go code — find unchecked errors, missing context, broken wrapping chains, and error anti-patterns
arguments:
  - name: path
    description: File or directory to audit (default: .)
    required: false
---

# Go Errors Audit

Audit error handling in the Go code at `$ARGUMENTS` (default: current directory). Scan all `.go` files for error handling patterns and anti-patterns.

## Analysis Steps

### 1. Unchecked Errors
Search for patterns where errors are ignored:
- `_ = operation()` — explicitly ignored
- `operation()` without capturing the error return value
- `defer file.Close()` without checking the error
- `defer rows.Close()` without checking
- `fmt.Fprintf(w, ...)` in HTTP handlers without checking write errors

### 2. Missing Error Context
Find `return err` without wrapping — trace through call chains:
- Functions that return `err` directly instead of `fmt.Errorf("...: %w", err)`
- Multiple levels of bare `return err` — impossible to trace origin
- Error messages starting with uppercase or "error:" or "failed to" (redundant noise)

### 3. Broken Wrapping Chain
- Using `fmt.Errorf("...: %v", err)` instead of `%w` — breaks `errors.Is` / `errors.As`
- Wrapping with `%w` but also calling `err.Error()` in the message (double message)
- Using `errors.New()` to re-create an error instead of wrapping the original

### 4. Error Type Issues
- Sentinel errors that should be types (need to carry data)
- Custom error types missing `Unwrap()` method (breaks chain)
- Using `==` comparison instead of `errors.Is()`
- Type assertion instead of `errors.As()`

### 5. Anti-Patterns
- Logging AND returning the same error (double reporting)
- Using `log.Fatal` / `os.Exit` outside of `main()` (prevents cleanup)
- Panicking for recoverable errors (network, disk, user input)
- Swallowing errors silently (empty `if err != nil { }` blocks)
- Returning generic `errors.New("something went wrong")` without specific info

### 6. Goroutine Error Handling
- Goroutines that silently drop errors
- Missing error channels for goroutine results
- Not using `errgroup` when launching multiple goroutines
- Missing `recover()` in goroutines that might panic

## Output Format

| File:Line | Pattern | Severity | Current Code | Suggested Fix |
|-----------|---------|----------|--------------|---------------|

Severity: 🔴 Bug (error lost), 🟡 Degraded (hard to debug), 🟢 Style

### Summary
- Error checks found: X
- Issues found: Y
  - 🔴 Errors lost: N
  - 🟡 Missing context: N
  - 🟢 Style issues: N

End with an error handling score (X/10) and the top 3 most impactful fixes.
