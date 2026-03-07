---
name: Complexity Analysis
description: Analyzes code file complexity when reviewing code, auditing projects, or when asked about code quality. Identifies overly complex files, deep nesting, long functions, and suggests refactoring opportunities.
version: 1.0.0
---

# Complexity Analysis

This skill activates when analyzing code quality, reviewing files, or assessing codebase health.

## When to Activate

- User asks about code quality or complexity
- User asks to review or audit the codebase
- User asks "is this code too complex?" or "should I refactor this?"
- The `/health` or `/debt` commands are invoked
- When reviewing a file that shows complexity warning signs

## Complexity Indicators

### File-Level Thresholds

| Indicator | Warning | Critical |
|-----------|---------|----------|
| File length | >300 lines | >500 lines |
| Function/method count | >15 per file | >25 per file |
| Longest function | >50 lines | >100 lines |
| Nesting depth | >3 levels | >5 levels |
| Import count | >15 imports | >25 imports |
| Parameters per function | >4 params | >6 params |
| Cyclomatic complexity | >10 per function | >20 per function |
| Lines of code per class | >200 lines | >400 lines |

### Cyclomatic Complexity Guide

Cyclomatic complexity counts the number of independent paths through a function. Each `if`, `else`, `case`, `&&`, `||`, `for`, `while`, `catch`, and `?:` adds 1 to the count.

| Score | Risk | Action |
|-------|------|--------|
| 1-5 | Low | Simple, easy to test |
| 6-10 | Moderate | Acceptable, consider simplifying if trending up |
| 11-20 | High | Hard to test — refactor into smaller functions |
| 21+ | Critical | Untestable — must split before adding more logic |

**Quick counting method**: Count the decision points in a function:

```typescript
// Cyclomatic complexity = 6
function processOrder(order: Order): Result {
  if (!order.items.length) return error('empty');        // +1
  if (!order.customer) return error('no customer');      // +1

  for (const item of order.items) {                      // +1
    if (item.quantity <= 0) return error('bad qty');      // +1
    if (!item.inStock) return error('out of stock');      // +1
  }

  return order.total > 1000                              // +1
    ? applyBulkDiscount(order)
    : finalizeOrder(order);
}
```

## Code Smell Patterns

When scanning code, flag these patterns:

### 1. God Files
Files that do too many unrelated things — >500 lines, many exports, mixed concerns.

```typescript
// ❌ utils.ts — 800 lines, does everything
export function formatDate() { ... }
export function validateEmail() { ... }
export function calculateTax() { ... }
export function sendNotification() { ... }
export function parseCSV() { ... }

// ✅ Split by domain
// date-utils.ts, validation.ts, tax.ts, notifications.ts, csv-parser.ts
```

### 2. Deep Nesting
Callbacks within callbacks, nested conditionals >3 levels deep.

```typescript
// ❌ 5 levels deep — hard to follow
function processUser(user) {
  if (user) {
    if (user.isActive) {
      if (user.permissions) {
        if (user.permissions.includes('admin')) {
          if (user.email) {
            sendAdminEmail(user.email);
          }
        }
      }
    }
  }
}

// ✅ Early returns flatten the structure
function processUser(user) {
  if (!user) return;
  if (!user.isActive) return;
  if (!user.permissions?.includes('admin')) return;
  if (!user.email) return;

  sendAdminEmail(user.email);
}
```

### 3. Long Parameter Lists
Functions with >4 parameters — hard to call correctly, easy to mix up argument order.

```typescript
// ❌ 7 parameters — which is which?
function createUser(name, email, age, role, department, manager, startDate) { ... }

// ✅ Options object — named, self-documenting, extensible
function createUser(input: CreateUserInput) { ... }

interface CreateUserInput {
  name: string;
  email: string;
  age?: number;
  role: 'admin' | 'user';
  department: string;
  manager?: string;
  startDate: Date;
}
```

### 4. Switch/Case Explosion
Switch statements with >7 cases — often a missing abstraction.

```go
// ❌ 10 cases and growing — add a new status, add a new case
func handleStatus(status string) string {
    switch status {
    case "pending": return "Waiting for review"
    case "approved": return "Ready to process"
    case "rejected": return "Declined"
    // ... 7 more cases
    }
}

// ✅ Map lookup — add new status without touching the function
var statusLabels = map[string]string{
    "pending":  "Waiting for review",
    "approved": "Ready to process",
    "rejected": "Declined",
}

func handleStatus(status string) string {
    if label, ok := statusLabels[status]; ok {
        return label
    }
    return "Unknown status"
}
```

