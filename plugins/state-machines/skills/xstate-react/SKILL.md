---
description: When the user asks about XState with React, useMachine hook, useActor, useSelector, state machines in React components, form wizards with XState, or authentication flows with state machines
---

# XState + React Integration

Production patterns for using XState v5 state machines in React applications.

## Installation

```bash
npm install xstate @xstate/react
```

## useActor (Primary Hook)

```tsx
import { createMachine, assign, fromPromise } from "xstate";
import { useActor } from "@xstate/react";

const toggleMachine = createMachine({
  id: "toggle",
  initial: "inactive",
  states: {
    inactive: { on: { TOGGLE: "active" } },
    active: { on: { TOGGLE: "inactive" } },
  },
});

function Toggle() {
  const [snapshot, send] = useActor(toggleMachine);

  return (
    <button onClick={() => send({ type: "TOGGLE" })}>
      {snapshot.value === "active" ? "ON" : "OFF"}
    </button>
  );
}
```

## useSelector (Performance Optimization)

Select specific values from the snapshot — only re-renders when the selected value changes:

```tsx
import { createActor } from "xstate";
import { useSelector } from "@xstate/react";

// Create actor at module level or in context
const authActor = createActor(authMachine).start();

function UserName() {
  // Only re-renders when user.name changes
  const userName = useSelector(authActor, (snapshot) => snapshot.context.user?.name);
  return <span>{userName ?? "Guest"}</span>;
}

function AuthStatus() {
  // Only re-renders when state value changes
  const isAuthenticated = useSelector(authActor, (snapshot) =>
    snapshot.matches("authenticated")
  );
  return <span>{isAuthenticated ? "Logged in" : "Logged out"}</span>;
}
```

## Actor Context Pattern (Sharing Across Components)

```tsx
import { createContext, useContext } from "react";
import { createActor, ActorRefFrom } from "xstate";
import { useSelector } from "@xstate/react";

// 1. Create the actor
const appMachine = createMachine({
  id: "app",
  types: {} as {
    context: {
      user: { id: string; name: string } | null;
      theme: "light" | "dark";
    };
    events:
      | { type: "LOGIN"; user: { id: string; name: string } }
      | { type: "LOGOUT" }
      | { type: "TOGGLE_THEME" };
  },
  initial: "idle",
  context: { user: null, theme: "light" },
  states: {
    idle: {
      on: {
        LOGIN: {
          target: "authenticated",
          actions: assign({ user: ({ event }) => event.user }),
        },
        TOGGLE_THEME: {
          actions: assign({
            theme: ({ context }) => (context.theme === "light" ? "dark" : "light"),
          }),
        },
      },
    },
    authenticated: {
      on: {
        LOGOUT: {
          target: "idle",
          actions: assign({ user: null }),
        },
        TOGGLE_THEME: {
          actions: assign({
            theme: ({ context }) => (context.theme === "light" ? "dark" : "light"),
          }),
        },
      },
    },
  },
});

// 2. Create context
type AppActorRef = ActorRefFrom<typeof appMachine>;
const AppContext = createContext<AppActorRef>(null!);

// 3. Provider
function AppProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, send, actorRef] = useActor(appMachine);

  return (
    <AppContext.Provider value={actorRef}>
      {children}
    </AppContext.Provider>
  );
}

// 4. Hook for consuming components
function useAppActor() {
  return useContext(AppContext);
}

// 5. Usage in components
function Header() {
  const appActor = useAppActor();
  const userName = useSelector(appActor, (s) => s.context.user?.name);
  const theme = useSelector(appActor, (s) => s.context.theme);

  return (
    <header className={theme}>
      <span>{userName ?? "Guest"}</span>
      <button onClick={() => appActor.send({ type: "TOGGLE_THEME" })}>
        {theme === "light" ? "🌙" : "☀️"}
      </button>
    </header>
  );
}
```

## Multi-Step Form Wizard

