# Accessible Component Recipes

Production-ready accessible component patterns for React, Vue, and vanilla HTML. Each pattern includes proper ARIA, keyboard handling, and screen reader support.

## Forms

### Text Input with Error

```tsx
interface InputProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

function TextInput({ id, label, error, hint, required }: InputProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div>
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>

      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}

      <input
        id={id}
        type="text"
        required={required}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={[
          error ? errorId : null,
          hint ? hintId : null,
        ].filter(Boolean).join(" ") || undefined}
      />

      {error && (
        <p id={errorId} className="text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

### Select / Dropdown

```html
<!-- Native select — preferred for most cases -->
<label for="country">Country</label>
<select id="country" required aria-required="true">
  <option value="">Select a country</option>
  <option value="us">United States</option>
  <option value="uk">United Kingdom</option>
  <option value="ca">Canada</option>
</select>

<!-- Grouped options -->
<label for="timezone">Timezone</label>
<select id="timezone">
  <optgroup label="Americas">
    <option value="est">Eastern (UTC-5)</option>
    <option value="cst">Central (UTC-6)</option>
    <option value="pst">Pacific (UTC-8)</option>
  </optgroup>
  <optgroup label="Europe">
    <option value="gmt">GMT (UTC+0)</option>
    <option value="cet">Central European (UTC+1)</option>
  </optgroup>
</select>
```

### Checkbox Group

```html
<fieldset>
  <legend>Notification preferences</legend>

  <div>
    <input type="checkbox" id="notify-email" name="notifications" value="email">
    <label for="notify-email">Email notifications</label>
  </div>

  <div>
    <input type="checkbox" id="notify-sms" name="notifications" value="sms">
    <label for="notify-sms">SMS notifications</label>
  </div>

  <div>
    <input type="checkbox" id="notify-push" name="notifications" value="push">
    <label for="notify-push">Push notifications</label>
  </div>
</fieldset>
```

### Radio Group

```html
<fieldset>
  <legend>Shipping method</legend>

  <div>
    <input type="radio" id="ship-standard" name="shipping" value="standard" checked>
    <label for="ship-standard">
      Standard (5-7 days) — Free
    </label>
  </div>

  <div>
    <input type="radio" id="ship-express" name="shipping" value="express">
    <label for="ship-express">
      Express (2-3 days) — $9.99
    </label>
  </div>

  <div>
    <input type="radio" id="ship-overnight" name="shipping" value="overnight">
    <label for="ship-overnight">
      Overnight — $24.99
    </label>
  </div>
</fieldset>
```

### Toggle Switch

```tsx
function Toggle({ id, label, checked, onChange }: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 rounded-full transition-colors
          ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-5 w-5 rounded-full bg-white transition-transform
            ${checked ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </button>
      <label htmlFor={id}>{label}</label>
    </div>
  );
}
```

## Navigation

### Breadcrumbs

```html
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/products">Products</a></li>
    <li><a href="/products/laptops">Laptops</a></li>
    <li aria-current="page">MacBook Pro</li>
  </ol>
</nav>
```

### Pagination

```html
<nav aria-label="Search results pages">
  <ul>
    <li>
      <a href="?page=1" aria-label="Previous page">← Previous</a>
    </li>
    <li><a href="?page=1" aria-label="Page 1">1</a></li>
    <li><a href="?page=2" aria-label="Page 2" aria-current="page">2</a></li>
    <li><a href="?page=3" aria-label="Page 3">3</a></li>
    <li>
      <a href="?page=3" aria-label="Next page">Next →</a>
    </li>
  </ul>
</nav>
```

### Mobile Navigation (Hamburger Menu)

```tsx
function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? "✕" : "☰"}
      </button>

      <nav
        id="mobile-menu"
        aria-label="Main navigation"
        hidden={!isOpen}
      >
        <ul role="list">
          <li><a href="/">Home</a></li>
          <li><a href="/about">About</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </nav>
    </>
  );
}
```

## Feedback & Status

### Alert / Banner

```html
<!-- Dismissible alert -->
<div role="alert" aria-label="Warning">
  <p>Your account expires in 3 days. <a href="/billing">Renew now</a>.</p>
  <button aria-label="Dismiss warning">✕</button>
</div>

