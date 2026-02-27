---
name: tdd
description: Start a TDD session — write tests first, implement to pass, then refactor
---

# /tdd — Test-Driven Development

Start a guided TDD session for building a feature or fixing a bug.

## Usage

```
/tdd <feature-description>     # Start TDD for a new feature
/tdd fix <bug-description>     # TDD for a bug fix (reproduce first)
/tdd <file> <function>         # TDD for a specific function
```

## Examples

```
/tdd "email validation function that checks format and domain"
/tdd fix "calculateTotal returns NaN for empty cart"
/tdd src/services/auth.ts resetPassword
```

## Process

1. **Understand the feature**: Read the description and any related code
2. **RED phase**: Write the first failing test
   - Start with the simplest possible test case
   - Run it and confirm it fails
3. **GREEN phase**: Write the minimum code to pass
   - Only enough code to make the test pass
   - No premature optimization
4. **REFACTOR phase**: Clean up while tests pass
   - Improve naming, reduce duplication
   - Run tests to confirm they still pass
5. **Repeat**: Add the next test case and cycle through again
6. **Continue iterating** through Red-Green-Refactor until the feature is complete

## For Bug Fixes

1. **Write a test that reproduces the bug** (it should fail)
2. **Fix the bug** (test should now pass)
3. **Add edge case tests** around the fix
4. The failing test becomes your regression test

## Notes

- TDD works best in watch mode — suggest starting `jest --watch` or `vitest`
- Each iteration should take 2-5 minutes
- If a test is hard to write, the code may need better design
- Focus on behavior, not implementation details
