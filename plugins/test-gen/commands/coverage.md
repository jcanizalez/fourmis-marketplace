---
name: coverage
description: Analyze test coverage, find untested code, and prioritize what to test next
---

# /coverage — Coverage Analysis

Analyze test coverage and find gaps in your test suite.

## Usage

```
/coverage                       # Analyze overall project coverage
/coverage <file>                # Analyze coverage for a specific file
/coverage gaps                  # Find the biggest untested areas
/coverage run                   # Run tests with coverage and analyze results
```

## Examples

```
/coverage
/coverage src/services/auth.ts
/coverage gaps
/coverage run
```

## Process

1. **No arguments or "run"**: Look for existing coverage reports or run tests with coverage:
   - Check for `coverage/` directory (Jest/Vitest), `htmlcov/` (pytest), `coverage.out` (Go)
   - If no report exists, suggest the right command to generate one
   - Parse and summarize the coverage data
2. **File argument**: Read the file and its test file, identify untested paths
   - Find branches without test coverage
   - Identify error paths without tests
   - Suggest specific test cases to add
3. **"gaps"**: Scan the project for the biggest testing gaps
   - Find source files without corresponding test files
   - Identify complex files with low or no coverage
   - Prioritize by risk (auth, payments, data mutation first)

## Output

- Overall coverage percentage with breakdown (lines, branches, functions)
- List of files sorted by coverage (lowest first)
- Specific untested lines and branches
- Recommended next tests to write (prioritized by risk)

## Notes

- Does not run tests itself — uses existing coverage reports or suggests commands
- Works with Jest, Vitest, pytest, Go coverage tools
- Coverage alone doesn't mean quality — use with test quality assessment
