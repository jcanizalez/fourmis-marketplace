---
name: contrast
description: Check color contrast ratios in your CSS/Tailwind — finds text and UI elements that fail WCAG AA or AAA requirements
allowed-tools: Read, Glob, Grep
---

# /contrast — Color Contrast Checker

Scan CSS, Tailwind, and inline styles for color contrast issues.

## Usage

```
/contrast                           # Scan project for contrast issues
/contrast src/app/globals.css       # Check a specific CSS file
/contrast --level aaa               # Check against AAA (7:1) instead of AA
/contrast --fix                     # Suggest fixes for failing colors
```

## Workflow

1. **Find color declarations**: Scan CSS, Tailwind config, CSS-in-JS, and inline styles
2. **Extract color pairs**: Map foreground colors to their likely background colors
3. **Calculate ratios**: Compute contrast ratio for each pair using WCAG formula
4. **Report failures**: Show which pairs fail AA or AAA, with suggested alternatives

## Output Format

```
## Contrast Audit

| Element | Foreground | Background | Ratio | AA Text | AA Large | AAA |
|---------|-----------|------------|-------|---------|----------|-----|
| .error-text | #ff6666 | #ffffff | 2.4:1 | ❌ FAIL | ❌ FAIL | ❌ |
| .muted | #a3a3a3 | #ffffff | 2.6:1 | ❌ FAIL | ❌ FAIL | ❌ |
| .link | #3b82f6 | #ffffff | 3.5:1 | ❌ FAIL | ✅ Pass | ❌ |
| .heading | #1e293b | #ffffff | 14.5:1 | ✅ Pass | ✅ Pass | ✅ |
| .btn-primary | #ffffff | #2563eb | 4.6:1 | ✅ Pass | ✅ Pass | ❌ |

### Suggested Fixes

| Issue | Current | Suggested | New Ratio |
|-------|---------|-----------|-----------|
| .error-text | #ff6666 → #ffffff | #b91c1c → #ffffff | 6.0:1 ✅ AA |
| .muted | #a3a3a3 → #ffffff | #737373 → #ffffff | 4.7:1 ✅ AA |
| .link | #3b82f6 → #ffffff | #2563eb → #ffffff | 4.6:1 ✅ AA |

### Summary
- Checked: 24 color pairs
- Passing AA: 21 (87.5%)
- Failing AA: 3 (12.5%)
```

## What Gets Scanned

### CSS Files
- `color` + nearest `background-color` declarations
- CSS custom properties (resolves `var(--color-text)`)
- Tailwind `@theme` color definitions

### Tailwind Classes
- Text colors: `text-*` paired with `bg-*`
- Border colors: `border-*` against backgrounds
- Placeholder colors: `placeholder-*`

### Non-Text Elements (WCAG 1.4.11)
- Button borders against backgrounds (≥ 3:1)
- Input borders against backgrounds (≥ 3:1)
- Icon colors against backgrounds (≥ 3:1)
- Focus ring colors against backgrounds (≥ 3:1)

## Important

- This is a static analysis — it can't catch dynamically computed colors or user-applied themes
- Always verify with browser DevTools for runtime contrast (Chrome → Elements → color picker shows ratio)
- Dark mode needs separate checking — scan both themes
- Gradient backgrounds: check the worst-case contrast point
