---
name: hook-check
description: Find issues in custom React hooks — missing deps, stale closures, unnecessary effects, and rules violations
arguments:
  - name: path
    description: File or directory to check (default: ./src)
    required: false
---

# Hook Check

Scan the React code at `$ARGUMENTS` (default: `./src`) for hook-related issues. Check all `.tsx`, `.jsx`, `.ts`, and `.js` files for custom hooks and hook usage.

## Analysis Steps

### 1. Rules of Hooks Violations
- Hooks called inside conditions (`if (...) { useState(...) }`)
- Hooks called inside loops (`for (...) { useEffect(...) }`)
- Hooks called in nested functions
- Hooks called in non-component, non-hook functions (missing `use` prefix)

### 2. Dependency Array Issues
- **Missing dependencies**: Variables used in useEffect/useMemo/useCallback that aren't in the dep array
- **Over-specified deps**: Dependencies that never change (dispatch, refs, setState)
- **Object/array deps**: Objects or arrays in dep arrays that are recreated every render (cause infinite loops)
- **Empty dep arrays**: `useEffect(() => {...}, [])` that reference external state (stale closure)

### 3. useEffect Anti-patterns
- **Data fetching without cleanup**: Missing abort controller for async operations
- **State sync effects**: `useEffect(() => setDerived(compute(value)), [value])` — should use useMemo
- **Unnecessary effects**: Transformations that can be done during render
- **Missing cleanup**: Event listeners, timers, subscriptions without return cleanup
- **Multiple responsibilities**: Single useEffect doing unrelated things

### 4. Custom Hook Issues
- Hooks that don't start with `use`
- Returning unstable references (objects/arrays created on every call)
- Missing memoization of return values
- Hooks that are too large (should be split)
- Hooks that mix concerns (data fetching + UI logic)

### 5. Performance Issues
- `useMemo`/`useCallback` with empty dep arrays for static values (use module-level const instead)
- `useMemo` on cheap operations (not worth the overhead)
- Missing `useCallback` for functions passed to memoized children
- `useRef` used where a simple variable would work

### 6. State Management Issues
- Related state stored in separate `useState` calls (should use useReducer)
- Derived state in useState (should be computed)
- State that should be a ref (doesn't need to trigger re-render)

## Output Format

| File | Hook/Line | Issue | Category | Fix |
|------|-----------|-------|----------|-----|

Categories: 🔴 Bug, 🟡 Performance, 🔵 Best Practice

### Summary
- Total hooks scanned: X
- Issues found: X (Y bugs, Z performance, W best practices)
- Top 3 fixes to prioritize

End with a hooks health score (X/10).
