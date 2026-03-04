---
description: When the user asks about workflow patterns, saga pattern, order processing state machines, approval workflows, retry with backoff, long-running processes, or business process modeling
---

# Workflow Patterns

Production patterns for modeling business workflows as state machines.

## Order Processing Workflow

```
┌───────┐    ┌──────────┐    ┌───────────┐    ┌─────────┐    ┌───────────┐
│ draft │───▶│ submitted│───▶│ confirmed │───▶│ shipped │───▶│ delivered │
└───────┘    └─────┬────┘    └─────┬─────┘    └────┬────┘    └───────────┘
                   │               │               │
                   ▼               ▼               ▼
              ┌─────────┐    ┌──────────┐    ┌──────────┐
              │cancelled│    │ refunded │    │  failed  │
              └─────────┘    └──────────┘    └──────────┘
```

```typescript
import { createMachine, assign, fromPromise } from "xstate";

interface OrderContext {
  orderId: string;
  items: { productId: string; quantity: number; price: number }[];
  total: number;
  paymentId: string | null;
  trackingNumber: string | null;
  cancelReason: string | null;
  refundId: string | null;
  createdAt: string;
  updatedAt: string;
}

type OrderEvent =
  | { type: "SUBMIT" }
  | { type: "CONFIRM_PAYMENT"; paymentId: string }
  | { type: "PAYMENT_FAILED"; reason: string }
  | { type: "SHIP"; trackingNumber: string }
  | { type: "DELIVER" }
  | { type: "CANCEL"; reason: string }
  | { type: "REFUND" }
  | { type: "DELIVERY_FAILED"; reason: string };

const orderMachine = createMachine({
  id: "order",
  types: {} as { context: OrderContext; events: OrderEvent },
  initial: "draft",
  context: ({ input }: { input: { orderId: string; items: any[] } }) => ({
    orderId: input.orderId,
    items: input.items,
    total: input.items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0),
    paymentId: null,
    trackingNumber: null,
    cancelReason: null,
    refundId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  states: {
    draft: {
      on: {
        SUBMIT: {
          target: "submitted",
          guard: ({ context }) => context.items.length > 0,
          actions: "updateTimestamp",
        },
      },
    },
    submitted: {
      // Wait for payment processing
      on: {
        CONFIRM_PAYMENT: {
          target: "confirmed",
          actions: [
            assign({ paymentId: ({ event }) => event.paymentId }),
            "updateTimestamp",
          ],
        },
        PAYMENT_FAILED: {
          target: "paymentFailed",
          actions: "updateTimestamp",
        },
        CANCEL: {
          target: "cancelled",
          actions: [
            assign({ cancelReason: ({ event }) => event.reason }),
            "updateTimestamp",
          ],
        },
      },
      // Auto-cancel after 30 minutes
      after: {
        1800000: {
          target: "cancelled",
          actions: assign({ cancelReason: "Payment timeout" }),
        },
      },
    },
    paymentFailed: {
      on: {
        SUBMIT: "submitted", // Retry
        CANCEL: {
          target: "cancelled",
          actions: assign({ cancelReason: ({ event }) => event.reason }),
        },
      },
    },
    confirmed: {
      on: {
        SHIP: {
          target: "shipped",
          actions: [
            assign({ trackingNumber: ({ event }) => event.trackingNumber }),
            "updateTimestamp",
            "sendShippingNotification",
          ],
        },
        REFUND: {
          target: "refunding",
          actions: "updateTimestamp",
        },
      },
    },
    shipped: {
      on: {
        DELIVER: {
          target: "delivered",
          actions: ["updateTimestamp", "sendDeliveryNotification"],
        },
        DELIVERY_FAILED: {
          target: "deliveryFailed",
          actions: "updateTimestamp",
        },
      },
    },
    deliveryFailed: {
      on: {
        SHIP: {
          target: "shipped", // Re-ship
          actions: assign({ trackingNumber: ({ event }) => event.trackingNumber }),
        },
        REFUND: "refunding",
      },
    },
    refunding: {
      invoke: {
        src: "processRefund",
        onDone: {
          target: "refunded",
          actions: [
            assign({ refundId: ({ event }) => event.output.refundId }),
            "updateTimestamp",
          ],
        },
        onError: "refundFailed",
      },
    },
    refundFailed: {
      on: {
        REFUND: "refunding", // Retry refund
      },
    },
    delivered: { type: "final" },
    cancelled: { type: "final" },
    refunded: { type: "final" },
  },
}, {
  actions: {
    updateTimestamp: assign({
      updatedAt: () => new Date().toISOString(),
    }),
    sendShippingNotification: ({ context }) => {
      // Send email/push notification
      console.log(`Order ${context.orderId} shipped: ${context.trackingNumber}`);
    },
    sendDeliveryNotification: ({ context }) => {
      console.log(`Order ${context.orderId} delivered`);
    },
  },
});
```

