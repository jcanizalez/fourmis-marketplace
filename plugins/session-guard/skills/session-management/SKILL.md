---
description: When the user asks about managing Claude Code sessions, session persistence, context management, session history, session recovery, how to resume sessions, session state, context window optimization, or asks about session best practices
---

# Session Management

Best practices for managing Claude Code sessions — context optimization, session state, recovery strategies, and multi-session workflows.

## Context Window Optimization

Claude's context window is finite. Every token matters in long sessions.

### What Costs Context

| Source | Typical Size | Can Reduce? |
|--------|-------------|-------------|
| CLAUDE.md | 100-500 tokens | ✅ Keep under 200 lines |
| Installed plugins (skills) | 200-2000 tokens each | ✅ Install only what you need |
| Hook outputs | 50-200 tokens each | ✅ Keep hook output minimal |
| File reads | Varies | ✅ Read specific sections, not entire files |
| Conversation history | Grows over time | ✅ Start fresh for new tasks |
| Tool results | Varies | ⚠️ Truncate large outputs |

### Context-Saving Strategies

**1. Start fresh for each task**

Don't reuse sessions across unrelated tasks. A fresh session has full context budget.

```bash
# Each task gets a clean session
claude --print "$(cat task-1-spec.md)"
claude --print "$(cat task-2-spec.md)"
```

**2. Use /compact when context is getting long**

Claude Code's `/compact` command summarizes the conversation so far, freeing context for new work. Use it after completing a sub-task.

**3. Read files selectively**

```
# ❌ Don't read entire large files
Read src/services/user-service.ts (800 lines)

# ✅ Read specific sections
Read src/services/user-service.ts lines 150-200
```

**4. Limit plugin installation**

Each installed plugin's skills consume context. Install only what's relevant:

```bash
# ❌ Installing everything
claude plugin add --from all-plugins/

# ✅ Installing what you need
claude plugin add --from hooks-toolkit/
claude plugin add --from production-guard/
```

**5. Use .claudeignore for large repos**

Exclude directories Claude shouldn't search:

```
# .claudeignore
node_modules/
dist/
build/
.next/
coverage/
*.min.js
*.map
vendor/
```

## Session State Management

### Session Resume

Claude Code supports resuming sessions:

```bash
# Resume last session
claude --resume

# Resume specific session
claude --resume <session-id>

# List recent sessions
claude sessions list
```

**When to resume:**
- Continuing the same task after a break
- Following up on review feedback
- Debugging something you were working on

**When NOT to resume:**
- Starting a new, unrelated task (use fresh context)
- Session was long (context is compressed and lossy)
- Major code changes happened outside Claude

### Session Checkpoints

The `progress-checkpoint` hook auto-commits work every N edits. You can also manually checkpoint:

```bash
# Manual checkpoint in conversation
"Please commit the current changes as a checkpoint"

# Or use git directly
git add -A && git commit -m "checkpoint: feature half-done"
```

### Session Recovery

When things go wrong mid-session:

**1. Claude lost context / forgot what it was doing:**
```
"Let's reset. Read CLAUDE.md and the current git diff to understand
what we're working on. Then continue implementing the feature."
```

**2. Claude broke something:**
```bash
# Revert to last checkpoint
git stash          # or git checkout .
# Then re-explain what needs to happen
```

**3. Session crashed / timed out:**
```bash
# Check what was done
git log --oneline -5
git diff

# Resume or start fresh depending on state
claude --resume  # if continuity matters
# OR
claude --print "Continue from where we left off. $(git log --oneline -5)"
```

## Multi-Session Workflows

### Sequential Sessions (Pipeline)

Break large tasks into sessions that build on each other:

```
Session 1: "Set up the database schema and migrations"
  → Commit when done

Session 2: "Implement the API endpoints for the schema from Session 1"
  → Commit when done

Session 3: "Add tests for all API endpoints"
  → Commit when done

Session 4: "Implement the frontend UI consuming the API"
  → Commit when done
```

Each session starts fresh but sees the committed work from previous sessions.

### Review Session Pattern

After an implementation session, run a separate review session:

```bash
# Implementation session
claude --print "$(cat SPEC.md)"

# Review session (different prompt)
claude --print "Review the recent changes. Run: git diff main --stat
Then read each changed file. Check for:
1. Bugs and logic errors
2. Missing error handling
3. Missing tests
4. Security issues
5. Code style problems
Write your review to REVIEW.md"

# Fix session (if review found issues)
claude --print "Fix the issues listed in REVIEW.md. Then delete REVIEW.md."
```

### Parallel Sessions (tmux)

Run multiple Claude instances on different parts of the codebase:

```bash
# Terminal 1: Backend
cd api/ && claude

# Terminal 2: Frontend
cd web/ && claude

# Terminal 3: Infrastructure
cd infra/ && claude
```

**Important:** Each session must work on different files. Use `.claude/settings.json` to scope Write permissions:

```json
// api/.claude/settings.json
{
  "permissions": {
    "allow": ["Write(cmd/**)", "Write(internal/**)", "Write(pkg/**)"],
    "deny": ["Write(../web/**)", "Write(../infra/**)"]
  }
}
```

## Session Hygiene

### Before Starting a Session

1. **Clear your task** — Know exactly what you want to accomplish
2. **Check git status** — Start from a clean state (`git status`)
3. **Update CLAUDE.md** — Ensure it reflects current project state
4. **Set permissions** — Configure `.claude/settings.json` for safety
5. **Install relevant plugins** — Only what you need for this task

### During a Session

1. **One task at a time** — Don't context-switch mid-session
2. **Commit regularly** — Use checkpoints or commit after each sub-task
3. **Run tests often** — Catch regressions early
4. **Use /compact** when context grows long
5. **Be specific** — Vague prompts waste tokens on clarification

### After a Session

1. **Review changes** — `git diff` to understand what happened
2. **Run full test suite** — Catch anything the session missed
3. **Commit or revert** — Don't leave uncommitted changes
4. **Update spec** — Mark completed items, note anything unfinished
5. **Check session summary** — Review `.session-guard/summaries/` for stats

### Session Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Marathon sessions | Context degrades, quality drops | Split into focused 30-60min sessions |
| Vague prompts | "Make it better" wastes tokens | Specific: "Fix the N+1 query in UserService.getAll" |
| No commits | Lost work on crash/timeout | Commit after each sub-task |
| Ignoring errors | Errors compound over time | Fix errors immediately, don't skip |
| Too many plugins | Context overhead | Install only what's needed |
| No spec file | Agent guesses requirements | Write a clear SPEC.md first |

## Useful Commands for Session Management

```bash
# Session history
claude sessions list

# Resume last session
claude --resume

# Run with budget cap
claude --max-cost 5.00

# Run in print mode (non-interactive)
claude --print "do something specific"

# Check token usage
claude usage

# Clear and start fresh
# (just start a new terminal / claude session)
```
