---
description: When the user asks about autonomous coding sessions, running Claude Code overnight, setting up continuous loops, Ralph Wiggum pattern, long-running AI sessions, autonomous agent loops, or asks how to run Claude Code unattended
---

# Autonomous Session Patterns

Patterns for running Claude Code in autonomous or semi-autonomous loops. Covers session structure, safety mechanisms, prompt engineering for loops, and recovery strategies.

## The Loop Pattern

At its core, autonomous coding is a loop:

```bash
# Simplest form — re-run Claude with a spec file
while true; do
  claude --print "$(cat SPEC.md)" --allowedTools Edit,Write,Bash,Read,Glob,Grep
  sleep 2
done
```

But production autonomous loops need safety:

```bash
#!/usr/bin/env bash
# Safe autonomous loop with limits
MAX_ITERATIONS=20
ITERATION=0
SESSION_LOG="session-$(date +%Y%m%d-%H%M).log"

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  echo "=== Iteration $ITERATION/$MAX_ITERATIONS ===" | tee -a "$SESSION_LOG"

  # Run Claude with spec
  claude --print "$(cat SPEC.md)" \
    --allowedTools Edit,Write,Bash,Read,Glob,Grep \
    2>&1 | tee -a "$SESSION_LOG"

  EXIT_CODE=$?

  # Check if Claude thinks it's done (exit 0 = done, exit 2 = keep going)
  if [ $EXIT_CODE -eq 0 ]; then
    echo "Claude reports work complete at iteration $ITERATION"
    break
  fi

  # Check if tests pass — stop if everything is green
  if npm test 2>/dev/null; then
    echo "Tests passing — stopping loop"
    break
  fi

  sleep 5  # Brief pause between iterations
done

echo "Session ended after $ITERATION iterations"
```

## Spec-Driven Development

The key to autonomous sessions: **your spec IS your prompt**. Not conversation history.

### SPEC.md Structure

```markdown
# Task: [Clear, specific task name]

## Objective
[1-2 sentences — what the agent should accomplish]

## Requirements
1. [Specific, testable requirement]
2. [Another requirement]
3. [Another requirement]

## Implementation Plan
1. [Step 1 — specific file and function]
2. [Step 2]
3. [Step 3]

## Constraints
- Do NOT modify: [list of files/directories]
- Use existing patterns from: [reference files]
- All new code must have tests
- Run `npm test` after every change

## Definition of Done
- [ ] All requirements implemented
- [ ] Tests pass: `npm test`
- [ ] Types pass: `npx tsc --noEmit`
- [ ] Lint passes: `npm run lint`
- [ ] No TODO/FIXME markers remain
```

### Why Specs, Not Conversation

| Approach | Problem |
|----------|---------|
| Long conversation | Context degrades over time, earlier context gets compressed |
| Conversation + --resume | Accumulates stale context, slower with each iteration |
| Fresh context + spec | Each iteration starts clean with full context budget |

**Rule: Never rely on conversation memory for autonomous sessions.** Write everything into the spec file.

## Safety Mechanisms

### 1. Iteration Limits

Always cap iterations. Common values:

| Task Complexity | Max Iterations | Why |
|----------------|----------------|-----|
| Single file change | 3-5 | Should converge fast |
| Feature implementation | 10-15 | Needs iteration |
| Large refactor | 15-25 | Complex, multi-file |
| Full project build | 20-50 | Many files to create |

### 2. Circuit Breaker

Stop if the agent is making no progress:

```bash
LAST_HASH=""
NO_PROGRESS=0

check_progress() {
  CURRENT_HASH=$(git diff HEAD | md5sum | cut -d' ' -f1)
  if [ "$CURRENT_HASH" = "$LAST_HASH" ]; then
    NO_PROGRESS=$((NO_PROGRESS + 1))
    if [ $NO_PROGRESS -ge 3 ]; then
      echo "CIRCUIT BREAKER: No progress for 3 iterations. Stopping."
      exit 1
    fi
  else
    NO_PROGRESS=0
  fi
  LAST_HASH="$CURRENT_HASH"
}
```

