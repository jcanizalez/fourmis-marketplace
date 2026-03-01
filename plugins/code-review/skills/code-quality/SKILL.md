---
description: When the user asks about code quality, code smells, SOLID principles, DRY, KISS, cyclomatic complexity, cognitive complexity, code architecture, design patterns, refactoring suggestions, technical debt assessment, or how to improve code structure
---

# Code Quality

Assess code quality using established principles — SOLID, DRY, KISS, complexity analysis, and design pattern recognition. Provides actionable improvement suggestions.

## SOLID Principles

### S — Single Responsibility
Each class/module/function should have one reason to change.

```typescript
// ❌ BAD — doing too much
class UserService {
  createUser(data) { /* DB insert */ }
  sendWelcomeEmail(user) { /* email logic */ }
  generateReport(users) { /* PDF generation */ }
}

// ✅ GOOD — single responsibility each
class UserService { createUser(data) { /* DB insert */ } }
class EmailService { sendWelcomeEmail(user) { /* email */ } }
class ReportService { generateReport(users) { /* PDF */ } }
```

### O — Open/Closed
Open for extension, closed for modification.

```typescript
// ❌ BAD — must modify class for new payment types
class PaymentProcessor {
  process(type, amount) {
    if (type === 'stripe') { /* stripe logic */ }
    else if (type === 'paypal') { /* paypal logic */ }
    // must add new else-if for every new type
  }
}

// ✅ GOOD — extend with new processors
interface PaymentProcessor { process(amount: number): void; }
class StripeProcessor implements PaymentProcessor { process(amount) { /* ... */ } }
class PayPalProcessor implements PaymentProcessor { process(amount) { /* ... */ } }
```

### L — Liskov Substitution
Subtypes must be substitutable for their base types.

### I — Interface Segregation
Don't force clients to depend on methods they don't use.

```typescript
// ❌ BAD — bloated interface
interface Worker {
  work(): void;
  eat(): void;   // robots don't eat
  sleep(): void; // robots don't sleep
}

// ✅ GOOD — segregated interfaces
interface Workable { work(): void; }
interface Feedable { eat(): void; }
```

### D — Dependency Inversion
Depend on abstractions, not concrete implementations.

```typescript
// ❌ BAD — depends on concrete
class OrderService {
  private db = new PostgresDB(); // tightly coupled
}

// ✅ GOOD — depends on abstraction
class OrderService {
  constructor(private db: Database) {} // injected
}
```

## Code Smells

| Smell | Symptom | Fix |
|-------|---------|-----|
| **Long function** | >50 lines, multiple concerns | Extract functions |
| **Deep nesting** | >3 levels of indentation | Early returns, extract |
| **Magic numbers** | `if (status === 3)` | Named constants |
| **God object** | Class with 20+ methods | Split by responsibility |
| **Feature envy** | Method uses another class's data more than its own | Move method |
| **Shotgun surgery** | One change requires modifying many files | Consolidate related logic |
| **Primitive obsession** | Using strings/ints for domain concepts | Create value objects |
| **Long parameter list** | >4 params in a function | Use an options/config object |
| **Duplicate code** | Same logic in 3+ places | Extract shared function |
| **Dead code** | Unreachable or unused code | Delete it |
| **Comments as deodorant** | Comments explaining bad code | Rewrite the code |

## Complexity Assessment

### Cyclomatic Complexity
Count the decision points (if, else, for, while, case, &&, ||, ?):

| Complexity | Risk | Action |
|-----------|------|--------|
| 1-5 | Low | ✅ Good |
| 6-10 | Moderate | ⚠️ Consider refactoring |
| 11-20 | High | 🔴 Refactor — hard to test |
| 20+ | Very high | ❌ Must refactor — untestable |

### Cognitive Complexity
How hard is the code to understand?

```typescript
// High cognitive complexity — nested conditions
function process(order) {
  if (order.status === 'pending') {           // +1
    if (order.items.length > 0) {             // +2 (nesting)
      for (const item of order.items) {       // +3 (nesting)
        if (item.stock > 0) {                 // +4 (nesting)
          if (item.price > 0) {               // +5 (nesting)
            // finally do something
          }
        }
      }
    }
  }
}

// Low cognitive complexity — early returns
function process(order) {
  if (order.status !== 'pending') return;     // +1
  if (order.items.length === 0) return;       // +1

  for (const item of order.items) {           // +1
    if (item.stock <= 0) continue;            // +2
    if (item.price <= 0) continue;            // +2
    // do something — easy to follow
  }
}
```

## Quality Metrics Checklist

When assessing code quality, evaluate:

1. **Naming** — Are names descriptive and consistent?
2. **Functions** — Are they short, focused, and well-named?
3. **Duplication** — Is there copy-pasted logic?
4. **Complexity** — Are there deeply nested conditionals?
5. **Error handling** — Is it consistent and informative?
6. **Types** — Is the type system used effectively?
7. **Dependencies** — Are they minimal and well-abstracted?
8. **Testability** — Can the code be unit tested easily?
9. **Side effects** — Are they isolated and explicit?
10. **Documentation** — Are public APIs documented?

## Quality Improvement Suggestions Format

When suggesting improvements, always provide:
1. **What** — the specific issue
2. **Why** — why it matters (maintenance, bugs, performance)
3. **How** — concrete fix with code example
4. **Priority** — high (fix now), medium (fix soon), low (nice to have)
