# WCAG 2.2 Compliance

Audit web content against the Web Content Accessibility Guidelines (WCAG) 2.2. Covers all four principles: Perceivable, Operable, Understandable, and Robust.

## WCAG Structure

WCAG has three conformance levels:
- **Level A**: Minimum — must fix (breaks access for many users)
- **Level AA**: Standard — target for most sites (legal requirement in many jurisdictions)
- **Level AAA**: Enhanced — ideal but not always feasible

## Audit Checklist by Principle

### 1. Perceivable — Information must be presentable to all users

#### Images & Non-Text Content (1.1.1 — Level A)
```html
<!-- BAD: no alt text -->
<img src="chart.png">

<!-- BAD: meaningless alt -->
<img src="chart.png" alt="image">

<!-- GOOD: descriptive alt -->
<img src="chart.png" alt="Bar chart showing Q4 revenue increased 23% vs Q3">

<!-- GOOD: decorative image — empty alt -->
<img src="divider.png" alt="" role="presentation">

<!-- GOOD: complex image with extended description -->
<figure>
  <img src="data-viz.png" alt="Sales by region, 2025">
  <figcaption>
    Western region leads at 42%, followed by Eastern at 28%...
  </figcaption>
</figure>
```

#### Video & Audio (1.2.x — Level A/AA)
- **1.2.1** (A): Provide text alternative for audio-only and video-only
- **1.2.2** (A): Captions for prerecorded video with audio
- **1.2.3** (A): Audio description or text alternative for video
- **1.2.4** (AA): Captions for live video
- **1.2.5** (AA): Audio descriptions for prerecorded video

```html
<video controls>
  <source src="demo.mp4" type="video/mp4">
  <track kind="captions" src="captions-en.vtt" srclang="en" label="English" default>
  <track kind="descriptions" src="descriptions-en.vtt" srclang="en" label="Audio Descriptions">
</video>
```

#### Color & Contrast (1.4.x)
- **1.4.1** (A): Color is not the only way to convey information
- **1.4.3** (AA): Text contrast ratio ≥ 4.5:1 (normal text), ≥ 3:1 (large text)
- **1.4.6** (AAA): Text contrast ratio ≥ 7:1 (normal), ≥ 4.5:1 (large)
- **1.4.11** (AA): Non-text contrast ≥ 3:1 (UI components, graphical objects)

```css
/* BAD: fails AA (2.4:1 ratio) */
.error { color: #ff6666; background: #ffffff; }

/* GOOD: passes AA (4.6:1 ratio) */
.error { color: #d32f2f; background: #ffffff; }

/* GOOD: passes AAA (8.6:1 ratio) */
.error { color: #b71c1c; background: #ffffff; }
```

#### Text Resize & Reflow (1.4.4, 1.4.10 — Level AA)
- Text must be resizable up to 200% without loss of functionality
- Content must reflow at 320px width (no horizontal scrolling)

```css
/* BAD: fixed pixel sizes prevent scaling */
body { font-size: 14px; }
.container { width: 1200px; }

/* GOOD: relative units allow scaling */
body { font-size: 1rem; }
.container { max-width: 75rem; width: 100%; }
```

### 2. Operable — UI must be navigable and operable

#### Keyboard Access (2.1.1 — Level A)
- All functionality available via keyboard
- No keyboard traps (2.1.2)
- Focus visible at all times (2.4.7 — AA)

```html
<!-- BAD: click-only, not keyboard accessible -->
<div onclick="toggle()">Menu</div>

<!-- GOOD: keyboard accessible button -->
<button type="button" onclick="toggle()">Menu</button>

<!-- GOOD: custom interactive element with keyboard support -->
<div role="button" tabindex="0"
     onclick="toggle()"
     onkeydown="if(event.key==='Enter'||event.key===' ')toggle()">
  Menu
</div>
```

#### Focus Management (2.4.3, 2.4.7 — Level A/AA)
```css
/* BAD: removes focus indicator entirely */
*:focus { outline: none; }

/* GOOD: custom focus indicator */
*:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

/* GOOD: enhanced focus for dark backgrounds */
*:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px #2563eb;
}
```

