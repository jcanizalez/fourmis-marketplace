---
description: When the user asks about finite state machines, FSM theory, state diagrams, guards, actions, parallel states, history states, hierarchical states, or statecharts
---

# Finite Automata & Statechart Concepts

Core statechart concepts for modeling complex systems with XState.

## State Diagram Notation

```
Statecharts extend basic state machines with:
- Hierarchy (nested states)
- Parallelism (concurrent regions)
- History (remembering previous state)
- Guards (conditional transitions)
- Actions (entry/exit/transition effects)
```

## Hierarchical (Nested) States

States within states — child states inherit parent transitions:

```typescript
const trafficLightMachine = createMachine({
  id: "trafficLight",
  initial: "operational",
  states: {
    operational: {
      initial: "green",
      states: {
        green: {
          after: { 30000: "yellow" },
        },
        yellow: {
          after: { 5000: "red" },
        },
        red: {
          after: { 30000: "green" },
        },
      },
      // Parent-level transition — works from any child state
      on: {
        POWER_FAILURE: "#trafficLight.fault",
      },
    },
    fault: {
      // Blinking yellow
      on: {
        POWER_RESTORED: "operational",
      },
    },
  },
});

// Check if in a nested state
const snapshot = actor.getSnapshot();
snapshot.matches("operational");         // true if in any child
snapshot.matches("operational.green");   // true only if in green
snapshot.matches({ operational: "red" }); // object notation
```

## Parallel States

Multiple regions executing simultaneously:

```typescript
const editorMachine = createMachine({
  id: "editor",
  type: "parallel", // All child states are active at once
  states: {
    // Region 1: Document state
    document: {
      initial: "saved",
      states: {
        saved: {
          on: { EDIT: "modified" },
        },
        modified: {
          on: {
            SAVE: "saving",
            UNDO: "saved",
          },
        },
        saving: {
          invoke: {
            src: "saveDocument",
            onDone: "saved",
            onError: "modified",
          },
        },
      },
    },
    // Region 2: Selection state (independent)
    selection: {
      initial: "none",
      states: {
        none: {
          on: {
            SELECT: "single",
            SELECT_ALL: "all",
          },
        },
        single: {
          on: {
            SELECT: "single",
            SELECT_ALL: "all",
            DESELECT: "none",
          },
        },
        all: {
          on: {
            DESELECT: "none",
            SELECT: "single",
          },
        },
      },
    },
    // Region 3: Toolbar state (independent)
    toolbar: {
      initial: "visible",
      states: {
        visible: {
          on: { TOGGLE_TOOLBAR: "hidden" },
        },
        hidden: {
          on: { TOGGLE_TOOLBAR: "visible" },
        },
      },
    },
  },
});

// State value for parallel machines is an object:
// { document: "modified", selection: "single", toolbar: "visible" }
```

## History States

Remember and restore the previous child state:

```typescript
const playerMachine = createMachine({
  id: "player",
  initial: "playing",
  states: {
    playing: {
      initial: "normal",
      states: {
        normal: {
          on: { FAST_FORWARD: "fastForward" },
        },
        fastForward: {
          on: { NORMAL: "normal" },
        },
        // History pseudo-state
        hist: {
          type: "history",
          history: "shallow", // "shallow" | "deep"
        },
      },
      on: {
        PAUSE: "paused",
      },
    },
    paused: {
      on: {
        // Resume to the PREVIOUS playing sub-state (normal or fastForward)
        RESUME: "playing.hist",
      },
    },
  },
});

// If you were in playing.fastForward and paused, RESUME goes back to fastForward
```

### Shallow vs Deep History

- **Shallow**: Remembers the immediate child state only
- **Deep**: Remembers the entire nested state hierarchy

```typescript
states: {
  // Shallow: remembers "step2" but not "step2.substepA"
  shallowHist: { type: "history", history: "shallow" },
  // Deep: remembers "step2.substepA.detailB"
  deepHist: { type: "history", history: "deep" },
}
```

## Guards (Conditions)

