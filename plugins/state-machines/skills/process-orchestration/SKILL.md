---
description: When the user asks about workflow orchestration, Temporal.io, step functions, durable execution, long-running processes, compensation patterns, or distributed workflow engines
---

# Process Orchestration

Production patterns for long-running workflows, durable execution, and distributed process orchestration.

## Temporal.io

Durable execution platform — code runs reliably even through failures, restarts, and deploys.

### Setup

```bash
# Local development
brew install temporal
temporal server start-dev

# Or Docker
docker run -d --name temporal \
  -p 7233:7233 \
  -p 8233:8233 \
  temporalio/auto-setup:latest

# TypeScript SDK
npm install @temporalio/client @temporalio/worker @temporalio/workflow @temporalio/activity
```

### Workflow Definition

```typescript
// workflows.ts — runs in a deterministic sandbox
import { proxyActivities, sleep, condition } from "@temporalio/workflow";
import type * as activities from "./activities";

// Proxy activities (non-deterministic code runs here)
const { chargePayment, reserveInventory, sendEmail, scheduleShipping } = proxyActivities<
  typeof activities
>({
  startToCloseTimeout: "30s",
  retry: {
    maximumAttempts: 3,
    initialInterval: "1s",
    backoffCoefficient: 2,
  },
});

// Workflow: Order Processing
export async function orderWorkflow(order: {
  orderId: string;
  items: any[];
  customerId: string;
  total: number;
}): Promise<{ status: string; trackingNumber?: string }> {
  // Step 1: Reserve inventory
  const reservation = await reserveInventory(order.orderId, order.items);

  // Step 2: Charge payment
  let paymentId: string;
  try {
    paymentId = await chargePayment(order.customerId, order.total);
  } catch (err) {
    // Compensate: release inventory
    await activities.releaseInventory(reservation.reservationId);
    throw err;
  }

  // Step 3: Schedule shipping
  const shipping = await scheduleShipping(order.orderId, order.items);

  // Step 4: Send confirmation email
  await sendEmail(order.customerId, "order-confirmation", {
    orderId: order.orderId,
    trackingNumber: shipping.trackingNumber,
  });

  return {
    status: "completed",
    trackingNumber: shipping.trackingNumber,
  };
}
```

### Activities (Side Effects)

```typescript
// activities.ts — normal async functions
export async function chargePayment(customerId: string, amount: number): Promise<string> {
  const response = await fetch("https://api.stripe.com/v1/charges", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.STRIPE_KEY}` },
    body: new URLSearchParams({
      customer: customerId,
      amount: String(amount * 100),
      currency: "usd",
    }),
  });

  if (!response.ok) throw new Error("Payment failed");
  const data = await response.json();
  return data.id;
}

export async function reserveInventory(orderId: string, items: any[]) {
  // Call inventory service
  const res = await fetch(`${INVENTORY_URL}/reserve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, items }),
  });
  return res.json();
}

export async function releaseInventory(reservationId: string) {
  await fetch(`${INVENTORY_URL}/release/${reservationId}`, { method: "POST" });
}

export async function scheduleShipping(orderId: string, items: any[]) {
  const res = await fetch(`${SHIPPING_URL}/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, items }),
  });
  return res.json();
}