#### Timing (2.2.1 — Level A)
- Users can turn off, adjust, or extend time limits
- Auto-updating content can be paused, stopped, or hidden

#### Motion & Animation (2.3.1, 2.3.3 — Level A/AAA)
```css
/* Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

#### Page Navigation (2.4.x)
- **2.4.1** (A): Skip navigation link
- **2.4.2** (A): Pages have descriptive titles
- **2.4.4** (A): Link purpose clear from text
- **2.4.6** (AA): Headings and labels are descriptive
- **2.4.7** (AA): Focus is visible

```html
<!-- Skip navigation -->
<a href="#main-content" class="sr-only focus:not-sr-only">
  Skip to main content
</a>

<nav aria-label="Main navigation">...</nav>
<main id="main-content">...</main>
```

### 3. Understandable — Content must be readable and predictable

#### Language (3.1.1, 3.1.2 — Level A/AA)
```html
<html lang="en">
  <body>
    <p>Welcome to our site.</p>
    <p>Bienvenue sur notre site — <span lang="fr">nous parlons français</span>.</p>
  </body>
</html>
```

#### Input Assistance (3.3.x)
- **3.3.1** (A): Error identification — describe the error in text
- **3.3.2** (A): Labels or instructions for input
- **3.3.3** (AA): Error suggestions when known
- **3.3.4** (AA): Error prevention for legal/financial data

```html
<!-- GOOD: complete accessible form field -->
<div>
  <label for="email">Email address <span aria-hidden="true">*</span></label>
  <input
    id="email"
    type="email"
    required
    aria-required="true"
    aria-describedby="email-error email-hint"
    aria-invalid="true"
  >
  <p id="email-hint" class="hint">We'll never share your email</p>
  <p id="email-error" class="error" role="alert">
    Please enter a valid email address (e.g., user@example.com)
  </p>
</div>
```

### 4. Robust — Content must be compatible with assistive technologies

#### Valid HTML (4.1.1 — Level A, deprecated in WCAG 2.2)
#### Name, Role, Value (4.1.2 — Level A)
- All UI components have accessible name and role
- State changes are communicated to assistive tech

```html
<!-- BAD: custom component with no accessibility -->
<div class="toggle" data-state="off">Dark mode</div>

<!-- GOOD: toggle with proper role and state -->
<button
  role="switch"
  aria-checked="false"
  aria-label="Dark mode"
  onclick="this.setAttribute('aria-checked', this.getAttribute('aria-checked') === 'true' ? 'false' : 'true')"
>
  Dark mode
</button>
```

#### Status Messages (4.1.3 — Level AA)
```html
<!-- Announce status changes to screen readers -->
<div role="status" aria-live="polite">
  3 results found
</div>

<div role="alert" aria-live="assertive">
  Form submission failed. Please check the errors below.
</div>
```

## Quick Audit Procedure

1. **Automated scan**: Run axe-core, Lighthouse accessibility, or WAVE on every page
2. **Keyboard test**: Tab through the entire page — can you reach and operate everything?
3. **Screen reader test**: Use VoiceOver (macOS), NVDA (Windows), or Orca (Linux)
4. **Zoom test**: Zoom to 200% — does content reflow without horizontal scroll?
5. **Color test**: Check contrast ratios, ensure color isn't the only indicator
6. **Motion test**: Enable `prefers-reduced-motion` — does animation stop?

## Common Issues by Severity

### Critical (Level A violations)
- Missing alt text on informative images
- No keyboard access to interactive elements
- Missing form labels
- Keyboard traps
- Missing document language

### Serious (Level AA violations)
- Insufficient color contrast
- Missing focus indicators
- No skip navigation link
- Form errors not identified in text
- Missing heading hierarchy

### Moderate
- Redundant ARIA attributes
- Poor link text ("click here", "read more")
- Missing landmarks
- Inconsistent navigation
