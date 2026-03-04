---
name: fsm-review
description: Review a state machine or workflow implementation for correctness, completeness, and best practices
arguments:
  - name: focus
    description: "Focus area: correctness, performance, patterns, all (default: all)"
    required: false
---

# State Machine / Workflow Review

Review state machine or workflow implementations for correctness, missing states, dead ends, and best practices.

## Review Steps

### 1. Find State Machine Code

```bash
# Find XState machines
grep -rn "createMachine\|createActor\|useMachine\|useActor" --include="*.ts" --include="*.tsx" --include="*.js" -l | grep -v node_modules

# Find workflow patterns
grep -rn "workflow\|saga\|orchestrat\|state.*machine\|statechart" --include="*.ts" --include="*.tsx" --include="*.js" -l | grep -v node_modules

# Find event sourcing
grep -rn "event.*store\|event.*source\|CQRS\|projection" --include="*.ts" --include="*.py" --include="*.js" -l | grep -v node_modules
```

### 2. Correctness Review

- [ ] **Initial state defined** — machine has a clear starting point
- [ ] **All states reachable** — no orphan states that can never be entered
- [ ] **No dead ends** — every non-final state has at least one exit transition
- [ ] **Final states used correctly** — workflow has clear completion states
- [ ] **Events handled** — important events don't get silently dropped
- [ ] **Guards are exhaustive** — all conditions covered, including default case
- [ ] **Context is consistent** — state and context don't contradict each other
- [ ] **Async operations handled** — invoke has both onDone and onError

### 3. Completeness Review

- [ ] **Error states exist** — every async step has an error path
- [ ] **Timeout handling** — long-running states have `after` timeouts
- [ ] **Cancel/abort** — user can cancel or abort in-progress operations
- [ ] **Retry logic** — failed operations can be retried
- [ ] **Loading states** — async operations show loading to the user
- [ ] **Edge cases** — empty data, network errors, concurrent events

### 4. Type Safety Review (TypeScript)

- [ ] **Context typed** — `types` property defines context interface
- [ ] **Events typed** — union type for all events with payloads
- [ ] **Guards typed** — guard functions receive typed context and event
- [ ] **Actions typed** — assign actions match context shape
- [ ] **No `any` casts** — events and context properly narrowed

### 5. Pattern Review

- [ ] **Machine defined outside component** — not recreated on every render
- [ ] **useSelector for derived values** — not reading entire snapshot
- [ ] **Actor shared via context** — not prop drilled
- [ ] **Compensation planned** — saga steps have rollback handlers
- [ ] **Idempotency** — events/commands are safe to replay
- [ ] **Separation of concerns** — machine logic separate from UI/API

### 6. Generate Report

```markdown
## State Machine Review

### Machine: [name]
- States: N
- Transitions: N
- Events: N
- Type safety: ✅/⚠️/❌

### State Diagram
(generated ASCII or Mermaid diagram)

### Issues Found

#### Critical
- Unreachable state: "X" has no incoming transitions
- Dead end: "Y" has no outgoing transitions or final marker
- Missing error handling in async invoke

#### Warnings
- No timeout on "loading" state
- Guard conditions don't cover all cases
- Context mutation without assign()

#### Suggestions
- Extract nested states for clarity
- Add parallel regions for independent concerns
- Use history state for pause/resume pattern

### Recommendations
1. [Priority] Description — file:line
```
