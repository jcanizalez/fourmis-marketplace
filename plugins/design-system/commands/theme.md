---
name: theme
description: Generate or audit a complete design theme — colors, spacing, typography, shadows, and dark mode. Outputs CSS custom properties and Tailwind v4 @theme config
allowed-tools: Read, Write, Glob, Grep
---

# /theme — Design Theme Generator

Generate a complete design theme for your project or audit an existing one.

## Usage

```
/theme                          # Detect existing theme and audit it
/theme generate                 # Generate a full theme from scratch
/theme generate --brand #3b82f6 # Generate theme from a brand color
/theme audit                    # Audit existing theme for issues
/theme dark                     # Generate or fix dark mode tokens
```

## Workflow

### Generate Mode

1. **Ask for brand color** (or use provided `--brand` hex)
2. **Generate color scales**: From the brand color, produce a full 50-950 scale using OKLCH
3. **Generate semantic tokens**: Map colors to surface, text, border, interactive, status
4. **Generate supporting tokens**: Spacing (4px base), radius, shadows, z-index
5. **Generate dark mode**: Remap semantic tokens for dark backgrounds
6. **Output files**:
   - `globals.css` with `@theme` block (Tailwind v4) or CSS custom properties
   - `tokens.ts` for type-safe access
   - Theme preview summary

### Audit Mode

1. **Scan for theme files**: `globals.css`, `tailwind.config.*`, `theme.ts`, CSS variables
2. **Check completeness**: Missing color steps, no dark mode, inconsistent spacing
3. **Check accessibility**: Contrast ratios for text/background combinations
4. **Check consistency**: Mixed units, orphaned tokens, unused variables
5. **Report with fixes**: Show issues and generate corrected tokens

## Output

```
## Theme Generated

### Brand: #3b82f6 (Blue)
Color scale: 50 → 950 (11 steps)
Semantic tokens: 18 (surface, text, border, interactive, status)
Dark mode: ✅ class-based toggle

### Files
- app/globals.css — @theme block with all tokens
- lib/tokens.ts — TypeScript constants

### Preview
| Token | Light | Dark |
|-------|-------|------|
| surface | #ffffff | #0f172a |
| foreground | #111827 | #f1f5f9 |
| brand-600 | #2563eb | #3b82f6 |
| border | #e5e7eb | #334155 |
```

## Important

- Uses OKLCH color space for perceptually uniform scales
- Tailwind v4 `@theme` is preferred; falls back to `tailwind.config.js` for v3
- Dark mode uses semantic token remapping — components need zero changes
- Generated tokens follow the 3-tier architecture: global → semantic → component