```typescript
const elevatorMachine = createMachine(
  {
    id: "elevator",
    types: {} as {
      context: { floor: number; maxFloor: number; minFloor: number; doorsOpen: boolean };
      events:
        | { type: "GO_UP" }
        | { type: "GO_DOWN" }
        | { type: "OPEN_DOORS" }
        | { type: "CLOSE_DOORS" }
        | { type: "CALL"; floor: number };
    },
    initial: "idle",
    context: { floor: 1, maxFloor: 10, minFloor: 1, doorsOpen: false },
    states: {
      idle: {
        on: {
          GO_UP: {
            guard: "canGoUp",
            target: "moving",
            actions: assign({ floor: ({ context }) => context.floor + 1 }),
          },
          GO_DOWN: {
            guard: "canGoDown",
            target: "moving",
            actions: assign({ floor: ({ context }) => context.floor - 1 }),
          },
          OPEN_DOORS: {
            guard: "doorsAreClosed",
            actions: assign({ doorsOpen: true }),
          },
          CLOSE_DOORS: {
            guard: "doorsAreOpen",
            actions: assign({ doorsOpen: false }),
          },
        },
      },
      moving: {
        // Auto-transition to idle when floor reached
        always: "idle",
        entry: assign({ doorsOpen: false }),
      },
    },
  },
  {
    guards: {
      canGoUp: ({ context }) => context.floor < context.maxFloor && !context.doorsOpen,
      canGoDown: ({ context }) => context.floor > context.minFloor && !context.doorsOpen,
      doorsAreClosed: ({ context }) => !context.doorsOpen,
      doorsAreOpen: ({ context }) => context.doorsOpen,
    },
  }
);
```

### Multiple Guards (First Match)

```typescript
states: {
  processing: {
    on: {
      COMPLETE: [
        // Evaluated in order — first match wins
        { guard: "isHighPriority", target: "expedited" },
        { guard: "isLowPriority", target: "queued" },
        { target: "normal" }, // Default (no guard)
      ],
    },
  },
},
```

## Always Transitions (Eventless)

Transition immediately when a condition is met — replaces transient states:

```typescript
const routerMachine = createMachine({
  id: "router",
  types: {} as {
    context: { isAuthenticated: boolean; role: string; path: string };
  },
  initial: "checking",
  context: { isAuthenticated: false, role: "user", path: "/" },
  states: {
    checking: {
      always: [
        { guard: ({ context }) => !context.isAuthenticated, target: "login" },
        { guard: ({ context }) => context.role === "admin", target: "adminDashboard" },
        { target: "userDashboard" }, // Default
      ],
    },
    login: { /* ... */ },
    userDashboard: { /* ... */ },
    adminDashboard: { /* ... */ },
  },
});
```

## Final States

Signal that a compound state is "done":

```typescript
const checkoutMachine = createMachine({
  id: "checkout",
  initial: "cart",
  states: {
    cart: {
      on: { CHECKOUT: "payment" },
    },
    payment: {
      initial: "entering",
      states: {
        entering: {
          on: { PAY: "processing" },
        },
        processing: {
          invoke: {
            src: "chargeCard",
            onDone: "done",
            onError: "entering",
          },
        },
        done: { type: "final" }, // This child state is final
      },
      // `onDone` fires when the child reaches a final state
      onDone: "confirmation",
    },
    confirmation: { type: "final" },
  },
});
```

## Actor Model (Spawning)

Dynamically create child actors:

```typescript
import { createMachine, assign, sendTo, fromPromise } from "xstate";

const parentMachine = createMachine({
  id: "parent",
  types: {} as {
    context: {
      children: Record<string, any>;
    };
  },
  initial: "active",
  context: { children: {} },
  states: {
    active: {
      on: {
        SPAWN_CHILD: {
          actions: assign({
            children: ({ context, event, spawn }) => {
              const childId = (event as any).id;
              const child = spawn(childMachine, { id: childId });
              return { ...context.children, [childId]: child };
            },
          }),
        },
        SEND_TO_CHILD: {
          actions: sendTo(
            ({ context, event }) => context.children[(event as any).childId],
            ({ event }) => ({ type: (event as any).childEvent })
          ),
        },
      },
    },
  },
});
```

## State Machine Patterns Summary

| Pattern | Use When | XState Feature |
|---------|----------|----------------|
| **Flat FSM** | Simple on/off, status tracking | `states` + `on` |
| **Hierarchical** | Related states with shared transitions | Nested `states` |
| **Parallel** | Independent concurrent behaviors | `type: "parallel"` |
| **History** | Resume after interruption | `type: "history"` |
| **Guarded** | Conditional transitions | `guard` |
| **Delayed** | Timeouts, debounce, polling | `after` |
| **Invoked** | Async operations, services | `invoke` |
| **Spawned** | Dynamic child actors | `spawn` in actions |
| **Final** | Completion signaling | `type: "final"` + `onDone` |

## Best Practices

1. **Start with a state diagram** — draw it before coding
2. **States ≠ data** — states represent modes, not variable combinations
3. **Use hierarchy** to eliminate duplicate transitions
4. **Parallel** for truly independent concerns — don't over-use
5. **History** for interrupt/resume patterns (pause, background, errors)
6. **Guard order matters** — first matching guard wins
7. **Always transitions** for routing and validation logic
8. **Final states** let parent machines react to child completion
