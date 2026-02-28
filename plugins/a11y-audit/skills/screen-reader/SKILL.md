# Screen Reader Optimization

Write HTML that works well with screen readers. Covers semantic markup, accessible names, descriptions, live regions, and testing with VoiceOver, NVDA, and other assistive technologies.

## How Screen Readers Work

Screen readers parse the **accessibility tree** — a parallel structure to the DOM that exposes roles, names, states, and properties. Every element in the accessibility tree has:

- **Role**: What it is (button, link, heading, textbox, etc.)
- **Name**: What it's called (from label, aria-label, aria-labelledby, or content)
- **State**: Current condition (checked, expanded, disabled, selected, etc.)
- **Description**: Additional context (from aria-describedby)

```
Accessibility Tree for:
<button aria-expanded="true" aria-label="Main menu">☰</button>

→ Role: button
→ Name: "Main menu"
→ State: expanded
→ Description: none
```

## Semantic HTML — The Foundation

Use the right HTML element for the job. Screen readers derive meaning from semantics:

```html
<!-- BAD: meaningless to screen readers -->
<div class="heading">Welcome</div>
<div class="nav">
  <div class="link" onclick="goto('/')">Home</div>
</div>
<div class="btn" onclick="submit()">Submit</div>

<!-- GOOD: semantic meaning is automatic -->
<h1>Welcome</h1>
<nav>
  <a href="/">Home</a>
</nav>
<button onclick="submit()">Submit</button>
```

### Heading Hierarchy

Screen reader users navigate by headings. Use a logical hierarchy:

```html
<!-- BAD: skipped heading levels -->
<h1>My App</h1>
<h3>Features</h3>    <!-- Skipped h2! -->
<h5>Pricing</h5>     <!-- Skipped h4! -->

<!-- GOOD: sequential heading levels -->
<h1>My App</h1>
  <h2>Features</h2>
    <h3>Feature 1</h3>
    <h3>Feature 2</h3>
  <h2>Pricing</h2>
    <h3>Free Plan</h3>
    <h3>Pro Plan</h3>
```

Rules:
- Every page has exactly one `<h1>`
- Don't skip levels (h1 → h3)
- Don't use headings for visual styling — use CSS classes instead

## Accessible Names

Every interactive element needs an accessible name. The browser calculates the name from (in priority order):

1. `aria-labelledby` — points to another element's text
2. `aria-label` — direct string label
3. `<label>` — associated label element
4. Element content — text inside the element
5. `title` attribute — last resort, avoid for accessibility
6. `placeholder` — NOT a valid accessible name

### Form Labels

```html
<!-- Method 1: explicit <label> with for/id (PREFERRED) -->
<label for="email">Email address</label>
<input id="email" type="email">

<!-- Method 2: wrapping <label> -->
<label>
  Email address
  <input type="email">
</label>

<!-- Method 3: aria-label (when no visible label) -->
<input type="search" aria-label="Search products">

<!-- Method 4: aria-labelledby (label from another element) -->
<h2 id="billing-title">Billing Address</h2>
<input aria-labelledby="billing-title" type="text">

<!-- BAD: placeholder is NOT a label -->
<input type="email" placeholder="Email address">
<!-- Screen reader may announce it, but it disappears on input -->
```

### Button Labels

```html
<!-- GOOD: text content is the label -->
<button>Save changes</button>

<!-- GOOD: aria-label for icon buttons -->
<button aria-label="Close dialog">
  <svg aria-hidden="true"><!-- X icon --></svg>
</button>

<!-- GOOD: visible text + supplementary context -->
<button>
  Delete
  <span class="sr-only">user John Smith</span>
</button>
<!-- Announced as: "Delete user John Smith" -->

<!-- BAD: generic label in repeated context -->
<div class="card">
  <h3>Premium Plan</h3>
  <button>Learn more</button>  <!-- Learn more about what? -->
</div>

<!-- GOOD: specific label -->
<div class="card">
  <h3>Premium Plan</h3>
  <button aria-label="Learn more about Premium Plan">Learn more</button>
</div>
```

### Link Labels

```html
<!-- BAD: vague link text -->
<a href="/docs">Click here</a>
<a href="/pricing">Read more</a>

<!-- GOOD: descriptive link text -->
<a href="/docs">View documentation</a>
<a href="/pricing">See pricing plans</a>

<!-- GOOD: supplementary hidden text -->
<a href="/post/123">
  Read more<span class="sr-only"> about deploying to production</span>
</a>
```