### 5. Duplicated Logic
Similar code blocks repeated across files.

```typescript
// ❌ Same error handling in every route handler
app.get('/users', async (req, res) => {
  try {
    const users = await db.users.findAll();
    res.json(users);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/orders', async (req, res) => {
  try {
    const orders = await db.orders.findAll();
    res.json(orders);
  } catch (err) {
    console.error('Error:', err);                        // Same!
    res.status(500).json({ error: 'Internal server error' }); // Same!
  }
});

// ✅ Extract to middleware or wrapper
const asyncHandler = (fn) => (req, res, next) =>
  fn(req, res, next).catch(next);

app.get('/users', asyncHandler(async (req, res) => {
  const users = await db.users.findAll();
  res.json(users);
}));
```

### 6. Other Smells

| Smell | Signal | Fix |
|-------|--------|-----|
| Magic numbers | `if (retries > 3)`, `timeout: 5000` | Extract to named constants |
| Boolean trap | `createUser(name, true, false)` | Use options object or named params |
| Excessive comments | Comments explaining WHAT, not WHY | Rename variables/functions to be self-documenting |
| Dead code | Commented-out blocks, unreachable branches | Delete it — git has history |
| Feature envy | Function uses another class's data more than its own | Move the function to that class |
| Primitive obsession | Passing `(string, string, number)` instead of domain types | Create value objects: `Email`, `Money`, `UserId` |

## Analysis Process

When performing a complexity analysis:

1. **Identify source directories**: Look for `src/`, `lib/`, `app/`, `pkg/`, `internal/`, or project-specific patterns
2. **Scan files**: Use `Glob` to find source files, `Read` to analyze them
3. **Score each file**: Rate complexity on a simple scale:
   - **Green** (healthy): Under all warning thresholds
   - **Yellow** (attention): Exceeds 1-2 warning thresholds
   - **Red** (needs refactoring): Exceeds any critical threshold or 3+ warning thresholds
4. **Prioritize findings**: Rank files by severity, focusing on most-changed files first (they cause the most developer pain). Use `git log --format='%H' -- <file> | wc -l` to find frequently changed files.
5. **Suggest fixes**: For each red/yellow file, provide a specific refactoring strategy (extract function, split file, simplify conditionals)

## Report Format

When presenting findings:

```
## Complexity Report

### Summary
- Files scanned: X
- Healthy (green): Y
- Needs attention (yellow): Z
- Needs refactoring (red): W
- Hotspots (high churn + high complexity): N

### Critical Files
1. `src/services/userService.ts` (RED)
   - 487 lines, 23 functions, max nesting: 5, cyclomatic: 18
   - Churn: 47 commits in last 3 months
   - Suggestion: Split into UserAuthService, UserProfileService, UserValidation

2. `src/handlers/api.ts` (RED)
   - 612 lines, 31 exports
   - Suggestion: Split by route group into separate handler files

### Attention Needed
3. `src/utils/helpers.ts` (YELLOW)
   - 312 lines, catch-all utility file
   - Suggestion: Group related utils into domain-specific modules (date-utils, string-utils, validation)

### Churn-Complexity Hotspots
Files that are BOTH complex AND frequently changed — highest refactoring ROI:
- `src/services/userService.ts` — 47 commits, complexity: RED
- `src/api/middleware.ts` — 35 commits, complexity: YELLOW
```

## Language-Specific Notes

### TypeScript/JavaScript
- Check for `any` types (defeats the type system)
- Missing return types on public functions
- Excessive type assertions (`as unknown as SomeType`)
- Barrel files (`index.ts`) that re-export everything — slow IDE, hidden dependencies
- Deeply nested promise chains (use async/await)

### Go
- Error handling ignored: `_ = someFunc()` — always handle or explicitly log
- Long function chains without intermediate variables
- Unexported types used across packages (coupling smell)
- `interface{}` / `any` overuse (before generics were available)
- init() functions with side effects (hard to test)

### Python
- Mutable default arguments: `def f(items=[])` — shared state bug
- Bare `except:` clauses — catches everything including KeyboardInterrupt
- Global state mutated at module level
- Class with only `__init__` and one method (should be a function)
- Nested list comprehensions deeper than 2 levels

### React
- Component >200 lines — split into smaller components
- More than 3 `useEffect` hooks — likely doing too much
- Prop drilling >3 levels — use Context or composition
- Business logic inside components — extract to hooks or services
- Inline styles or large style objects — use CSS modules or Tailwind
