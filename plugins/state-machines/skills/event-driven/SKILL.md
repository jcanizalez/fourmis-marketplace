---
description: When the user asks about event sourcing, CQRS, event stores, event-driven architecture, domain events, projections, snapshots, or modeling systems as a sequence of events
---

# Event-Driven Architecture Patterns

Production patterns for event sourcing, CQRS, and event-driven systems.

## Event Sourcing

Instead of storing current state, store all events that led to that state:

```
Traditional:  Account { balance: 150 }
Event-sourced: [
  AccountCreated { id: "acc-1" },
  MoneyDeposited { amount: 200 },
  MoneyWithdrawn { amount: 50 },
]
→ Replay events to get current state: 0 + 200 - 50 = 150
```

### TypeScript Implementation

```typescript
// Domain events
type AccountEvent =
  | { type: "AccountCreated"; id: string; owner: string; timestamp: string }
  | { type: "MoneyDeposited"; amount: number; timestamp: string }
  | { type: "MoneyWithdrawn"; amount: number; timestamp: string }
  | { type: "AccountClosed"; reason: string; timestamp: string };

// State derived from events
interface AccountState {
  id: string;
  owner: string;
  balance: number;
  status: "active" | "closed";
  version: number;
}

// Reducer — pure function that applies events to state
function applyEvent(state: AccountState, event: AccountEvent): AccountState {
  switch (event.type) {
    case "AccountCreated":
      return { id: event.id, owner: event.owner, balance: 0, status: "active", version: state.version + 1 };
    case "MoneyDeposited":
      return { ...state, balance: state.balance + event.amount, version: state.version + 1 };
    case "MoneyWithdrawn":
      return { ...state, balance: state.balance - event.amount, version: state.version + 1 };
    case "AccountClosed":
      return { ...state, status: "closed", version: state.version + 1 };
    default:
      return state;
  }
}

// Rebuild state from events
function replayEvents(events: AccountEvent[]): AccountState {
  const initial: AccountState = { id: "", owner: "", balance: 0, status: "active", version: 0 };
  return events.reduce(applyEvent, initial);
}

// Usage
const events: AccountEvent[] = [
  { type: "AccountCreated", id: "acc-1", owner: "Alice", timestamp: "2024-01-01T00:00:00Z" },
  { type: "MoneyDeposited", amount: 1000, timestamp: "2024-01-02T00:00:00Z" },
  { type: "MoneyWithdrawn", amount: 250, timestamp: "2024-01-03T00:00:00Z" },
];

const state = replayEvents(events);
console.log(state.balance); // 750
```

### Event Store (PostgreSQL)

```sql
CREATE TABLE events (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  stream_id     TEXT NOT NULL,          -- e.g., "account:acc-1"
  event_type    TEXT NOT NULL,
  event_data    JSONB NOT NULL,
  metadata      JSONB DEFAULT '{}',     -- correlation ID, causation ID, user
  version       INT NOT NULL,           -- Optimistic concurrency
  created_at    TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(stream_id, version)            -- Prevents concurrent writes
);

CREATE INDEX idx_events_stream ON events(stream_id, version);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_created ON events(created_at);
```

### Append Events (with Optimistic Concurrency)

```typescript
async function appendEvents(
  streamId: string,
  events: any[],
  expectedVersion: number
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check current version (optimistic concurrency)
    const { rows } = await client.query(
      "SELECT MAX(version) as version FROM events WHERE stream_id = $1",
      [streamId]
    );

    const currentVersion = rows[0]?.version ?? 0;
    if (currentVersion !== expectedVersion) {
      throw new Error(
        `Concurrency conflict: expected version ${expectedVersion}, got ${currentVersion}`
      );
    }

    // Append events
    for (let i = 0; i < events.length; i++) {
      await client.query(
        `INSERT INTO events (stream_id, event_type, event_data, version)
         VALUES ($1, $2, $3, $4)`,
        [streamId, events[i].type, JSON.stringify(events[i]), expectedVersion + i + 1]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Read events for a stream
async function readStream(streamId: string): Promise<any[]> {
  const { rows } = await pool.query(
    "SELECT event_data FROM events WHERE stream_id = $1 ORDER BY version",
    [streamId]
  );
  return rows.map((r) => r.event_data);
}
```

## CQRS (Command Query Responsibility Segregation)

Separate the write model (commands) from the read model (queries):

```
                    Commands
                       │
                       ▼
┌─────────────────────────────────────┐
│          Command Handler            │
│  (validate, emit events)            │
└──────────────┬──────────────────────┘
               │ Events
               ▼
┌─────────────────────────────────────┐
│          Event Store                │
│  (append-only log)                  │
└──────────────┬──────────────────────┘
               │ Events (published)
               ▼
┌─────────────────────────────────────┐
│        Projection Handler           │
│  (update read models)               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│        Read Model (DB)              │  ◀── Queries
│  (optimized for reads)              │
└─────────────────────────────────────┘
```

### Command Handler

```typescript
interface Command {
  type: string;
  payload: any;
}

interface CommandResult {
  success: boolean;
  events: any[];
  error?: string;
}

class AccountCommandHandler {
  async handle(command: Command, state: AccountState): Promise<CommandResult> {
    switch (command.type) {
      case "Deposit": {
        const { amount } = command.payload;
        if (amount <= 0) return { success: false, events: [], error: "Amount must be positive" };
        if (state.status === "closed") return { success: false, events: [], error: "Account is closed" };
        return {
          success: true,
          events: [{ type: "MoneyDeposited", amount, timestamp: new Date().toISOString() }],
        };
      }
      case "Withdraw": {
        const { amount } = command.payload;
        if (amount <= 0) return { success: false, events: [], error: "Amount must be positive" };
        if (amount > state.balance) return { success: false, events: [], error: "Insufficient funds" };
        if (state.status === "closed") return { success: false, events: [], error: "Account is closed" };
        return {
          success: true,
          events: [{ type: "MoneyWithdrawn", amount, timestamp: new Date().toISOString() }],
        };
      }
      default:
        return { success: false, events: [], error: `Unknown command: ${command.type}` };
    }
  }
}
```