## Tables

```html
<!-- GOOD: accessible data table -->
<table>
  <caption>Q4 2025 Revenue by Region</caption>
  <thead>
    <tr>
      <th scope="col">Region</th>
      <th scope="col">Revenue</th>
      <th scope="col">Growth</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">North America</th>
      <td>$4.2M</td>
      <td>+12%</td>
    </tr>
    <tr>
      <th scope="row">Europe</th>
      <td>$2.8M</td>
      <td>+8%</td>
    </tr>
  </tbody>
</table>
```

Rules:
- Use `<caption>` for table title
- Use `<th scope="col">` for column headers
- Use `<th scope="row">` for row headers
- Don't use tables for layout
- For complex tables with merged cells, use `headers` attribute

## Images

```html
<!-- Informative image: describe the content -->
<img src="chart.png" alt="Revenue grew 23% in Q4, reaching $7M">

<!-- Decorative image: empty alt -->
<img src="divider.png" alt="">

<!-- Functional image (icon in a link): describe the function -->
<a href="/home">
  <img src="logo.png" alt="Company Name - Home">
</a>

<!-- Complex image: use figure + figcaption -->
<figure>
  <img src="architecture.png" alt="System architecture diagram">
  <figcaption>
    The system consists of three layers: API gateway, microservices,
    and a shared PostgreSQL database cluster.
  </figcaption>
</figure>

<!-- SVG: needs role and label -->
<svg role="img" aria-label="Warning icon">
  <title>Warning</title>
  <!-- paths -->
</svg>

<!-- Decorative SVG: hide from screen readers -->
<svg aria-hidden="true" focusable="false">...</svg>
```

## Live Regions for Dynamic Content

Announce changes to screen reader users without moving focus:

```html
<!-- Toast notification -->
<div id="toast-container" role="status" aria-live="polite" aria-atomic="true">
  <!-- JS injects: "Settings saved" — screen reader announces it -->
</div>

<!-- Error alert -->
<div role="alert">
  Unable to save. Please try again.
  <!-- role="alert" is implicitly aria-live="assertive" -->
</div>

<!-- Loading state -->
<button aria-busy="true" disabled>
  <span aria-hidden="true">⏳</span>
  Saving...
</button>

<!-- Progress -->
<div role="progressbar" aria-valuenow="75" aria-valuemin="0" aria-valuemax="100"
     aria-label="Upload progress">
  75%
</div>
```

### Patterns for Common Updates

```typescript
// Announce a message to screen readers without visual change
function announce(message: string, priority: "polite" | "assertive" = "polite") {
  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", priority);
  el.setAttribute("aria-atomic", "true");
  el.className = "sr-only";
  document.body.appendChild(el);

  // Delay so screen reader detects the insertion
  requestAnimationFrame(() => {
    el.textContent = message;
    setTimeout(() => el.remove(), 3000);
  });
}

// Usage
announce("Item added to cart");
announce("Form validation failed", "assertive");
```

## Testing with Screen Readers

### VoiceOver (macOS) — Quick Reference

| Shortcut | Action |
|----------|--------|
| `Cmd + F5` | Toggle VoiceOver on/off |
| `VO + Right Arrow` | Move to next element |
| `VO + Left Arrow` | Move to previous element |
| `VO + Space` | Activate current element |
| `VO + U` | Open rotor (navigate by headings, links, landmarks) |
| `VO + Cmd + H` | Next heading |
| `VO + Cmd + L` | Next link |

(VO = Control + Option)

### NVDA (Windows) — Quick Reference

| Shortcut | Action |
|----------|--------|
| `Insert + Space` | Toggle focus/browse mode |
| `H` | Next heading |
| `D` | Next landmark |
| `K` | Next link |
| `F` | Next form field |
| `T` | Next table |
| `Insert + F7` | Elements list (links, headings, landmarks) |

### Testing Checklist

1. Turn on screen reader, close your eyes, navigate the page
2. Can you understand the page structure from headings alone?
3. Are all form fields announced with their labels?
4. Are button actions clear from their names?
5. Do dynamic changes (toasts, errors, loading states) get announced?
6. Are decorative images skipped?
7. Do tables make sense when read cell by cell?
8. Can you navigate by landmarks (banner, navigation, main, contentinfo)?
9. Are modals announced and focus-trapped correctly?
10. Is the page language set correctly (`<html lang="en">`)?
