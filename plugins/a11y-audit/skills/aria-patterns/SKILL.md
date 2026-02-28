# ARIA Patterns & Landmarks

Accessible Rich Internet Applications (ARIA) patterns for interactive widgets, landmarks, and dynamic content. Use ARIA when native HTML semantics are insufficient.

## The First Rule of ARIA

> If you can use a native HTML element with the semantics and behavior you require, do so. Don't repurpose an element and add ARIA when a native element exists.

```html
<!-- BAD: div with ARIA when a button exists -->
<div role="button" tabindex="0" onclick="submit()">Submit</div>

<!-- GOOD: native button -->
<button type="submit">Submit</button>
```

## Page Landmarks

Every page should have these landmark regions:

```html
<body>
  <header role="banner">
    <nav aria-label="Main">...</nav>
  </header>

  <main role="main">
    <h1>Page Title</h1>
    <!-- primary content -->
  </main>

  <aside role="complementary" aria-label="Related links">
    <!-- secondary content -->
  </aside>

  <footer role="contentinfo">...</footer>
</body>
```

### Landmark Rules
- Every page needs exactly one `<main>`
- Use `aria-label` when multiple landmarks of the same type exist (e.g., two `<nav>` elements)
- Content outside landmarks is invisible to landmark navigation
- HTML5 semantic elements (`<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`) automatically create landmarks

## Interactive Widget Patterns

### Dialog / Modal

```html
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-desc"
>
  <h2 id="dialog-title">Delete item?</h2>
  <p id="dialog-desc">This action cannot be undone.</p>
  <button onclick="deleteItem()">Delete</button>
  <button onclick="closeDialog()">Cancel</button>
</div>
```

**Keyboard behavior:**
- `Escape` → close dialog
- `Tab` → cycle focus within dialog (focus trap)
- On open → focus first focusable element or the dialog itself
- On close → return focus to the element that opened it

```typescript
function openDialog(dialog: HTMLElement, trigger: HTMLElement) {
  dialog.hidden = false;
  dialog.setAttribute("aria-modal", "true");

  // Trap focus inside dialog
  const focusableElements = dialog.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusableElements[0];
  const last = focusableElements[focusableElements.length - 1];

  first?.focus();

  dialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDialog(dialog, trigger);
      return;
    }
    if (e.key === "Tab") {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  });
}

function closeDialog(dialog: HTMLElement, trigger: HTMLElement) {
  dialog.hidden = true;
  trigger.focus(); // Return focus to trigger
}
```

### Tabs

```html
<div>
  <div role="tablist" aria-label="Account settings">
    <button role="tab" id="tab-1" aria-selected="true" aria-controls="panel-1">
      Profile
    </button>
    <button role="tab" id="tab-2" aria-selected="false" aria-controls="panel-2" tabindex="-1">
      Security
    </button>
    <button role="tab" id="tab-3" aria-selected="false" aria-controls="panel-3" tabindex="-1">
      Billing
    </button>
  </div>

  <div role="tabpanel" id="panel-1" aria-labelledby="tab-1">
    Profile content...
  </div>
  <div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>
    Security content...
  </div>
  <div role="tabpanel" id="panel-3" aria-labelledby="tab-3" hidden>
    Billing content...
  </div>
</div>
```

**Keyboard behavior:**
- `Arrow Left/Right` → move between tabs
- `Home` → first tab
- `End` → last tab
- `Tab` → move into the active panel

### Accordion

```html
<div>
  <h3>
    <button
      aria-expanded="true"
      aria-controls="section-1"
      id="accordion-header-1"
    >
      Section 1
    </button>
  </h3>
  <div id="section-1" role="region" aria-labelledby="accordion-header-1">
    Content for section 1...
  </div>

  <h3>
    <button
      aria-expanded="false"
      aria-controls="section-2"
      id="accordion-header-2"
    >
      Section 2
    </button>
  </h3>
  <div id="section-2" role="region" aria-labelledby="accordion-header-2" hidden>
    Content for section 2...
  </div>
</div>
```

