---
description: When the user asks about React component architecture, compound components, render props, component composition, polymorphic components, the "as" prop pattern, slots pattern, controlled vs uncontrolled components, hybrid controlled/uncontrolled, prop explosion, children pattern, forwardRef, component design, page layout components, or how to structure React components for reusability
---

# Component Architecture

## Composition over Configuration

### ❌ Prop Explosion
```tsx
// Too many props — hard to maintain, hard to extend
<Card
  title="Post"
  subtitle="By Alice"
  image="/photo.jpg"
  imageAlt="A photo"
  body="Content here..."
  footerLeft={<LikeButton />}
  footerRight={<ShareButton />}
  headerAction={<MenuButton />}
  variant="elevated"
  bordered
  onClick={handleClick}
/>
```

### ✅ Composition
```tsx
// Composable — each piece is a separate component
<Card variant="elevated" bordered>
  <Card.Header>
    <Card.Title>Post</Card.Title>
    <Card.Subtitle>By Alice</Card.Subtitle>
    <MenuButton />
  </Card.Header>
  <Card.Image src="/photo.jpg" alt="A photo" />
  <Card.Body>Content here...</Card.Body>
  <Card.Footer>
    <LikeButton />
    <ShareButton />
  </Card.Footer>
</Card>
```

---

## Compound Components

Components that work together, sharing implicit state.

### Using Context
```tsx
import { createContext, useContext, useState, ReactNode } from "react";

// Shared state via context
interface AccordionContextType {
  openItems: Set<string>;
  toggle: (id: string) => void;
}

const AccordionContext = createContext<AccordionContextType | null>(null);

function useAccordion() {
  const ctx = useContext(AccordionContext);
  if (!ctx) throw new Error("Accordion.Item must be inside Accordion");
  return ctx;
}

// Root component
function Accordion({ children, multiple = false }: { children: ReactNode; multiple?: boolean }) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggle = useCallback(
    (id: string) => {
      setOpenItems((prev) => {
        const next = new Set(multiple ? prev : []);
        if (prev.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [multiple],
  );

  const value = useMemo(() => ({ openItems, toggle }), [openItems, toggle]);

  return (
    <AccordionContext.Provider value={value}>
      <div role="region">{children}</div>
    </AccordionContext.Provider>
  );
}

// Item component
function Item({ id, children }: { id: string; children: ReactNode }) {
  return <div data-accordion-item={id}>{children}</div>;
}

// Trigger component
function Trigger({ id, children }: { id: string; children: ReactNode }) {
  const { openItems, toggle } = useAccordion();
  const isOpen = openItems.has(id);

  return (
    <button onClick={() => toggle(id)} aria-expanded={isOpen}>
      {children}
      <span>{isOpen ? "▲" : "▼"}</span>
    </button>
  );
}

// Content component
function Content({ id, children }: { id: string; children: ReactNode }) {
  const { openItems } = useAccordion();
  if (!openItems.has(id)) return null;

  return <div role="region">{children}</div>;
}

// Attach sub-components
Accordion.Item = Item;
Accordion.Trigger = Trigger;
Accordion.Content = Content;

// Usage
<Accordion multiple>
  <Accordion.Item id="faq-1">
    <Accordion.Trigger id="faq-1">What is React?</Accordion.Trigger>
    <Accordion.Content id="faq-1">
      <p>A JavaScript library for building user interfaces.</p>
    </Accordion.Content>
  </Accordion.Item>
</Accordion>
```

---

## Render Props

Pass a function as children to let the parent control rendering.

```tsx
interface DropdownProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  renderTrigger: (props: { isOpen: boolean; toggle: () => void }) => ReactNode;
}

function Dropdown<T>({ items, renderItem, renderTrigger }: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  return (
    <div className="relative">
      {renderTrigger({ isOpen, toggle })}
      {isOpen && (
        <ul className="absolute mt-1 bg-white shadow-lg rounded-md">
          {items.map((item, i) => (
            <li key={i}>{renderItem(item, i)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Usage — caller controls how items look
<Dropdown
  items={users}
  renderTrigger={({ toggle }) => <button onClick={toggle}>Select User</button>}
  renderItem={(user) => (
    <div className="flex items-center gap-2">
      <Avatar src={user.avatar} />
      <span>{user.name}</span>
    </div>
  )}
/>
```

