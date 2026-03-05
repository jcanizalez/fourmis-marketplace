---
name: type-puzzle
description: Explain a complex TypeScript type — break it down step by step, show what it resolves to, and suggest simplifications
arguments:
  - name: type
    description: The complex type expression or the file:line where it's defined
    required: true
---

# Type Puzzle

Break down and explain the TypeScript type `$ARGUMENTS`. If a file path and line number are given, read the type from that location. If a type expression is given directly, analyze it.

## Analysis Steps

### Step 1: Show the Type

Display the full type definition. If it references other types, show those too (follow the chain up to 3 levels deep).

### Step 2: Break Down Step by Step

Decompose the type into its individual operations, explaining each one:

```
Given:  type Result = Extract<keyof Omit<User, "id">, string>

Step 1: User = { id: string; name: string; age: number }
Step 2: Omit<User, "id"> = { name: string; age: number }
Step 3: keyof { name: string; age: number } = "name" | "age"
Step 4: Extract<"name" | "age", string> = "name" | "age"
         (both are already strings, so Extract keeps both)

Final:  type Result = "name" | "age"
```

For each step, explain:
- What the type operator does
- What the input types are
- What the output type resolves to

### Step 3: Resolve the Final Type

Show what the type ultimately resolves to. For complex mapped types or conditional types, show concrete examples:

```
type Result = {
  name: string;
  age: number;
}
```

### Step 4: Practical Example

Show a usage example demonstrating where this type would be used and how it provides safety:

```typescript
// This type prevents passing an id field to the update function
function updateUser(data: Result): void { ... }

updateUser({ name: "Alice", age: 30 }); // ✅
updateUser({ id: "123", name: "Alice" }); // ❌ 'id' not in type
```

### Step 5: Simplification (if applicable)

If the type can be written more simply without losing meaning, suggest the simplification:

```
// Original (hard to read):
type Keys = Extract<keyof Omit<User, "id">, string>;

// Simplified (same result):
type Keys = "name" | "age";

// Or if it needs to stay generic:
type UpdateFields = Omit<User, "id">;
```

Consider:
- Can nested utilities be flattened?
- Is a conditional type being used where a simpler pattern works?
- Are there unnecessary type operations (e.g., `Extract<string, string>`)?
- Would a named intermediate type improve readability?

## Output Format

```
## Type: [name]

### Definition
[full type with dependencies]

### Step-by-Step Breakdown
[numbered steps with explanations]

### Resolves To
[final concrete type]

### Example Usage
[code example showing the type in action]

### Simplification
[simpler version if applicable, or "Already clean — no simplification needed"]
```

## Related

- Use `/type-check` to scan a whole codebase for type safety issues
- Use `/strict-mode` to audit tsconfig.json and plan strict mode migration