### Menu / Dropdown

```html
<div>
  <button
    aria-haspopup="true"
    aria-expanded="false"
    aria-controls="actions-menu"
  >
    Actions
  </button>
  <ul id="actions-menu" role="menu" hidden>
    <li role="menuitem"><button>Edit</button></li>
    <li role="menuitem"><button>Duplicate</button></li>
    <li role="separator"></li>
    <li role="menuitem"><button>Delete</button></li>
  </ul>
</div>
```

**Keyboard behavior:**
- `Enter` / `Space` → open menu, focus first item
- `Arrow Down/Up` → navigate items
- `Escape` → close menu, return focus to trigger
- `Home` → first item
- `End` → last item

### Combobox / Autocomplete

```html
<label for="city-input">City</label>
<div role="combobox" aria-expanded="true" aria-haspopup="listbox">
  <input
    id="city-input"
    type="text"
    aria-autocomplete="list"
    aria-controls="city-listbox"
    aria-activedescendant="city-2"
  >
  <ul id="city-listbox" role="listbox">
    <li id="city-1" role="option">New York</li>
    <li id="city-2" role="option" aria-selected="true">New Orleans</li>
    <li id="city-3" role="option">Newark</li>
  </ul>
</div>
```

### Toast / Notification

```html
<!-- Polite: non-urgent notifications (toast, success message) -->
<div role="status" aria-live="polite">
  Settings saved successfully.
</div>

<!-- Assertive: urgent alerts (errors, warnings) -->
<div role="alert" aria-live="assertive">
  Connection lost. Reconnecting...
</div>

<!-- Log: append-only content (chat, activity feed) -->
<div role="log" aria-live="polite" aria-label="Chat messages">
  <p>Alice: Hello!</p>
  <p>Bob: Hi there!</p>
</div>
```

## Live Regions

Use `aria-live` to announce dynamic content changes:

| Attribute | Value | Use Case |
|-----------|-------|----------|
| `aria-live` | `polite` | Wait for user to finish current task, then announce |
| `aria-live` | `assertive` | Interrupt immediately (errors, critical alerts) |
| `aria-live` | `off` | Don't announce changes |
| `aria-atomic` | `true` | Announce the entire region, not just changed parts |
| `aria-relevant` | `additions text` | What changes to announce (additions, removals, text, all) |

```html
<!-- Shopping cart counter -->
<span aria-live="polite" aria-atomic="true">
  Cart: 3 items
</span>

<!-- Search results count -->
<div role="status" aria-live="polite">
  Showing 12 of 150 results
</div>
```

## Common ARIA Mistakes

### 1. Redundant ARIA
```html
<!-- BAD: role redundant with native element -->
<button role="button">Submit</button>
<nav role="navigation">...</nav>
<main role="main">...</main>

<!-- GOOD: native semantics are sufficient -->
<button>Submit</button>
<nav>...</nav>
<main>...</main>
```

### 2. Using ARIA to hide content incorrectly
```html
<!-- aria-hidden="true" — hidden from screen readers but VISIBLE on screen -->
<span aria-hidden="true">🔒</span> Secure connection

<!-- hidden attribute — hidden from ALL users -->
<div hidden>Not visible to anyone</div>

<!-- sr-only — hidden VISUALLY but announced by screen readers -->
<span class="sr-only">Current page:</span>
```

### 3. Missing accessible names
```html
<!-- BAD: icon button with no name -->
<button><svg>...</svg></button>

<!-- GOOD: icon button with label -->
<button aria-label="Close"><svg aria-hidden="true">...</svg></button>

<!-- GOOD: icon button with visible text -->
<button><svg aria-hidden="true">...</svg> Close</button>
```

## Screen Reader-Only Utility

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.sr-only:focus,
.sr-only:focus-within {
  /* Make visible when focused (e.g., skip link) */
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```
