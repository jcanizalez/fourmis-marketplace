---
name: test
description: Generate tests for a file, function, or module — auto-detects framework and language
---

# /test — Generate Tests

Generate unit tests for a specific file or function.

## Usage

```
/test <file>                    # Generate tests for a file
/test <file> <function>         # Generate tests for a specific function
/test <file> --integration      # Generate integration tests
/test <file> --edge-cases       # Focus on edge cases
```

## Examples

```
/test src/utils/auth.ts
/test src/services/user.ts createUser
/test api/handlers/orders.go --integration
/test lib/calculator.py divide --edge-cases
```

## Process

1. **Read the target file** to understand its structure, exports, and dependencies
2. **Auto-detect the testing framework** from project config:
   - `jest.config.*` or `package.json[jest]` → Jest
   - `vitest.config.*` → Vitest
   - `pytest.ini`, `pyproject.toml[tool.pytest]`, `conftest.py` → pytest
   - `*_test.go` files → Go testing
   - Fall back to asking the user if unclear
3. **Determine test file location**:
   - Co-located: `auth.test.ts` next to `auth.ts`
   - Separate: `tests/test_auth.py` or `tests/auth_test.go`
   - Match existing project convention
4. **Generate tests** following the AAA pattern (Arrange → Act → Assert):
   - Happy path for each exported function
   - Error/edge cases for complex logic
   - Mock external dependencies
   - Use framework-specific best practices
5. **Write the test file** and confirm with the user

## Test Generation Priorities

1. Exported/public functions first
2. Functions with branching logic (if/else, switch)
3. Functions with error handling (try/catch, error returns)
4. Functions with external dependencies (database, API calls)

## Notes

- Reads the existing project structure to match conventions
- Auto-imports the module under test
- Creates mock files if needed for external dependencies
- Generates descriptive test names following project conventions