### 3. Budget Caps

Set spending limits:

```bash
# With Claude CLI
claude --max-cost 5.00 --print "$(cat SPEC.md)"

# Or per-iteration budget
ITERATION_BUDGET=0.50
claude --max-cost $ITERATION_BUDGET --print "$(cat SPEC.md)"
```

### 4. Git Checkpointing

Commit after every successful iteration:

```bash
after_iteration() {
  if ! git diff --quiet; then
    git add -A
    git commit -m "checkpoint: iteration $ITERATION" --no-verify
  fi
}
```

This lets you revert to any iteration: `git log --oneline` → `git reset --hard <hash>`.

### 5. Test Gating

Run tests between iterations. Stop if they fail:

```bash
# After Claude exits
if ! npm test 2>/dev/null; then
  echo "Tests failed — reverting to last checkpoint"
  git checkout .
  # Optionally: re-run with error context
fi
```

## Common Pitfalls

### 1. TODO Proliferation

The #1 problem. Agents create TODO stubs instead of implementing features:

```typescript
// Agent writes this and moves on
function processPayment(order: Order): void {
  // TODO: implement payment processing
  throw new Error('Not implemented');
}
```

**Prevention:** The `todo-scanner` Stop hook in session-guard blocks session end when TODOs remain. You can also add to your spec:

```markdown
## Constraints
- NEVER leave TODO, FIXME, or "not implemented" stubs
- Every function must have a complete implementation
```

### 2. Spec Drift

Implementation diverges from spec over multiple iterations:

**Prevention:**
- Re-read SPEC.md at the start of every iteration (the loop re-injects it)
- Keep spec updated as requirements change
- Use checklist-style requirements for easy verification

### 3. Stuck Loops

Agent repeats the same failing command:

**Prevention:**
- The `stuck-loop-detector` hook warns after 3 repeated errors
- Circuit breaker stops after no-progress iterations
- Iteration limit caps total runs

### 4. Context Exhaustion

Long conversations burn through the context window:

**Prevention:**
- Use fresh context per iteration (not --resume)
- Keep SPEC.md under 2000 lines
- Put detailed reference in separate files that the agent reads on demand

### 5. Breaking Existing Code

Agent fixes one thing but breaks another:

**Prevention:**
- Run full test suite between iterations
- The `drift-detector` hook warns when source changes outpace test changes
- Lock files that shouldn't change: `.claude/settings.json` deny rules

## Multi-Agent Patterns

For large projects, split work across multiple agents:

### Parallel Specialists

```bash
# Agent 1: Backend
claude --print "$(cat SPEC-backend.md)" &

# Agent 2: Frontend
claude --print "$(cat SPEC-frontend.md)" &

# Wait for both
wait
```

**Rule:** Each agent works on different files. Set `Write()` permissions per agent to prevent conflicts.

### Sequential Pipeline

```bash
# Step 1: Implement
claude --print "$(cat SPEC.md)"

# Step 2: Review (different agent profile)
claude --print "Review the changes in $(git diff --name-only | head -20). Check for: bugs, missing tests, style issues."

# Step 3: Fix review feedback
claude --print "Fix the issues found in the code review: $(cat review-output.md)"
```

### Orchestrator Pattern

```bash
# Main agent plans, sub-agents execute
claude --print "Read SPEC.md. Break it into 3-5 independent tasks.
Write each task to a file: tasks/task-1.md, tasks/task-2.md, etc."

# Execute each task
for task in tasks/task-*.md; do
  claude --print "$(cat $task)" --max-cost 2.00
done
```

## Session Recovery

When a session fails or is interrupted:

1. **Check git log** — find the last checkpoint
2. **Review changes** — `git diff <checkpoint>..HEAD`
3. **Update spec** — mark completed requirements, add notes about what failed
4. **Re-run** — start a new loop with the updated spec
5. **If tests fail** — revert to last green checkpoint: `git reset --hard <hash>`
