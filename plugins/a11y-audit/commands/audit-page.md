---
name: audit-page
description: Run a live accessibility audit on a webpage using Chrome DevTools — checks rendered DOM, contrast, landmarks, and ARIA in the browser
allowed-tools: Read, Glob, Grep, Bash
---

# /audit-page — Live Page Accessibility Audit

Audit a live webpage for accessibility issues using Chrome DevTools and automated tools.

## Usage

```
/audit-page                         # Audit the page currently open in Chrome
/audit-page http://localhost:3000   # Open and audit a specific URL
/audit-page --full                  # Full audit: automated + manual checklist
```

## Workflow

### Step 1: Automated Audit
Run Lighthouse accessibility audit via Chrome DevTools:

1. Open the target page in Chrome
2. Take a snapshot to understand the page structure
3. Run JavaScript-based checks in the page context:

```javascript
// Check for images without alt text
document.querySelectorAll("img:not([alt])");

// Check for inputs without labels
document.querySelectorAll("input:not([aria-label]):not([aria-labelledby])");

// Check for missing lang attribute
document.documentElement.lang;

// Check for missing main landmark
document.querySelector("main");

// Check heading hierarchy
document.querySelectorAll("h1, h2, h3, h4, h5, h6");

// Check for focus-removing styles
// (scan stylesheets for outline: none without replacement)
```

### Step 2: Visual Inspection
Take screenshots and check:
- Focus indicators are visible (tab through the page)
- Text is readable at current contrast
- No content is hidden from keyboard users
- Layout works at zoom levels

### Step 3: Keyboard Navigation Test
Tab through the page programmatically and verify:
- Every interactive element receives focus
- Focus order is logical
- No keyboard traps exist
- Escape closes dialogs/menus

### Step 4: Screen Reader Simulation
Read the accessibility tree and verify:
- All interactive elements have accessible names
- ARIA roles and states are correct
- Live regions announce dynamic content
- Landmarks structure the page properly

## Output Format

```
## Live Accessibility Audit: http://localhost:3000

### Page Info
- Title: My App
- Language: en
- Landmarks: header, nav (Main), main, footer

### Automated Checks
| # | Severity | Issue | Element | Fix |
|---|----------|-------|---------|-----|
| 1 | Critical | Image missing alt text | img.hero-image | Add alt="..." |
| 2 | Serious | Form input without label | input#search | Add aria-label="Search" |
| 3 | Serious | Low contrast text | .subtitle (2.8:1) | Darken to #595959 (7:1) |
| 4 | Moderate | Missing skip navigation | body > header | Add skip link as first child |
| 5 | Minor | Redundant ARIA | nav[role="navigation"] | Remove role (native element) |

### Heading Structure
✅ h1: "Welcome to My App"
  ✅ h2: "Features"
    ✅ h3: "Fast"
    ✅ h3: "Secure"
  ✅ h2: "Pricing"
  ❌ h4: "FAQ" (skipped h3!)

### Keyboard Navigation
✅ Skip link present and functional
✅ All buttons and links are focusable
✅ Focus indicators visible on all elements
❌ Modal does not trap focus
✅ Escape closes dropdown menus

### Score: 72/100 (3 critical/serious issues to fix)
```

## Limitations

- Automated tools catch ~30-40% of accessibility issues
- Manual testing (screen reader, keyboard) catches the rest
- This audit provides a starting point — always test with real assistive technology
- Dynamic content (SPAs, lazy loading) may need interaction to test fully
