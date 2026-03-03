---
name: go-review
description: Review Go code for idiomatic patterns, error handling, concurrency issues, and best practices
arguments:
  - name: path
    description: File or directory to review (default: .)
    required: false
---

# Go Review

Review the Go code at `$ARGUMENTS` (default: current directory) for idiomatic patterns and common issues. Scan all `.go` files (exclude `_test.go` for the main review, but check test patterns separately).

## Analysis Steps

1. **Error Handling**:
   - Errors returned but not checked (`_ = doSomething()`)
   - Errors wrapped without context (`return err` instead of `fmt.Errorf("...: %w", err)`)
   - Using `%v` instead of `%w` for wrapping (breaks errors.Is/As chain)
   - Logging AND returning errors (pick one)
   - Bare `return err` without context at multiple levels
   - Missing error checks on `Close()`, `Flush()`, deferred operations

2. **Concurrency**:
   - Data races — shared state without mutex or channels
   - Goroutines without `sync.WaitGroup` or `errgroup` (fire-and-forget)
   - Goroutine leaks — goroutines that never terminate
   - Missing context propagation in goroutines
   - Using `sync.Mutex` where `sync.RWMutex` is better (reads >> writes)
   - Channel operations without timeout or context

3. **Idiomatic Go**:
   - Getter methods named `GetX()` instead of `X()` (Go convention)
   - Interface names not ending in `-er` when they should
   - Large interfaces instead of small, composable ones
   - `interface{}` / `any` where generics or specific types work
   - Using `init()` for side effects that should be explicit
   - Exported types/functions missing doc comments

4. **Package Design**:
   - Circular imports
   - `utils` or `common` packages (too generic)
   - Public packages that should be in `internal/`
   - Interfaces defined at implementation site (should be at consumer site)

5. **Performance**:
   - String concatenation in loops (use `strings.Builder`)
   - Unnecessary allocations (pre-allocate slices with `make([]T, 0, cap)`)
   - Missing `defer` for cleanup (Close, Unlock, cancel)
   - HTTP client without timeout
   - Missing `sync.Pool` for frequently allocated large objects

6. **Testing**:
   - Tests without `t.Run()` subtests
   - Missing `t.Helper()` on helper functions
   - Hard-coded values instead of test fixtures in `testdata/`
   - No table-driven tests for functions with multiple cases

## Output Format

Group findings by severity:

🔴 **Critical** (bugs, data races, resource leaks):
| File:Line | Issue | Fix |

🟡 **Warning** (non-idiomatic, performance):
| File:Line | Issue | Fix |

🟢 **Good Patterns Found**: Highlight well-written idiomatic Go.

End with a Go quality score (X/10) and top 3 improvements.
