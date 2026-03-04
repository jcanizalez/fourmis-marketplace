---
description: When the user asks about XState, state machines in JavaScript/TypeScript, createMachine, createActor, statecharts, XState v5, or modeling application logic with states and transitions
---

# XState v5 Basics

Production patterns for building state machines and statecharts with XState v5.

## Installation

```bash
npm install xstate
```

## Core Concepts

```
State Machine = States + Events + Transitions

┌─────────┐   EVENT_A   ┌─────────┐   EVENT_B   ┌─────────┐
│  idle    │ ──────────▶ │ loading │ ──────────▶ │ success │
│ (initial)│             │         │             │ (final) │
└─────────┘             └────┬────┘             └─────────┘
                             │ EVENT_C
                             ▼
                        ┌─────────┐
                        │  error  │
                        └─────────┘
```

- **State**: A specific condition the system can be in (`idle`, `loading`, `success`)
- **Event**: Something that happens (`FETCH`, `RETRY`, `CANCEL`)
- **Transition**: Moving from one state to another in response to an event
- **Context**: Extended state — data that changes over the machine's lifetime
- **Action**: Side effect that runs during a transition (assign, log, send)
- **Guard**: Condition that must be true for a transition to occur

## Basic Machine

```typescript
import { createMachine, createActor } from "xstate";

const toggleMachine = createMachine({
  id: "toggle",
  initial: "inactive",
  states: {
    inactive: {
      on: { TOGGLE: "active" },
    },
    active: {
      on: { TOGGLE: "inactive" },
    },
  },
});

// Create an actor (runtime instance)
const actor = createActor(toggleMachine);

// Subscribe to state changes
actor.subscribe((snapshot) => {
  console.log("State:", snapshot.value);
});

// Start the actor
actor.start();

// Send events
actor.send({ type: "TOGGLE" }); // → "active"
actor.send({ type: "TOGGLE" }); // → "inactive"

// Read current state
console.log(actor.getSnapshot().value); // "inactive"
```

## Context (Extended State)

```typescript
import { createMachine, assign, createActor } from "xstate";

interface CounterContext {
  count: number;
  max: number;
}

type CounterEvent =
  | { type: "INCREMENT" }
  | { type: "DECREMENT" }
  | { type: "RESET" };

const counterMachine = createMachine({
  id: "counter",
  types: {} as {
    context: CounterContext;
    events: CounterEvent;
  },
  initial: "active",
  context: {
    count: 0,
    max: 10,
  },
  states: {
    active: {
      on: {
        INCREMENT: {
          guard: ({ context }) => context.count < context.max,
          actions: assign({
            count: ({ context }) => context.count + 1,
          }),
        },
        DECREMENT: {
          guard: ({ context }) => context.count > 0,
          actions: assign({
            count: ({ context }) => context.count - 1,
          }),
        },
        RESET: {
          actions: assign({ count: 0 }),
        },
      },
    },
  },
});

const actor = createActor(counterMachine);
actor.start();
actor.send({ type: "INCREMENT" });
console.log(actor.getSnapshot().context.count); // 1
```

## Events with Payloads

```typescript
type FormEvent =
  | { type: "UPDATE_FIELD"; field: string; value: string }
  | { type: "SUBMIT" }
  | { type: "RESET" };

interface FormContext {
  fields: Record<string, string>;
  errors: Record<string, string>;
}

const formMachine = createMachine({
  id: "form",
  types: {} as {
    context: FormContext;
    events: FormEvent;
  },
  initial: "editing",
  context: {
    fields: { name: "", email: "" },
    errors: {},
  },
  states: {
    editing: {
      on: {
        UPDATE_FIELD: {
          actions: assign({
            fields: ({ context, event }) => ({
              ...context.fields,
              [event.field]: event.value,
            }),
            // Clear error for this field
            errors: ({ context, event }) => {
              const { [event.field]: _, ...rest } = context.errors;
              return rest;
            },
          }),
        },
        SUBMIT: "validating",
      },
    },
    validating: {
      always: [
        { guard: "isValid", target: "submitting" },
        { target: "editing", actions: "setErrors" },
      ],
    },
    submitting: {
      // Will be async — see invoke pattern
    },
    success: { type: "final" },
    error: {
      on: { RETRY: "submitting" },
    },
  },
});
```