```tsx
import { createMachine, assign } from "xstate";
import { useActor } from "@xstate/react";

interface WizardContext {
  personalInfo: { name: string; email: string };
  address: { street: string; city: string; zip: string };
  payment: { cardNumber: string; expiry: string };
  errors: Record<string, string>;
}

type WizardEvent =
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "UPDATE"; field: string; value: string }
  | { type: "SUBMIT" };

const wizardMachine = createMachine({
  id: "wizard",
  types: {} as { context: WizardContext; events: WizardEvent },
  initial: "personalInfo",
  context: {
    personalInfo: { name: "", email: "" },
    address: { street: "", city: "", zip: "" },
    payment: { cardNumber: "", expiry: "" },
    errors: {},
  },
  states: {
    personalInfo: {
      on: {
        UPDATE: { actions: "updateField" },
        NEXT: [
          { guard: "personalInfoValid", target: "address" },
          { actions: "setValidationErrors" },
        ],
      },
    },
    address: {
      on: {
        UPDATE: { actions: "updateField" },
        BACK: "personalInfo",
        NEXT: [
          { guard: "addressValid", target: "payment" },
          { actions: "setValidationErrors" },
        ],
      },
    },
    payment: {
      on: {
        UPDATE: { actions: "updateField" },
        BACK: "address",
        SUBMIT: [
          { guard: "paymentValid", target: "submitting" },
          { actions: "setValidationErrors" },
        ],
      },
    },
    submitting: {
      invoke: {
        src: "submitOrder",
        onDone: "success",
        onError: {
          target: "payment",
          actions: assign({
            errors: ({ event }) => ({
              submit: (event.error as Error).message,
            }),
          }),
        },
      },
    },
    success: { type: "final" },
  },
}, {
  actions: {
    updateField: assign({
      // Dynamic field update based on current step
      personalInfo: ({ context, event }) => {
        if (!["name", "email"].includes((event as any).field)) return context.personalInfo;
        return { ...context.personalInfo, [(event as any).field]: (event as any).value };
      },
      address: ({ context, event }) => {
        if (!["street", "city", "zip"].includes((event as any).field)) return context.address;
        return { ...context.address, [(event as any).field]: (event as any).value };
      },
      payment: ({ context, event }) => {
        if (!["cardNumber", "expiry"].includes((event as any).field)) return context.payment;
        return { ...context.payment, [(event as any).field]: (event as any).value };
      },
      errors: {},
    }),
    setValidationErrors: assign({
      errors: ({ context, event }) => {
        // Validation logic per step
        return { form: "Please fill in all required fields" };
      },
    }),
  },
  guards: {
    personalInfoValid: ({ context }) =>
      context.personalInfo.name.length > 0 && context.personalInfo.email.includes("@"),
    addressValid: ({ context }) =>
      context.address.street.length > 0 && context.address.city.length > 0,
    paymentValid: ({ context }) =>
      context.payment.cardNumber.length >= 13,
  },
});

// React component
function CheckoutWizard() {
  const [snapshot, send] = useActor(wizardMachine);
  const { context } = snapshot;
  const step = snapshot.value as string;

  const steps = ["personalInfo", "address", "payment", "submitting", "success"];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div>
      {/* Progress bar */}
      <div className="flex gap-2 mb-6">
        {["Personal", "Address", "Payment"].map((label, i) => (
          <div
            key={label}
            className={`flex-1 h-2 rounded ${
              i <= currentStepIndex ? "bg-blue-500" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Error display */}
      {Object.keys(context.errors).length > 0 && (
        <div className="text-red-500 mb-4">
          {Object.values(context.errors).join(", ")}
        </div>
      )}

      {/* Step content */}
      {step === "personalInfo" && (
        <div>
          <h2>Personal Information</h2>
          <input
            value={context.personalInfo.name}
            onChange={(e) => send({ type: "UPDATE", field: "name", value: e.target.value })}
            placeholder="Name"
          />
          <input
            value={context.personalInfo.email}
            onChange={(e) => send({ type: "UPDATE", field: "email", value: e.target.value })}
            placeholder="Email"
          />
          <button onClick={() => send({ type: "NEXT" })}>Next</button>
        </div>
      )}

      {step === "address" && (
        <div>
          <h2>Address</h2>
          <input
            value={context.address.street}
            onChange={(e) => send({ type: "UPDATE", field: "street", value: e.target.value })}
            placeholder="Street"
          />
          <input
            value={context.address.city}
            onChange={(e) => send({ type: "UPDATE", field: "city", value: e.target.value })}
            placeholder="City"
          />
          <button onClick={() => send({ type: "BACK" })}>Back</button>
          <button onClick={() => send({ type: "NEXT" })}>Next</button>
        </div>
      )}

      {step === "payment" && (
        <div>
          <h2>Payment</h2>
          <input
            value={context.payment.cardNumber}
            onChange={(e) => send({ type: "UPDATE", field: "cardNumber", value: e.target.value })}
            placeholder="Card Number"
          />
          <button onClick={() => send({ type: "BACK" })}>Back</button>
          <button onClick={() => send({ type: "SUBMIT" })}>Submit</button>
        </div>
      )}

      {step === "submitting" && <div>Processing...</div>}
      {step === "success" && <div>Order placed successfully!</div>}
    </div>
  );
}
```

## Authentication Flow

```tsx
const authMachine = createMachine({
  id: "auth",
  types: {} as {
    context: {
      user: { id: string; name: string; email: string } | null;
      error: string | null;
    };
    events:
      | { type: "LOGIN"; email: string; password: string }
      | { type: "SIGNUP"; name: string; email: string; password: string }
      | { type: "LOGOUT" }
      | { type: "REFRESH" };
  },
  initial: "checking",
  context: { user: null, error: null },
  states: {
    checking: {
      invoke: {
        src: fromPromise(async () => {
          const res = await fetch("/api/auth/me");
          if (!res.ok) throw new Error("Not authenticated");
          return res.json();
        }),
        onDone: {
          target: "authenticated",
          actions: assign({ user: ({ event }) => event.output }),
        },
        onError: "unauthenticated",
      },
    },
    unauthenticated: {
      on: {
        LOGIN: "loggingIn",
        SIGNUP: "signingUp",
      },
    },
    loggingIn: {
      invoke: {
        src: fromPromise(async ({ input }: { input: { email: string; password: string } }) => {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
          if (!res.ok) throw new Error("Invalid credentials");
          return res.json();
        }),
        input: ({ event }) => ({
          email: (event as any).email,
          password: (event as any).password,
        }),
        onDone: {
          target: "authenticated",
          actions: assign({ user: ({ event }) => event.output, error: null }),
        },
        onError: {
          target: "unauthenticated",
          actions: assign({ error: ({ event }) => (event.error as Error).message }),
        },
      },
    },
    signingUp: {
      // Similar to loggingIn with /api/auth/signup
      invoke: {
        src: fromPromise(async ({ input }) => {
          const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
          if (!res.ok) {
            const body = await res.json();
            throw new Error(body.message || "Signup failed");
          }
          return res.json();
        }),
        input: ({ event }) => ({
          name: (event as any).name,
          email: (event as any).email,
          password: (event as any).password,
        }),
        onDone: {
          target: "authenticated",
          actions: assign({ user: ({ event }) => event.output, error: null }),
        },
        onError: {
          target: "unauthenticated",
          actions: assign({ error: ({ event }) => (event.error as Error).message }),
        },
      },
    },
    authenticated: {
      on: {
        LOGOUT: {
          target: "loggingOut",
        },
        REFRESH: "checking",
      },
    },
    loggingOut: {
      invoke: {
        src: fromPromise(async () => {
          await fetch("/api/auth/logout", { method: "POST" });
        }),
        onDone: {
          target: "unauthenticated",
          actions: assign({ user: null }),
        },
        onError: {
          target: "unauthenticated",
          actions: assign({ user: null }),
        },
      },
    },
  },
});