### Projections (Read Models)

```typescript
// Projection: account summary (read-optimized)
interface AccountSummary {
  id: string;
  owner: string;
  balance: number;
  transactionCount: number;
  lastTransaction: string | null;
}

class AccountProjection {
  async handle(event: AccountEvent & { streamId: string }) {
    switch (event.type) {
      case "AccountCreated":
        await db.query(
          `INSERT INTO account_summaries (id, owner, balance, transaction_count, last_transaction)
           VALUES ($1, $2, 0, 0, NULL)`,
          [event.id, event.owner]
        );
        break;
      case "MoneyDeposited":
        await db.query(
          `UPDATE account_summaries
           SET balance = balance + $1,
               transaction_count = transaction_count + 1,
               last_transaction = $2
           WHERE id = $3`,
          [event.amount, event.timestamp, event.streamId.replace("account:", "")]
        );
        break;
      case "MoneyWithdrawn":
        await db.query(
          `UPDATE account_summaries
           SET balance = balance - $1,
               transaction_count = transaction_count + 1,
               last_transaction = $2
           WHERE id = $3`,
          [event.amount, event.timestamp, event.streamId.replace("account:", "")]
        );
        break;
    }
  }
}
```

## Snapshots

For streams with many events, periodically save a snapshot to avoid replaying everything:

```typescript
interface Snapshot {
  streamId: string;
  state: any;
  version: number;
  createdAt: string;
}

async function loadState(streamId: string): Promise<AccountState> {
  // 1. Load latest snapshot
  const { rows: snapshots } = await pool.query(
    "SELECT state, version FROM snapshots WHERE stream_id = $1 ORDER BY version DESC LIMIT 1",
    [streamId]
  );

  let state: AccountState;
  let fromVersion: number;

  if (snapshots.length > 0) {
    state = snapshots[0].state;
    fromVersion = snapshots[0].version;
  } else {
    state = { id: "", owner: "", balance: 0, status: "active", version: 0 };
    fromVersion = 0;
  }

  // 2. Load events AFTER the snapshot
  const { rows: events } = await pool.query(
    "SELECT event_data FROM events WHERE stream_id = $1 AND version > $2 ORDER BY version",
    [streamId, fromVersion]
  );

  // 3. Replay remaining events
  for (const row of events) {
    state = applyEvent(state, row.event_data);
  }

  return state;
}

// Take snapshot every 100 events
async function maybeSnapshot(streamId: string, state: AccountState) {
  if (state.version % 100 === 0) {
    await pool.query(
      "INSERT INTO snapshots (stream_id, state, version) VALUES ($1, $2, $3)",
      [streamId, JSON.stringify(state), state.version]
    );
  }
}
```

## Domain Events (Without Full Event Sourcing)

Even without event sourcing, domain events decouple modules:

```typescript
// Simple event bus
class EventBus {
  private handlers = new Map<string, ((event: any) => Promise<void>)[]>();

  on(eventType: string, handler: (event: any) => Promise<void>) {
    const existing = this.handlers.get(eventType) || [];
    this.handlers.set(eventType, [...existing, handler]);
  }

  async emit(event: { type: string; [key: string]: any }) {
    const handlers = this.handlers.get(event.type) || [];
    await Promise.all(handlers.map((h) => h(event)));
  }
}

// Usage
const bus = new EventBus();

// Module A emits
bus.on("UserRegistered", async (event) => {
  await sendWelcomeEmail(event.email);
});

bus.on("UserRegistered", async (event) => {
  await createDefaultPreferences(event.userId);
});

bus.on("UserRegistered", async (event) => {
  await analytics.track("signup", { userId: event.userId });
});

// After registration:
await bus.emit({
  type: "UserRegistered",
  userId: "user-123",
  email: "alice@example.com",
  timestamp: new Date().toISOString(),
});
```

## Event Design Guidelines

### Event Naming

```typescript
// Past tense — events describe what happened
"AccountCreated"    // ✅
"CreateAccount"     // ❌ (this is a command)
"OrderShipped"      // ✅
"ShipOrder"         // ❌ (command)
```

### Event Schema

```typescript
interface DomainEvent {
  type: string;           // What happened
  aggregateId: string;    // Which entity
  timestamp: string;      // When
  version: number;        // Stream version
  metadata: {
    correlationId: string; // Trace the request chain
    causationId: string;   // What caused this event
    userId: string;        // Who triggered it
  };
  data: Record<string, any>; // Event-specific payload
}
```

### Versioning Events

When event schemas change:

```typescript
// v1
{ type: "UserRegistered", name: "Alice" }

// v2 (added email)
{ type: "UserRegistered", name: "Alice", email: "alice@example.com" }

// Upcaster: transform old events to new format
function upcastUserRegistered(event: any): any {
  if (!event.email) {
    return { ...event, email: null }; // Default for old events
  }
  return event;
}
```

## Best Practices

1. **Events are immutable** — never modify stored events
2. **Events are past tense** — they describe what already happened
3. **Include enough data** — events should be self-contained
4. **Optimistic concurrency** — use version numbers to prevent conflicts
5. **Snapshot for performance** — avoid replaying millions of events
6. **Projections are disposable** — you can always rebuild from events
7. **Start simple** — domain events don't require full event sourcing
8. **Idempotent handlers** — projections may process the same event twice
