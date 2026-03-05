---
name: component-audit
description: Audit React components for anti-patterns, unnecessary re-renders, accessibility issues, and architectural problems
arguments:
  - name: path
    description: File or directory to audit (default: ./src)
    required: false
---

# Component Audit

Audit the React components at `$ARGUMENTS` (default: `./src`) for anti-patterns and improvement opportunities. Scan all `.tsx` and `.jsx` files.

## Analysis Steps

1. **Find components**: Locate all React component definitions (function components, arrow function components, class components).

2. **Re-render Risks**:
   - Inline object/array literals in JSX props (creates new reference every render)
   - Inline arrow functions passed to memoized children
   - Context values without useMemo
   - State stored too high in the tree (unnecessary re-renders of siblings)
   - Large components that should be split

3. **Hook Issues**:
   - Missing dependency array items in useEffect/useMemo/useCallback
   - useEffect with too many responsibilities (should be split)
   - State that should be derived (computed from other state)
   - `useState` + `useEffect` for data fetching instead of a query library
   - Unnecessary `useMemo`/`useCallback` on cheap operations

4. **Component Structure**:
   - Components over 200 lines (should be broken up)
   - Prop drilling through 3+ levels (needs Context or composition)
   - `any` typed props
   - Missing `key` prop or using array index as key for dynamic lists
   - Conditional hooks (violates Rules of Hooks)

5. **"use client" Boundary**:
   - Components marked `"use client"` that don't use hooks/events/browser APIs
   - Server Components importing client-only libraries
   - Data fetching in Client Components that could be in Server Components

6. **Accessibility**:
   - Click handlers on non-interactive elements (`<div onClick>`)
   - Missing `alt` on `<img>`
   - Missing `htmlFor` on `<label>`
   - Missing ARIA attributes on custom controls

7. **Patterns**:
   - Prop explosion (10+ props — should use composition)
   - God components (doing too many things)
   - Copy-pasted JSX (extract shared component)

## Output Format

Group by severity:

🔴 **Critical** (bugs or major issues):
| File | Line | Issue | Fix |
|------|------|-------|-----|

🟡 **Warning** (performance or architecture):
| File | Line | Issue | Fix |
|------|------|-------|-----|

🟢 **Good Patterns Found**: Highlight well-structured code.

End with: component health score (X/10), top 3 improvements, and estimated effort for each.

## Related

- Use `/hook-check` to deep-dive into hook-specific issues found during the audit
- Use `/react-refactor` to implement the suggested improvements on a specific component
