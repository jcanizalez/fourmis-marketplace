# Color Contrast & Visual Accessibility

Ensure text and UI elements have sufficient color contrast for readability. Covers WCAG contrast requirements, color blindness considerations, and accessible color palette design.

## WCAG Contrast Requirements

### Contrast Ratios

| Content Type | Level AA | Level AAA |
|-------------|----------|-----------|
| Normal text (< 24px / < 18.66px bold) | ≥ 4.5:1 | ≥ 7:1 |
| Large text (≥ 24px / ≥ 18.66px bold) | ≥ 3:1 | ≥ 4.5:1 |
| UI components & graphical objects | ≥ 3:1 | — |
| Focus indicators | ≥ 3:1 | — |
| Disabled elements | exempt | exempt |
| Logos / decorative text | exempt | exempt |

### How to Calculate Contrast Ratio

The contrast ratio is calculated using relative luminance:

```
ratio = (L1 + 0.05) / (L2 + 0.05)

where L1 = lighter color luminance, L2 = darker color luminance

Relative luminance:
L = 0.2126 * R + 0.7152 * G + 0.0722 * B

where R, G, B are linearized:
if (sRGB ≤ 0.04045): linear = sRGB / 12.92
else: linear = ((sRGB + 0.055) / 1.055) ^ 2.4
```

### Quick Reference — Common Color Pairs

| Foreground | Background | Ratio | AA Normal | AA Large | AAA |
|-----------|------------|-------|-----------|----------|-----|
| `#000000` | `#ffffff` | 21:1 | ✅ | ✅ | ✅ |
| `#333333` | `#ffffff` | 12.6:1 | ✅ | ✅ | ✅ |
| `#595959` | `#ffffff` | 7.0:1 | ✅ | ✅ | ✅ |
| `#767676` | `#ffffff` | 4.5:1 | ✅ | ✅ | ❌ |
| `#949494` | `#ffffff` | 3.0:1 | ❌ | ✅ | ❌ |
| `#ffffff` | `#2563eb` | 4.6:1 | ✅ | ✅ | ❌ |
| `#ffffff` | `#dc2626` | 4.6:1 | ✅ | ✅ | ❌ |
| `#ffffff` | `#16a34a` | 3.1:1 | ❌ | ✅ | ❌ |
| `#ffffff` | `#059669` | 3.4:1 | ❌ | ✅ | ❌ |

## Accessible Color Palettes

### Design Principles

1. **Start with sufficient contrast**: Choose primary colors that meet 4.5:1 against white/black
2. **Test both modes**: Colors that work on light may fail on dark backgrounds
3. **Don't rely on color alone**: Always pair color with text, icons, or patterns
4. **Use semantic colors**: Error=red, success=green, warning=amber, info=blue — but always with text labels

### Accessible Semantic Colors (on white background)

```css
:root {
  /* These all pass AA (4.5:1+) on white */
  --color-error: #b91c1c;        /* red-700, 6.0:1 */
  --color-error-bg: #fef2f2;     /* red-50 */
  --color-success: #15803d;      /* green-700, 4.8:1 */
  --color-success-bg: #f0fdf4;   /* green-50 */
  --color-warning: #92400e;      /* amber-800, 6.3:1 */
  --color-warning-bg: #fffbeb;   /* amber-50 */
  --color-info: #1d4ed8;         /* blue-700, 5.6:1 */
  --color-info-bg: #eff6ff;      /* blue-50 */
}
```

### Dark Mode Accessible Colors (on dark background)

```css
@media (prefers-color-scheme: dark) {
  :root {
    /* Background: #111827 (gray-900) */
    --color-error: #fca5a5;        /* red-300, 6.4:1 */
    --color-success: #86efac;      /* green-300, 8.7:1 */
    --color-warning: #fcd34d;      /* amber-300, 10.9:1 */
    --color-info: #93c5fd;         /* blue-300, 6.7:1 */
  }
}
```

## Color Blindness Considerations

### Types and Prevalence

