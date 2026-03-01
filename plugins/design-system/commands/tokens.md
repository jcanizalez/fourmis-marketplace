---
name: tokens
description: Extract, document, and validate design tokens from your codebase — finds CSS variables, Tailwind config values, and token inconsistencies
allowed-tools: Read, Glob, Grep
---

# /tokens — Design Token Manager

Extract, document, and validate design tokens across your codebase.

## Usage

```
/tokens                         # Extract and document all tokens
/tokens audit                   # Find inconsistencies and unused tokens
/tokens contrast                # Check color contrast ratios
/tokens export --format json    # Export tokens as W3C JSON format
```

## Workflow

### Extract Mode (default)

1. **Scan sources**: CSS files, Tailwind config, `@theme` blocks, SCSS variables
2. **Categorize tokens**: Colors, spacing, typography, shadows, borders, motion
3. **Build token map**: All tokens with their values, usage count, and source file
4. **Output documentation**: Formatted table of all tokens

### Audit Mode

1. **Find inconsistencies**:
   - Raw hex/rgb values used directly instead of tokens
   - Spacing values not on the 4px grid (e.g., `13px`, `0.45rem`)
   - Colors outside the defined palette
   - Font sizes not from the type scale
   - Duplicate values with different names
2. **Find unused tokens**: Defined but never referenced
3. **Find hardcoded values**: Magic numbers that should be tokens
4. **Report with fix suggestions**

### Contrast Mode

1. **Extract text/background pairs** from components
2. **Calculate WCAG contrast ratios**
3. **Flag failures**: < 4.5:1 for normal text, < 3:1 for large text
4. **Suggest fixes**: Nearest passing color from the palette

## Output

```
## Token Inventory

### Colors (24 tokens)
| Token | Value | Usage | Category |
|-------|-------|-------|----------|
| --color-brand-500 | #3b82f6 | 12 refs | Brand |
| --color-brand-600 | #2563eb | 8 refs | Brand |
| --surface-primary | var(--color-white) | 15 refs | Semantic |
| --text-primary | var(--color-gray-900) | 22 refs | Semantic |

### Spacing (12 tokens)
| Token | Value | Usage |
|-------|-------|-------|
| --space-1 | 0.25rem | 8 refs |
| --space-2 | 0.5rem | 14 refs |
| --space-4 | 1rem | 19 refs |

### Issues Found
| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| ⚠️ Warning | Raw hex #333 used | Card.tsx:12 | Use var(--text-primary) |
| ⚠️ Warning | 13px not on grid | Modal.css:8 | Use 12px (--space-3) or 16px (--space-4) |
| 🔵 Info | Unused token | --color-teal-500 | Remove or start using |

### Contrast Check
| Pair | Ratio | Result |
|------|-------|--------|
| --text-primary on --surface | 15.4:1 | ✅ AAA |
| --text-secondary on --surface | 5.7:1 | ✅ AA |
| --text-tertiary on --surface | 3.2:1 | ⚠️ AA Large only |
```

## Important

- Supports CSS custom properties, Tailwind config, SCSS variables, and JSON tokens
- Contrast ratios follow WCAG 2.2 guidelines
- Export format follows the W3C Design Tokens Community Group specification
- Audit catches raw values that should reference tokens
