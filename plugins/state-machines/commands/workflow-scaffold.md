---
name: workflow-scaffold
description: Scaffold a complete state machine or workflow implementation
arguments:
  - name: type
    description: "Type: xstate, temporal, saga, job-queue, event-sourcing (default: xstate)"
    required: false
  - name: name
    description: "Workflow name (e.g., order-processing, auth-flow, checkout)"
    required: true
---

# Scaffold Workflow Implementation

Generate a complete workflow implementation based on the specified type and name.

## Instructions

Based on the type `$ARGUMENTS`, generate appropriate files.

### For `xstate` (Client-Side or Server-Side State Machine)

Generate:
1. **Machine definition** (`machines/<name>.machine.ts`)
   - Typed context and events
   - States with transitions
   - Guards and actions in implementations
   - Invoke for async operations
2. **Types** (`machines/<name>.types.ts`)
   - Context interface
   - Event union type
3. **React component** (if React project)
   - useActor integration
   - State-based rendering
4. **Tests** (`machines/<name>.test.ts`)
   - State transition tests
   - Guard tests
   - Context update tests

### For `temporal` (Durable Workflow)

Generate:
1. **Workflow** (`workflows/<name>.workflow.ts`)
   - Activity proxies
   - Workflow function with compensation
   - Signals and queries
2. **Activities** (`activities/<name>.activities.ts`)
   - Activity functions with retry config
3. **Worker** (`workers/<name>.worker.ts`)
   - Worker setup with task queue
4. **Client** (`clients/<name>.client.ts`)
   - Start, signal, query helpers

### For `saga` (Distributed Transaction)

Generate:
1. **Saga definition** (`sagas/<name>.saga.ts`)
   - Steps with execute and compensate
   - Error handling and rollback chain
2. **Step implementations** (`sagas/steps/`)
   - Individual step functions
3. **Saga executor** (`sagas/executor.ts`)
   - Forward execution and compensation logic

### For `job-queue` (Background Processing)

Generate:
1. **Job table migration** (SQL)
2. **Job producer** (enqueue function)
3. **Job consumer** (worker with SKIP LOCKED)
4. **Job handlers** (type-specific processing)

### For `event-sourcing`

Generate:
1. **Event types** (domain events)
2. **Aggregate** (command handler + event reducer)
3. **Event store** (append + read functions)
4. **Projections** (read model handlers)

### Adapt to Project

Before generating:
1. Check existing project patterns
2. Match code style (imports, naming, formatting)
3. Use existing infrastructure (database, message queue)
4. Follow the project's testing patterns

### Output

Create all files and provide:
- Files created with descriptions
- How to wire it into the existing app
- Commands to install dependencies
- Example usage code