| Type | Affects | Prevalence | Confused Colors |
|------|---------|-----------|-----------------|
| Protanopia (no red) | Red perception | ~1% males | Red ↔ Green, Red ↔ Brown |
| Deuteranopia (no green) | Green perception | ~1% males | Green ↔ Red, Green ↔ Brown |
| Tritanopia (no blue) | Blue perception | ~0.003% | Blue ↔ Yellow |
| Achromatopsia | All color | ~0.003% | All colors |

### Patterns That Fail

```html
<!-- BAD: color is the only indicator -->
<style>
  .valid { color: green; }
  .invalid { color: red; }
</style>
<p class="valid">Username</p>    <!-- Can't distinguish from invalid -->
<p class="invalid">Password</p>

<!-- GOOD: color + icon + text -->
<p class="valid">✓ Username is available</p>
<p class="invalid">✗ Password must be 8+ characters</p>

<!-- BAD: traffic light status with color only -->
<span class="dot green"></span> Online
<span class="dot red"></span> Offline

<!-- GOOD: status with color + text + icon -->
<span class="status online">● Online</span>
<span class="status offline">○ Offline</span>
```

### Accessible Data Visualization

```
<!-- BAD: chart legend with color only -->
■ Revenue  ■ Expenses  ■ Profit

<!-- GOOD: chart with patterns + labels -->
██ Revenue (solid)
▒▒ Expenses (hatched)
░░ Profit (dotted)
```

For charts:
- Use patterns (solid, dashed, dotted) in addition to colors
- Label data points directly when possible
- Use shapes (circle, square, triangle) for scatter plots
- Provide data tables as alternatives to complex charts

## Non-Text Contrast (WCAG 1.4.11)

UI components and graphical objects must have ≥ 3:1 contrast against adjacent colors:

```css
/* BAD: light border on white (1.6:1) */
input {
  border: 1px solid #d1d5db; /* gray-300 on white */
}

/* GOOD: sufficient border contrast (3.2:1) */
input {
  border: 1px solid #9ca3af; /* gray-400 on white */
}

/* Icons must also meet contrast */
/* BAD: light icon (2.1:1) */
.icon { color: #c4c4c4; }

/* GOOD: sufficient icon contrast (4.6:1) */
.icon { color: #767676; }
```

### Focus Indicators

```css
/* Focus must have ≥ 3:1 contrast against the surrounding background */

/* BAD: subtle focus ring */
:focus-visible {
  outline: 2px solid #bfdbfe; /* light blue on white: 1.5:1 */
}

/* GOOD: visible focus ring */
:focus-visible {
  outline: 2px solid #2563eb; /* blue-600 on white: 4.6:1 */
  outline-offset: 2px;
}

/* GOOD: double ring for complex backgrounds */
:focus-visible {
  outline: 2px solid #ffffff;
  box-shadow: 0 0 0 4px #2563eb;
}
```

## Testing Tools

### Automated
- **Chrome DevTools**: Rendering → Emulate vision deficiencies
- **axe DevTools**: Browser extension for automated contrast checks
- **Lighthouse**: Built-in contrast audit
- **Colour Contrast Analyser (CCA)**: Desktop app with eyedropper

### Manual
- Squint test: Squint at the screen — can you still read the text?
- Grayscale test: Set display to grayscale — can you distinguish all elements?
- Zoom test: Zoom to 200% — do text and UI remain readable?

### Browser DevTools Contrast Check
1. Open DevTools → Elements panel
2. Select an element with text
3. Click the color swatch in Styles panel
4. The color picker shows the contrast ratio and AA/AAA compliance

## Audit Procedure for Contrast

1. Run Lighthouse accessibility audit — note all contrast failures
2. Check all text colors against their backgrounds
3. Check all interactive elements (buttons, inputs, links) in all states (default, hover, focus, active, disabled)
4. Check in both light and dark mode
5. Test with simulated color vision deficiencies (Chrome DevTools → Rendering)
6. Verify non-text elements (icons, borders, focus indicators) meet 3:1