---

## Polymorphic Components

Components that can render as different HTML elements or other components.

```tsx
import { ElementType, ComponentPropsWithoutRef, ReactNode } from "react";

// The "as" prop pattern
type BoxProps<T extends ElementType = "div"> = {
  as?: T;
  children?: ReactNode;
  className?: string;
} & ComponentPropsWithoutRef<T>;

function Box<T extends ElementType = "div">({
  as,
  children,
  className,
  ...props
}: BoxProps<T>) {
  const Component = as || "div";
  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
}

// Usage
<Box>Default div</Box>
<Box as="section">Renders as section</Box>
<Box as="a" href="/about">Renders as anchor with href</Box>
<Box as={Link} to="/about">Renders as React Router Link</Box>
```

### Typed Button Component
```tsx
type ButtonProps<T extends ElementType = "button"> = {
  as?: T;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "variant" | "size">;

function Button<T extends ElementType = "button">({
  as,
  variant = "primary",
  size = "md",
  children,
  className,
  ...props
}: ButtonProps<T>) {
  const Component = as || "button";

  const classes = clsx(
    "inline-flex items-center justify-center font-medium rounded-md",
    {
      "bg-blue-600 text-white hover:bg-blue-700": variant === "primary",
      "bg-gray-200 text-gray-900 hover:bg-gray-300": variant === "secondary",
      "text-gray-600 hover:bg-gray-100": variant === "ghost",
    },
    {
      "px-3 py-1.5 text-sm": size === "sm",
      "px-4 py-2 text-base": size === "md",
      "px-6 py-3 text-lg": size === "lg",
    },
    className,
  );

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
}

// Usage
<Button>Click me</Button>
<Button as="a" href="/signup" variant="secondary">Sign up</Button>
<Button as={Link} to="/dashboard" size="lg">Dashboard</Button>
```

---

## Slots Pattern

Named insertion points for flexible layout composition.

```tsx
interface PageLayoutProps {
  header?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

function PageLayout({ header, sidebar, children, footer }: PageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {header && <header className="border-b">{header}</header>}
      <div className="flex flex-1">
        {sidebar && <aside className="w-64 border-r">{sidebar}</aside>}
        <main className="flex-1 p-6">{children}</main>
      </div>
      {footer && <footer className="border-t">{footer}</footer>}
    </div>
  );
}

// Usage
<PageLayout
  header={<Navbar />}
  sidebar={<Navigation />}
  footer={<Footer />}
>
  <h1>Page Content</h1>
</PageLayout>
```

---

## Controlled vs Uncontrolled

### Controlled — Parent owns the state
```tsx
interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function Input({ value, onChange, placeholder }: InputProps) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

// Parent controls everything
function Form() {
  const [name, setName] = useState("");
  return <Input value={name} onChange={setName} />;
}
```

### Uncontrolled — Component owns its own state
```tsx
interface InputProps {
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

function Input({ defaultValue = "", onChange, placeholder }: InputProps) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <input
      ref={ref}
      defaultValue={defaultValue}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
    />
  );
}
```

### Hybrid — Support both modes
```tsx
interface SelectProps {
  // Controlled mode
  value?: string;
  onChange?: (value: string) => void;
  // Uncontrolled mode
  defaultValue?: string;
  // Common props
  options: { value: string; label: string }[];
}

function Select({ value: controlledValue, onChange, defaultValue, options }: SelectProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;

  const handleChange = useCallback(
    (newValue: string) => {
      if (!isControlled) setInternalValue(newValue);
      onChange?.(newValue);
    },
    [isControlled, onChange],
  );

  return (
    <select value={currentValue} onChange={(e) => handleChange(e.target.value)}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
```

---

## When to Use What

| Pattern | Use Case |
|---------|----------|
| Compound components | Multi-part UI (Accordion, Tabs, Menu, Select) |
| Render props | Caller needs full rendering control |
| Polymorphic `as` | Reusable styling with flexible HTML element |
| Slots | Page layouts with named sections |
| Controlled | Forms, filters, anything parent needs to validate |
| Uncontrolled | One-off inputs, file uploads, refs for DOM access |
| Composition (children) | Default — always prefer over prop configuration |