## Guards (Conditions)

```typescript
const paymentMachine = createMachine({
  id: "payment",
  types: {} as {
    context: { amount: number; balance: number };
    events: { type: "PAY" } | { type: "REFUND" };
  },
  initial: "idle",
  context: { amount: 0, balance: 100 },
  states: {
    idle: {
      on: {
        PAY: {
          guard: ({ context }) => context.amount <= context.balance,
          target: "processing",
        },
      },
    },
    processing: {
      // ...
    },
  },
});

// Named guards (reusable)
const machine = createMachine(
  {
    // ...
    states: {
      idle: {
        on: {
          PAY: {
            guard: "hasSufficientFunds",
            target: "processing",
          },
        },
      },
    },
  },
  {
    guards: {
      hasSufficientFunds: ({ context }) => context.amount <= context.balance,
    },
  }
);
```

## Actions

```typescript
const machine = createMachine(
  {
    id: "notifications",
    types: {} as {
      context: { messages: string[] };
      events: { type: "NOTIFY"; message: string } | { type: "CLEAR" };
    },
    initial: "idle",
    context: { messages: [] },
    states: {
      idle: {
        on: {
          NOTIFY: {
            actions: [
              // Inline action
              assign({
                messages: ({ context, event }) => [...context.messages, event.message],
              }),
              // Named action (defined in implementations)
              "logNotification",
              // Raise another event
              // raise({ type: "CHECK_OVERFLOW" }),
            ],
          },
          CLEAR: {
            actions: assign({ messages: [] }),
          },
        },
      },
    },
  },
  {
    actions: {
      logNotification: ({ context, event }) => {
        console.log(`New notification: ${(event as any).message}`);
      },
    },
  }
);
```

### Action Types

| Action | Description |
|--------|-------------|
| `assign()` | Update context |
| `raise()` | Send event to self |
| `sendTo()` | Send event to another actor |
| `log()` | Log to console |
| `emit()` | Emit event to subscribers |
| `enqueueActions()` | Conditionally enqueue actions |

## Async with Invoke

```typescript
const fetchMachine = createMachine({
  id: "fetch",
  types: {} as {
    context: { data: any; error: string | null };
    events: { type: "FETCH"; url: string };
  },
  initial: "idle",
  context: { data: null, error: null },
  states: {
    idle: {
      on: { FETCH: "loading" },
    },
    loading: {
      invoke: {
        id: "fetchData",
        src: fromPromise(async ({ input }: { input: { url: string } }) => {
          const res = await fetch(input.url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        }),
        input: ({ event }) => ({ url: (event as any).url }),
        onDone: {
          target: "success",
          actions: assign({ data: ({ event }) => event.output }),
        },
        onError: {
          target: "error",
          actions: assign({ error: ({ event }) => (event.error as Error).message }),
        },
      },
    },
    success: {
      on: { FETCH: "loading" },
    },
    error: {
      on: { FETCH: "loading" },
    },
  },
});
```

### Invoke Sources

```typescript
import { fromPromise, fromCallback, fromObservable } from "xstate";

// Promise-based
const fetchActor = fromPromise(async ({ input }) => {
  const res = await fetch(input.url);
  return res.json();
});

// Callback-based (for subscriptions, WebSocket, etc.)
const wsActor = fromCallback(({ sendBack, receive, input }) => {
  const ws = new WebSocket(input.url);
  ws.onmessage = (e) => sendBack({ type: "MESSAGE", data: e.data });
  ws.onerror = () => sendBack({ type: "ERROR" });

  // Receive events from parent
  receive((event) => {
    if (event.type === "SEND") ws.send(event.data);
  });

  // Cleanup
  return () => ws.close();
});

// Observable-based (RxJS)
const timerActor = fromObservable(({ input }) =>
  interval(input.interval).pipe(map((i) => ({ type: "TICK", count: i })))
);
```