export async function sendEmail(to: string, template: string, data: any) {
  await fetch(`${EMAIL_URL}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, template, data }),
  });
}
```

### Worker

```typescript
// worker.ts
import { Worker } from "@temporalio/worker";
import * as activities from "./activities";

async function run() {
  const worker = await Worker.create({
    workflowsPath: require.resolve("./workflows"),
    activities,
    taskQueue: "order-processing",
  });

  await worker.run();
}

run().catch(console.error);
```

### Client (Start Workflows)

```typescript
// client.ts
import { Client } from "@temporalio/client";

const client = new Client();

// Start a workflow
const handle = await client.workflow.start("orderWorkflow", {
  taskQueue: "order-processing",
  workflowId: `order-${orderId}`, // Idempotent ID
  args: [{ orderId, items, customerId, total }],
});

// Get result (blocking)
const result = await handle.result();

// Or query status
const status = await handle.query("getStatus");
```

### Signals and Queries

```typescript
// workflows.ts
import { defineSignal, defineQuery, setHandler } from "@temporalio/workflow";

// Define signals (external events)
export const approveSignal = defineSignal<[{ approver: string }]>("approve");
export const rejectSignal = defineSignal<[{ reason: string }]>("reject");

// Define queries (read state)
export const statusQuery = defineQuery<string>("getStatus");

export async function approvalWorkflow(request: ApprovalRequest): Promise<string> {
  let status = "pending";
  let decision: "approved" | "rejected" | null = null;

  // Handle signals
  setHandler(approveSignal, ({ approver }) => {
    status = "approved";
    decision = "approved";
  });

  setHandler(rejectSignal, ({ reason }) => {
    status = "rejected";
    decision = "rejected";
  });

  // Handle queries
  setHandler(statusQuery, () => status);

  // Wait for decision (with timeout)
  const approved = await condition(() => decision !== null, "48h");

  if (!approved) {
    status = "timed_out";
    return "timed_out";
  }

  return decision!;
}

// Send signal from client
const handle = client.workflow.getHandle("approval-123");
await handle.signal(approveSignal, { approver: "manager@example.com" });
```

## Simple Workflow Engine (No External Dependencies)

For simpler use cases — a lightweight workflow engine using your database:

```typescript
interface WorkflowStep {
  name: string;
  execute: (context: any) => Promise<any>;
  compensate?: (context: any) => Promise<void>;
}

interface WorkflowExecution {
  id: string;
  workflowName: string;
  currentStep: number;
  status: "running" | "completed" | "failed" | "compensating";
  context: Record<string, any>;
  steps: { name: string; status: string; result?: any; error?: string }[];
  createdAt: Date;
  updatedAt: Date;
}

class SimpleWorkflowEngine {
  private workflows = new Map<string, WorkflowStep[]>();

  register(name: string, steps: WorkflowStep[]) {
    this.workflows.set(name, steps);
  }

  async execute(workflowName: string, input: any): Promise<WorkflowExecution> {
    const steps = this.workflows.get(workflowName);
    if (!steps) throw new Error(`Unknown workflow: ${workflowName}`);

    const execution: WorkflowExecution = {
      id: crypto.randomUUID(),
      workflowName,
      currentStep: 0,
      status: "running",
      context: { input },
      steps: steps.map((s) => ({ name: s.name, status: "pending" })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Execute steps sequentially
    for (let i = 0; i < steps.length; i++) {
      execution.currentStep = i;
      execution.steps[i].status = "running";

      try {
        const result = await steps[i].execute(execution.context);
        execution.steps[i].status = "completed";
        execution.steps[i].result = result;
        execution.context[steps[i].name] = result;
      } catch (err) {
        execution.steps[i].status = "failed";
        execution.steps[i].error = (err as Error).message;

        // Compensate completed steps in reverse
        execution.status = "compensating";
        for (let j = i - 1; j >= 0; j--) {
          if (steps[j].compensate) {
            try {
              await steps[j].compensate!(execution.context);
              execution.steps[j].status = "compensated";
            } catch (compErr) {
              execution.steps[j].status = "compensation_failed";
              // Log for manual intervention
            }
          }
        }

        execution.status = "failed";
        return execution;
      }
    }

    execution.status = "completed";
    return execution;
  }
}

// Usage
const engine = new SimpleWorkflowEngine();

engine.register("order-processing", [
  {
    name: "reserveInventory",
    execute: async (ctx) => {
      return await inventoryService.reserve(ctx.input.items);
    },
    compensate: async (ctx) => {
      await inventoryService.release(ctx.reserveInventory.reservationId);
    },
  },
  {
    name: "chargePayment",
    execute: async (ctx) => {
      return await paymentService.charge(ctx.input.total);
    },
    compensate: async (ctx) => {
      await paymentService.refund(ctx.chargePayment.chargeId);
    },
  },
  {
    name: "scheduleShipping",
    execute: async (ctx) => {
      return await shippingService.schedule(ctx.input.orderId, ctx.input.items);
    },
  },
]);

const result = await engine.execute("order-processing", {
  orderId: "order-123",
  items: [{ productId: "prod-1", quantity: 2 }],
  total: 99.99,
});
```

## Database-Backed Job Queue

For durable background jobs with retry:

```sql
CREATE TABLE jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue         TEXT NOT NULL DEFAULT 'default',
  type          TEXT NOT NULL,
  payload       JSONB NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  attempts      INT DEFAULT 0,
  max_attempts  INT DEFAULT 3,
  run_at        TIMESTAMPTZ DEFAULT NOW(),
  locked_at     TIMESTAMPTZ,
  locked_by     TEXT,
  completed_at  TIMESTAMPTZ,
  failed_at     TIMESTAMPTZ,
  error         TEXT,
  result        JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_queue_status ON jobs(queue, status, run_at);
```

```typescript
// Worker: poll for jobs using SKIP LOCKED
async function processNextJob(queue: string, workerId: string): Promise<boolean> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Fetch and lock one job
    const { rows } = await client.query(
      `UPDATE jobs
       SET status = 'running', locked_at = NOW(), locked_by = $1, attempts = attempts + 1
       WHERE id = (
         SELECT id FROM jobs
         WHERE queue = $2 AND status = 'pending' AND run_at <= NOW()
         ORDER BY run_at
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`,
      [workerId, queue]
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return false;
    }

    const job = rows[0];
    await client.query("COMMIT");

    // Process the job
    try {
      const result = await handlers[job.type](job.payload);
      await pool.query(
        `UPDATE jobs SET status = 'completed', completed_at = NOW(), result = $1 WHERE id = $2`,
        [JSON.stringify(result), job.id]
      );
    } catch (err) {
      const error = (err as Error).message;
      if (job.attempts >= job.max_attempts) {
        await pool.query(
          `UPDATE jobs SET status = 'failed', failed_at = NOW(), error = $1 WHERE id = $2`,
          [error, job.id]
        );
      } else {
        // Retry with backoff
        const backoff = Math.pow(2, job.attempts) * 1000;
        await pool.query(
          `UPDATE jobs SET status = 'pending', locked_at = NULL, locked_by = NULL,
           run_at = NOW() + interval '${backoff} milliseconds', error = $1
           WHERE id = $2`,
          [error, job.id]
        );
      }
    }

    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
```

## Choosing an Orchestration Approach

| Approach | Complexity | Durability | Best For |
|----------|-----------|------------|----------|
| **XState** | Low | In-memory (or persisted) | UI flows, short processes |
| **Simple Engine** | Medium | Database-backed | Internal tools, simple sagas |
| **Job Queue** | Medium | Database-backed | Background tasks, retries |
| **Temporal.io** | High | Full durability | Distributed, long-running |
| **AWS Step Functions** | Medium | Cloud-managed | AWS workloads |

## Best Practices

1. **Idempotency** — every step should be safe to retry
2. **Compensation** — always plan the rollback for each step
3. **Timeouts** — set explicit timeouts for every external call
4. **Visibility** — log and persist workflow state for debugging
5. **Dead letter** — failed jobs should be captured, not lost
6. **Unique IDs** — use workflow ID for deduplication
7. **Start simple** — a database job queue covers most needs before reaching for Temporal
8. **Monitor** — track workflow duration, failure rates, and queue depth