## Approval Workflow

Multi-level approval with escalation:

```typescript
interface ApprovalContext {
  requestId: string;
  requestor: string;
  amount: number;
  approvals: { approver: string; decision: "approved" | "rejected"; timestamp: string }[];
  currentLevel: number;
  maxLevel: number;
  reason: string | null;
}

type ApprovalEvent =
  | { type: "SUBMIT" }
  | { type: "APPROVE"; approver: string }
  | { type: "REJECT"; approver: string; reason: string }
  | { type: "ESCALATE" }
  | { type: "REVISE"; changes: Record<string, any> };

const approvalMachine = createMachine({
  id: "approval",
  types: {} as { context: ApprovalContext; events: ApprovalEvent },
  initial: "draft",
  context: {
    requestId: "",
    requestor: "",
    amount: 0,
    approvals: [],
    currentLevel: 0,
    maxLevel: 3, // VP, Director, CFO
    reason: null,
  },
  states: {
    draft: {
      on: { SUBMIT: "pendingApproval" },
    },
    pendingApproval: {
      always: [
        // Auto-approve small amounts
        { guard: ({ context }) => context.amount < 100, target: "approved" },
        // Require director for medium amounts
        {
          guard: ({ context }) => context.amount < 10000 && context.currentLevel >= 1,
          target: "approved",
        },
        // Require CFO for large amounts
        {
          guard: ({ context }) => context.currentLevel >= 2,
          target: "approved",
        },
      ],
      on: {
        APPROVE: {
          actions: [
            assign({
              approvals: ({ context, event }) => [
                ...context.approvals,
                { approver: event.approver, decision: "approved", timestamp: new Date().toISOString() },
              ],
              currentLevel: ({ context }) => context.currentLevel + 1,
            }),
          ],
          target: "pendingApproval", // Re-evaluate with new level
        },
        REJECT: {
          target: "rejected",
          actions: assign({
            reason: ({ event }) => event.reason,
            approvals: ({ context, event }) => [
              ...context.approvals,
              { approver: event.approver, decision: "rejected", timestamp: new Date().toISOString() },
            ],
          }),
        },
        ESCALATE: {
          guard: ({ context }) => context.currentLevel < context.maxLevel,
          actions: assign({
            currentLevel: ({ context }) => context.currentLevel + 1,
          }),
        },
      },
      // Auto-escalate after 48 hours
      after: {
        172800000: { actions: "autoEscalate" },
      },
    },
    approved: { type: "final" },
    rejected: {
      on: {
        REVISE: {
          target: "draft",
          actions: assign({
            approvals: [],
            currentLevel: 0,
            reason: null,
          }),
        },
      },
    },
  },
});
```

## Retry with Exponential Backoff

```typescript
interface RetryContext {
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  result: any;
}

const retryMachine = createMachine({
  id: "retry",
  types: {} as {
    context: RetryContext;
    events: { type: "START" } | { type: "RESET" };
  },
  initial: "idle",
  context: {
    attempts: 0,
    maxAttempts: 5,
    lastError: null,
    result: null,
  },
  states: {
    idle: {
      on: { START: "attempting" },
    },
    attempting: {
      entry: assign({ attempts: ({ context }) => context.attempts + 1 }),
      invoke: {
        src: "performAction",
        onDone: {
          target: "success",
          actions: assign({ result: ({ event }) => event.output }),
        },
        onError: [
          {
            guard: ({ context }) => context.attempts >= context.maxAttempts,
            target: "exhausted",
            actions: assign({ lastError: ({ event }) => (event.error as Error).message }),
          },
          {
            target: "waiting",
            actions: assign({ lastError: ({ event }) => (event.error as Error).message }),
          },
        ],
      },
    },
    waiting: {
      after: {
        retryDelay: "attempting",
      },
    },
    success: {
      type: "final",
    },
    exhausted: {
      on: {
        RESET: {
          target: "idle",
          actions: assign({ attempts: 0, lastError: null }),
        },
      },
    },
  },
}, {
  delays: {
    retryDelay: ({ context }) => {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const base = 1000;
      const delay = base * Math.pow(2, context.attempts - 1);
      // Add jitter (±25%)
      const jitter = delay * 0.25 * (Math.random() * 2 - 1);
      return Math.min(delay + jitter, 30000); // Cap at 30s
    },
  },
});
```

## Saga Pattern (Compensation)

For distributed transactions — execute steps and compensate (rollback) on failure:

```typescript
interface SagaContext {
  orderId: string;
  paymentId: string | null;
  inventoryReserved: boolean;
  shippingScheduled: boolean;
  error: string | null;
  compensationStep: string | null;
}

const orderSagaMachine = createMachine({
  id: "orderSaga",
  types: {} as { context: SagaContext },
  initial: "reserveInventory",
  context: {
    orderId: "",
    paymentId: null,
    inventoryReserved: false,
    shippingScheduled: false,
    error: null,
    compensationStep: null,
  },
  states: {
    // Forward steps
    reserveInventory: {
      invoke: {
        src: "reserveInventory",
        onDone: {
          target: "processPayment",
          actions: assign({ inventoryReserved: true }),
        },
        onError: {
          target: "failed",
          actions: assign({ error: ({ event }) => (event.error as Error).message }),
        },
      },
    },
    processPayment: {
      invoke: {
        src: "processPayment",
        onDone: {
          target: "scheduleShipping",
          actions: assign({ paymentId: ({ event }) => event.output.paymentId }),
        },
        onError: {
          target: "compensateInventory",
          actions: assign({
            error: ({ event }) => (event.error as Error).message,
            compensationStep: "payment",
          }),
        },
      },
    },
    scheduleShipping: {
      invoke: {
        src: "scheduleShipping",
        onDone: {
          target: "completed",
          actions: assign({ shippingScheduled: true }),
        },
        onError: {
          target: "compensatePayment",
          actions: assign({
            error: ({ event }) => (event.error as Error).message,
            compensationStep: "shipping",
          }),
        },
      },
    },
    completed: { type: "final" },

    // Compensation (rollback) steps
    compensatePayment: {
      invoke: {
        src: "refundPayment",
        onDone: "compensateInventory",
        onError: "compensationFailed", // Manual intervention needed
      },
    },
    compensateInventory: {
      invoke: {
        src: "releaseInventory",
        onDone: "failed",
        onError: "compensationFailed",
      },
    },
    failed: {
      // Saga failed but compensations succeeded
      type: "final",
    },
    compensationFailed: {
      // Needs manual intervention — log, alert, create ticket
      entry: "alertOps",
      type: "final",
    },
  },
});
```

## Pipeline Pattern

Sequential processing with error handling at each stage:

```typescript
const pipelineMachine = createMachine({
  id: "pipeline",
  types: {} as {
    context: {
      input: any;
      validated: any;
      transformed: any;
      enriched: any;
      output: any;
      error: string | null;
      stage: string;
    };
  },
  initial: "validate",
  context: { input: null, validated: null, transformed: null, enriched: null, output: null, error: null, stage: "" },
  states: {
    validate: {
      entry: assign({ stage: "validate" }),
      invoke: {
        src: "validateInput",
        onDone: {
          target: "transform",
          actions: assign({ validated: ({ event }) => event.output }),
        },
        onError: {
          target: "error",
          actions: assign({ error: ({ event }) => (event.error as Error).message }),
        },
      },
    },
    transform: {
      entry: assign({ stage: "transform" }),
      invoke: {
        src: "transformData",
        onDone: {
          target: "enrich",
          actions: assign({ transformed: ({ event }) => event.output }),
        },
        onError: {
          target: "error",
          actions: assign({ error: ({ event }) => (event.error as Error).message }),
        },
      },
    },
    enrich: {
      entry: assign({ stage: "enrich" }),
      invoke: {
        src: "enrichData",
        onDone: {
          target: "store",
          actions: assign({ enriched: ({ event }) => event.output }),
        },
        onError: {
          target: "error",
          actions: assign({ error: ({ event }) => (event.error as Error).message }),
        },
      },
    },
    store: {
      entry: assign({ stage: "store" }),
      invoke: {
        src: "storeResult",
        onDone: {
          target: "done",
          actions: assign({ output: ({ event }) => event.output }),
        },
        onError: {
          target: "error",
          actions: assign({ error: ({ event }) => (event.error as Error).message }),
        },
      },
    },
    done: { type: "final" },
    error: {
      on: {
        RETRY: [
          // Resume from the failed stage
          { guard: ({ context }) => context.stage === "validate", target: "validate" },
          { guard: ({ context }) => context.stage === "transform", target: "transform" },
          { guard: ({ context }) => context.stage === "enrich", target: "enrich" },
          { guard: ({ context }) => context.stage === "store", target: "store" },
        ],
      },
    },
  },
});
```

## Best Practices

1. **Model the domain** — states should represent real business states, not UI states
2. **Explicit error states** — every async step should have an error transition
3. **Timeouts** — use `after` for payment timeouts, approval escalation, retry backoff
4. **Compensation** — for distributed transactions, always plan the rollback path
5. **Audit trail** — store state transitions for debugging and compliance
6. **Idempotency** — ensure events can be safely replayed (use transaction IDs)
7. **Start simple** — a basic state machine beats no state machine. Add complexity as needed