## Delayed Transitions

```typescript
const retryMachine = createMachine({
  id: "retry",
  initial: "idle",
  states: {
    idle: {
      on: { START: "attempting" },
    },
    attempting: {
      invoke: {
        src: "apiCall",
        onDone: "success",
        onError: "waiting",
      },
    },
    waiting: {
      after: {
        3000: "attempting", // Retry after 3 seconds
      },
    },
    success: { type: "final" },
  },
});

// Dynamic delay
const dynamicRetry = createMachine({
  // ...
  states: {
    waiting: {
      after: {
        retryDelay: "attempting", // Named delay
      },
    },
  },
}, {
  delays: {
    retryDelay: ({ context }) => context.retryCount * 1000, // Exponential-ish
  },
});
```

## Entry/Exit Actions

```typescript
const machine = createMachine({
  initial: "idle",
  states: {
    idle: {
      on: { ACTIVATE: "active" },
    },
    active: {
      entry: [
        // Runs when entering this state
        () => console.log("Entered active"),
        assign({ activatedAt: () => Date.now() }),
      ],
      exit: [
        // Runs when leaving this state
        () => console.log("Leaving active"),
      ],
      on: { DEACTIVATE: "idle" },
    },
  },
});
```

## Type-Safe Machines (Best Practice)

```typescript
import { createMachine, assign } from "xstate";

// 1. Define types
interface AuthContext {
  user: { id: string; name: string } | null;
  error: string | null;
  attempts: number;
}

type AuthEvent =
  | { type: "LOGIN"; email: string; password: string }
  | { type: "LOGOUT" }
  | { type: "RETRY" };

// 2. Create machine with types
const authMachine = createMachine({
  id: "auth",
  types: {} as {
    context: AuthContext;
    events: AuthEvent;
  },
  initial: "idle",
  context: {
    user: null,
    error: null,
    attempts: 0,
  },
  states: {
    idle: {
      on: {
        LOGIN: "authenticating",
      },
    },
    authenticating: {
      entry: assign({ attempts: ({ context }) => context.attempts + 1 }),
      invoke: {
        src: fromPromise(async ({ input }: { input: { email: string; password: string } }) => {
          // API call
          const res = await fetch("/api/auth", {
            method: "POST",
            body: JSON.stringify(input),
          });
          if (!res.ok) throw new Error("Authentication failed");
          return res.json();
        }),
        input: ({ event }) => ({
          email: (event as Extract<AuthEvent, { type: "LOGIN" }>).email,
          password: (event as Extract<AuthEvent, { type: "LOGIN" }>).password,
        }),
        onDone: {
          target: "authenticated",
          actions: assign({
            user: ({ event }) => event.output,
            error: null,
          }),
        },
        onError: {
          target: "error",
          actions: assign({
            error: ({ event }) => (event.error as Error).message,
          }),
        },
      },
    },
    authenticated: {
      on: { LOGOUT: "idle" },
      exit: assign({ user: null }),
    },
    error: {
      on: {
        RETRY: "authenticating",
        LOGIN: "authenticating",
      },
    },
  },
});
```

## Best Practices

1. **Model states explicitly** — if your code has `isLoading && !hasError && isAuthenticated`, use a state machine
2. **Use XState v5** — the actor model is cleaner than v4's services
3. **Type everything** — use the `types` property for full TypeScript safety
4. **Named actions/guards** — extract into implementations for testability
5. **Keep context minimal** — only data that influences transitions
6. **Use `always` transitions** for validation/routing logic (replaces transient states)
7. **Prefer `fromPromise`** for async — cleaner than callback-based
8. **Test with `actor.getSnapshot()`** — verify state and context after events
