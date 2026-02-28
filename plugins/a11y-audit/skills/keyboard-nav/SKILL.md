# Keyboard Navigation & Focus Management

Ensure all interactive elements are accessible via keyboard. Covers focus order, focus trapping, roving tabindex, skip links, and keyboard interaction patterns.

## Core Principles

1. **All functionality must be available from a keyboard** (WCAG 2.1.1)
2. **No keyboard traps** — users must be able to navigate away from any element (WCAG 2.1.2)
3. **Focus order is logical** — follows the visual reading order (WCAG 2.4.3)
4. **Focus is always visible** — a clear indicator shows the currently focused element (WCAG 2.4.7)

## Focus Order

### Natural Tab Order
Elements receive focus in DOM order. Match DOM order to visual order:

```html
<!-- BAD: visual order doesn't match DOM order (CSS reordering) -->
<style>
  .actions { display: flex; flex-direction: row-reverse; }
</style>
<div class="actions">
  <button>Cancel</button>   <!-- Tab 1, but appears on right -->
  <button>Submit</button>   <!-- Tab 2, but appears on left -->
</div>

<!-- GOOD: DOM matches visual order -->
<div class="actions">
  <button>Submit</button>   <!-- Tab 1, appears on left -->
  <button>Cancel</button>   <!-- Tab 2, appears on right -->
</div>
```

### tabindex Values

| Value | Behavior |
|-------|----------|
| `tabindex="0"` | Element is focusable in normal tab order (use for custom interactive elements) |
| `tabindex="-1"` | Element is focusable via JavaScript (`.focus()`) but NOT in tab order |
| `tabindex="1+"` | **NEVER USE** — overrides natural order, creates confusion |

```html
<!-- Make non-interactive element focusable for scripted focus management -->
<div id="error-summary" tabindex="-1">
  Please fix the following errors...
</div>

<script>
  // Focus programmatically after form validation fails
  document.getElementById("error-summary").focus();
</script>
```

## Skip Navigation

Allow keyboard users to skip repetitive navigation blocks:

```html
<body>
  <!-- Skip link — first focusable element on the page -->
  <a href="#main" class="skip-link">Skip to main content</a>
  <a href="#search" class="skip-link">Skip to search</a>

  <header>
    <nav aria-label="Main">
      <!-- Many navigation links... -->
    </nav>
  </header>

  <main id="main" tabindex="-1">
    <!-- tabindex="-1" ensures focus moves here programmatically -->
    <h1>Page Title</h1>
  </main>
</body>
```

```css
.skip-link {
  position: absolute;
  top: -100%;
  left: 0;
  padding: 0.75rem 1rem;
  background: #1e293b;
  color: #ffffff;
  font-weight: 600;
  z-index: 9999;
  transition: top 0.2s;
}

.skip-link:focus {
  top: 0;
}
```

## Keyboard Interaction Patterns

### Buttons
| Key | Action |
|-----|--------|
| `Enter` | Activate button |
| `Space` | Activate button |

### Links
| Key | Action |
|-----|--------|
| `Enter` | Follow link |
| `Space` | NO action (differs from button) |

### Checkboxes
| Key | Action |
|-----|--------|
| `Space` | Toggle checked state |

### Radio Buttons (within a group)
| Key | Action |
|-----|--------|
| `Arrow Down/Right` | Move to next option (and select) |
| `Arrow Up/Left` | Move to previous option (and select) |

### Select / Dropdown
| Key | Action |
|-----|--------|
| `Arrow Down/Up` | Navigate options |
| `Enter` / `Space` | Select option |
| `Escape` | Close dropdown |
| Type-ahead | Jump to matching option |

## Roving tabindex

Use roving tabindex for composite widgets (tab lists, menus, toolbars) where only one item in the group is in the tab order:

```html
<div role="toolbar" aria-label="Text formatting">
  <button tabindex="0" aria-pressed="false">Bold</button>
  <button tabindex="-1" aria-pressed="false">Italic</button>
  <button tabindex="-1" aria-pressed="false">Underline</button>
</div>
```

```typescript
function setupRovingTabindex(container: HTMLElement) {
  const items = Array.from(
    container.querySelectorAll<HTMLElement>('[role="tab"], button, [role="menuitem"]')
  );
  let currentIndex = 0;

  container.addEventListener("keydown", (e) => {
    let newIndex = currentIndex;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        newIndex = (currentIndex + 1) % items.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        newIndex = (currentIndex - 1 + items.length) % items.length;
        break;
      case "Home":
        newIndex = 0;
        break;
      case "End":
        newIndex = items.length - 1;
        break;
      default:
        return; // Don't prevent default for other keys
    }

    e.preventDefault();
    items[currentIndex].setAttribute("tabindex", "-1");
    items[newIndex].setAttribute("tabindex", "0");
    items[newIndex].focus();
    currentIndex = newIndex;
  });
}
```

## Focus Trapping

Constrain focus within a modal or dialog:

```typescript
function trapFocus(container: HTMLElement) {
  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelector);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== "Tab") return;

    if (e.shiftKey) {
      // Shift+Tab: if on first element, wrap to last
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: if on last element, wrap to first
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  container.addEventListener("keydown", handleKeyDown);

  // Focus the first element
  firstElement?.focus();

  // Return cleanup function
  return () => container.removeEventListener("keydown", handleKeyDown);
}
```

## Focus Management for SPAs

In Single Page Applications, manage focus on route changes:

```typescript
// React: focus management on navigation
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

function useFocusOnNavigate() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Focus the main content area on route change
    mainRef.current?.focus();

    // Update document title
    document.title = getPageTitle(location.pathname);

    // Announce to screen readers
    const announcer = document.getElementById("route-announcer");
    if (announcer) {
      announcer.textContent = `Navigated to ${getPageTitle(location.pathname)}`;
    }
  }, [location.pathname]);

  return mainRef;
}

// In your layout:
// <main ref={mainRef} tabIndex={-1}> ... </main>
// <div id="route-announcer" role="status" aria-live="polite" className="sr-only"></div>
```

## Focus Visible Styling

```css
/* Remove default outline only when mouse is used */
:focus:not(:focus-visible) {
  outline: none;
}

/* Show custom outline for keyboard navigation */
:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
  border-radius: 2px;
}

/* Enhanced focus for dark backgrounds */
[data-theme="dark"] :focus-visible {
  outline-color: #93c5fd;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
}

/* Focus styles for specific components */
button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

input:focus-visible {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}

a:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 4px;
  border-radius: 2px;
}
```

## Keyboard Testing Checklist

1. **Tab through the entire page** — can you reach every interactive element?
2. **Shift+Tab** — can you go backwards?
3. **Check focus order** — does it follow a logical reading order?
4. **Focus visibility** — is the focused element always clearly visible?
5. **Activate elements** — can you press Enter/Space on every button, link, checkbox?
6. **Escape** — do dialogs, menus, and popups close?
7. **Arrow keys** — do tabs, menus, and radio groups support arrow navigation?
8. **No traps** — can you always Tab away from any component?
9. **Skip link** — does a "Skip to content" link appear on first Tab press?
10. **Forms** — can you fill out and submit every form via keyboard?
