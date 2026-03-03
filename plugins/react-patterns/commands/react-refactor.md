---
name: react-refactor
description: Suggest and implement refactoring for a React component — extract hooks, split components, improve patterns
arguments:
  - name: path
    description: Path to the React component file to refactor
    required: true
---

# React Refactor

Analyze the React component at `$ARGUMENTS` and suggest refactoring improvements. Read the file, understand its purpose, and provide concrete refactoring recommendations.

## Analysis Steps

### Step 1: Understand the Component
- What does it do? (purpose, responsibility)
- How big is it? (lines, complexity)
- What state does it manage?
- What hooks does it use?
- What props does it accept?

### Step 2: Identify Refactoring Opportunities

Check for these patterns and suggest fixes:

**Extract Custom Hook** — When component has complex state/effect logic:
```
Before: Component with useState + useEffect + data transformation
After:  useFeatureName() hook + clean component
```

**Split Component** — When a component does too many things:
```
Before: 300-line component with header + content + sidebar + footer
After:  PageLayout + Header + Content + Sidebar + Footer
```

**Composition over Props** — When there are 8+ props or boolean variant props:
```
Before: <Card title="..." subtitle="..." image="..." footer={...} variant="large" bordered />
After:  <Card variant="large" bordered><Card.Header>...</Card.Header>...</Card>
```

**Derive State** — When state is computed from other state:
```
Before: const [items, setItems] = useState([]); const [count, setCount] = useState(0);
After:  const [items, setItems] = useState([]); const count = items.length;
```

**Lift/Lower State** — When state is at the wrong level:
```
Before: Global context for modal open/close state
After:  Local useState in the component that renders the modal
```

**Replace useEffect** — When useEffect is used incorrectly:
```
Before: useEffect(() => { setFilteredItems(items.filter(...)) }, [items])
After:  const filteredItems = useMemo(() => items.filter(...), [items])
```

### Step 3: Provide Refactored Code

For each suggestion:
1. Explain **why** the refactoring improves the code
2. Show the **before** (relevant excerpt)
3. Show the **after** (complete refactored code)
4. Note any **breaking changes** to the component's API

### Step 4: Summary

| Refactoring | Impact | Effort |
|-------------|--------|--------|
| Extract useAuth hook | Reusability, testability | Low |
| Split into 3 components | Readability, maintainability | Medium |
| Remove unnecessary useEffect | Performance, correctness | Low |

Prioritize by impact-to-effort ratio.