<!-- Success message after action -->
<div role="status" aria-live="polite">
  <p>Changes saved successfully.</p>
</div>
```

### Loading States

```tsx
// Skeleton loader — hidden from screen readers with aria-busy
function DataTable({ loading, data }: { loading: boolean; data: Row[] }) {
  return (
    <div aria-busy={loading} aria-live="polite">
      {loading ? (
        <>
          <p className="sr-only">Loading data...</p>
          <div aria-hidden="true" className="skeleton">
            {/* Visual skeleton */}
          </div>
        </>
      ) : (
        <table>
          <caption>Sales data ({data.length} rows)</caption>
          {/* Table content */}
        </table>
      )}
    </div>
  );
}
```

### Empty State

```html
<div role="status">
  <img src="empty.svg" alt="" aria-hidden="true">
  <h2>No results found</h2>
  <p>Try adjusting your search filters or <a href="/products">browse all products</a>.</p>
</div>
```

## Data Display

### Sortable Table

```html
<table>
  <caption>Employee directory — sortable by column</caption>
  <thead>
    <tr>
      <th scope="col" aria-sort="ascending">
        <button>
          Name
          <span aria-hidden="true">▲</span>
        </button>
      </th>
      <th scope="col" aria-sort="none">
        <button>
          Department
          <span aria-hidden="true">⇕</span>
        </button>
      </th>
      <th scope="col" aria-sort="none">
        <button>
          Start Date
          <span aria-hidden="true">⇕</span>
        </button>
      </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Alice Johnson</th>
      <td>Engineering</td>
      <td>Jan 2023</td>
    </tr>
  </tbody>
</table>
```

### Card with Actions

```html
<article aria-labelledby="card-title-1">
  <img src="project.jpg" alt="">
  <h3 id="card-title-1">
    <a href="/projects/1">Project Alpha</a>
  </h3>
  <p>A machine learning pipeline for data processing.</p>
  <div>
    <span>Updated 2 hours ago</span>
    <button aria-label="Edit Project Alpha">Edit</button>
    <button aria-label="Delete Project Alpha">Delete</button>
  </div>
</article>
```

### Accessible Icon System

```tsx
// Icon component that's hidden from screen readers by default
function Icon({ name, label }: { name: string; label?: string }) {
  if (label) {
    // Standalone icon — needs accessible name
    return (
      <svg role="img" aria-label={label}>
        <use href={`/icons.svg#${name}`} />
      </svg>
    );
  }

  // Decorative icon — hidden from screen readers
  return (
    <svg aria-hidden="true" focusable="false">
      <use href={`/icons.svg#${name}`} />
    </svg>
  );
}

// Usage
<button>
  <Icon name="save" /> Save        {/* Decorative — text provides the label */}
</button>

<button aria-label="Close">
  <Icon name="x" />                {/* Button has aria-label */}
</button>

<Icon name="warning" label="Warning" />  {/* Standalone — needs own label */}
```

## Media

### Accessible Video Player

```html
<div role="region" aria-label="Video player">
  <video
    id="video"
    controls
    preload="metadata"
  >
    <source src="demo.mp4" type="video/mp4">
    <track kind="captions" src="captions.vtt" srclang="en" label="English" default>
    <track kind="descriptions" src="descriptions.vtt" srclang="en" label="Audio descriptions">
    <p>
      Your browser doesn't support video.
      <a href="demo.mp4">Download the video</a>.
    </p>
  </video>
</div>
```

## Component Accessibility Checklist

For every component, verify:

1. **Name**: Does it have an accessible name? (label, aria-label, aria-labelledby)
2. **Role**: Is the role correct? (native element or explicit ARIA role)
3. **State**: Are states communicated? (aria-expanded, aria-checked, aria-selected, aria-disabled)
4. **Keyboard**: Can it be operated via keyboard? (Tab, Enter, Space, Escape, Arrow keys)
5. **Focus**: Is focus visible? Is focus managed correctly on open/close?
6. **Screen reader**: Does it announce correctly? (test with VoiceOver/NVDA)
7. **Color**: Does it work without color? (icons, text, patterns in addition to color)
8. **Motion**: Does it respect `prefers-reduced-motion`?
9. **Responsive**: Does it work at 200% zoom without horizontal scroll?
10. **Error states**: Are errors announced and described in text?