// Usage with context provider
function App() {
  const [snapshot, send] = useActor(authMachine);

  if (snapshot.matches("checking")) return <LoadingScreen />;
  if (snapshot.matches("authenticated")) {
    return <AuthenticatedApp user={snapshot.context.user!} onLogout={() => send({ type: "LOGOUT" })} />;
  }
  return <LoginScreen error={snapshot.context.error} onLogin={(email, password) => send({ type: "LOGIN", email, password })} />;
}
```

## Testing XState + React

```tsx
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("Toggle", () => {
  it("toggles between ON and OFF", async () => {
    render(<Toggle />);

    expect(screen.getByText("OFF")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByText("ON")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByText("OFF")).toBeInTheDocument();
  });
});

// Test the machine directly (unit test)
import { createActor } from "xstate";

describe("toggleMachine", () => {
  it("transitions correctly", () => {
    const actor = createActor(toggleMachine).start();

    expect(actor.getSnapshot().value).toBe("inactive");
    actor.send({ type: "TOGGLE" });
    expect(actor.getSnapshot().value).toBe("active");
    actor.send({ type: "TOGGLE" });
    expect(actor.getSnapshot().value).toBe("inactive");
  });
});
```

## Best Practices

1. **Create machines outside components** — machines are static definitions, not per-render
2. **Use `useSelector`** for derived values — prevents unnecessary re-renders
3. **Share actors via context** — not prop drilling
4. **Test machines separately** — unit test the machine logic, integration test the React UI
5. **Use the actor context pattern** — create actor once, share via React context
6. **Match states for rendering** — use `snapshot.matches("state")` not string comparison
7. **Keep UI logic in React** — state machines handle *what state* and *when to transition*, React handles *how to render*
