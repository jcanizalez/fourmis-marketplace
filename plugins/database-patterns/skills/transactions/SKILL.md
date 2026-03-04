---
description: When the user asks about database transactions, ACID properties, isolation levels, locking, optimistic locking, pessimistic locking, SELECT FOR UPDATE, deadlocks, advisory locks, or concurrent database access
---

# Transaction & Locking Patterns

Handle concurrent database access safely. Covers ACID properties, isolation levels, optimistic and pessimistic locking, advisory locks, deadlock prevention, and transaction best practices for PostgreSQL.

## ACID Properties

| Property | Meaning | Example |
|----------|---------|---------|
| **Atomicity** | All or nothing | Transfer: debit + credit both succeed or both fail |
| **Consistency** | Constraints always hold | Balance never goes negative (CHECK constraint) |
| **Isolation** | Concurrent transactions don't interfere | Two transfers on same account get correct result |
| **Durability** | Committed data survives crashes | Power loss after COMMIT → data is safe |

## Transaction Basics

### Node.js (pg)

```typescript
import { Pool } from "pg";

const pool = new Pool();

async function transferFunds(fromId: string, toId: string, amount: number) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check balance
    const { rows } = await client.query(
      "SELECT balance FROM accounts WHERE id = $1 FOR UPDATE",
      [fromId]
    );

    if (rows[0].balance < amount) {
      throw new Error("Insufficient funds");
    }

    // Debit
    await client.query(
      "UPDATE accounts SET balance = balance - $1, updated_at = now() WHERE id = $2",
      [amount, fromId]
    );

    // Credit
    await client.query(
      "UPDATE accounts SET balance = balance + $1, updated_at = now() WHERE id = $2",
      [amount, toId]
    );

    // Record transfer
    await client.query(
      "INSERT INTO transfers (from_id, to_id, amount) VALUES ($1, $2, $3)",
      [fromId, toId, amount]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release(); // Always release back to pool
  }
}
```

### Go (database/sql)

```go
func TransferFunds(ctx context.Context, db *sql.DB, fromID, toID string, amount float64) error {
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return fmt.Errorf("begin tx: %w", err)
    }
    defer tx.Rollback() // No-op if already committed

    // Lock the source account
    var balance float64
    err = tx.QueryRowContext(ctx,
        "SELECT balance FROM accounts WHERE id = $1 FOR UPDATE",
        fromID).Scan(&balance)
    if err != nil {
        return fmt.Errorf("query balance: %w", err)
    }

    if balance < amount {
        return fmt.Errorf("insufficient funds: have %.2f, need %.2f", balance, amount)
    }

    // Debit
    _, err = tx.ExecContext(ctx,
        "UPDATE accounts SET balance = balance - $1 WHERE id = $2",
        amount, fromID)
    if err != nil {
        return fmt.Errorf("debit: %w", err)
    }

    // Credit
    _, err = tx.ExecContext(ctx,
        "UPDATE accounts SET balance = balance + $1 WHERE id = $2",
        amount, toID)
    if err != nil {
        return fmt.Errorf("credit: %w", err)
    }

    return tx.Commit()
}
```

## Isolation Levels

```sql
-- Set isolation level for a transaction
BEGIN ISOLATION LEVEL READ COMMITTED;    -- Default in PostgreSQL
BEGIN ISOLATION LEVEL REPEATABLE READ;
BEGIN ISOLATION LEVEL SERIALIZABLE;
```

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Use Case |
|-------|-----------|-------------------|-------------|----------|
| **Read Committed** | ❌ No | ✅ Yes | ✅ Yes | Default — good for most apps |
| **Repeatable Read** | ❌ No | ❌ No | ❌ No* | Reports, analytics |
| **Serializable** | ❌ No | ❌ No | ❌ No | Financial transactions |

*PostgreSQL's Repeatable Read also prevents phantom reads (uses MVCC snapshots).

### When to Use Higher Isolation

```typescript
// Read Committed (default) — fine for most operations
await client.query("BEGIN");

// Repeatable Read — when you read data and make decisions based on it
await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
const { rows } = await client.query("SELECT * FROM inventory WHERE product_id = $1", [productId]);
if (rows[0].stock >= quantity) {
  await client.query(
    "UPDATE inventory SET stock = stock - $1 WHERE product_id = $2",
    [quantity, productId]
  );
}
await client.query("COMMIT");
// Note: may get serialization error — must retry!

// Serializable — strongest guarantee, but retry on failure
await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
// ... complex logic ...
await client.query("COMMIT");
```

### Retry Logic for Serialization Errors

```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      // PostgreSQL serialization failure: 40001
      // Deadlock detected: 40P01
      if ((err.code === "40001" || err.code === "40P01") && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 100 + Math.random() * 100;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

// Usage
const result = await withRetry(() => transferFunds("acc_1", "acc_2", 100));
```

## Optimistic Locking (Version Column)

No database lock acquired. Detect conflicts at update time. Best for low-contention scenarios.

```sql
-- Add version column
ALTER TABLE products ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
```

```typescript
// Read
const product = await db.query(
  "SELECT * FROM products WHERE id = $1",
  [productId]
);

// ... user edits the product ...

// Update — check version hasn't changed
const result = await db.query(
  `UPDATE products
   SET name = $1, price = $2, version = version + 1, updated_at = now()
   WHERE id = $3 AND version = $4
   RETURNING *`,
  [newName, newPrice, productId, product.version]
);

if (result.rowCount === 0) {
  throw new ConflictError("Product was modified by another user. Please refresh and try again.");
}
```

### Go Optimistic Locking

```go
func UpdateProduct(ctx context.Context, db *sql.DB, product Product) error {
    result, err := db.ExecContext(ctx,
        `UPDATE products
         SET name = $1, price = $2, version = version + 1, updated_at = now()
         WHERE id = $3 AND version = $4`,
        product.Name, product.Price, product.ID, product.Version)
    if err != nil {
        return fmt.Errorf("update: %w", err)
    }

    rowsAffected, _ := result.RowsAffected()
    if rowsAffected == 0 {
        return ErrConcurrentModification
    }
    return nil
}
```

## Pessimistic Locking (SELECT FOR UPDATE)

Database-level row lock. Best for high-contention scenarios.

```sql
-- Lock rows until transaction commits
BEGIN;
SELECT * FROM inventory WHERE product_id = 'prod_123' FOR UPDATE;
-- Other transactions trying to UPDATE/SELECT FOR UPDATE this row will WAIT
UPDATE inventory SET stock = stock - 1 WHERE product_id = 'prod_123';
COMMIT;
-- Lock released

-- FOR UPDATE NOWAIT — fail immediately if row is locked
SELECT * FROM inventory WHERE product_id = 'prod_123' FOR UPDATE NOWAIT;
-- ERROR: could not obtain lock on row

-- FOR UPDATE SKIP LOCKED — skip locked rows (great for job queues)
SELECT * FROM jobs WHERE status = 'pending'
ORDER BY created_at
LIMIT 1
FOR UPDATE SKIP LOCKED;
-- Returns the first UNLOCKED pending job
```

### Job Queue Pattern with SKIP LOCKED

```typescript
// Worker: pick a job, lock it, process it
async function processNextJob(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Atomically pick and lock one job
    const { rows } = await client.query(`
      UPDATE jobs
      SET status = 'processing', started_at = now(), worker_id = $1
      WHERE id = (
        SELECT id FROM jobs
        WHERE status = 'pending'
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `, [workerId]);

    if (rows.length === 0) {
      await client.query("COMMIT");
      return null; // No jobs available
    }

    const job = rows[0];

    try {
      const result = await executeJob(job);
      await client.query(
        "UPDATE jobs SET status = 'completed', result = $1, completed_at = now() WHERE id = $2",
        [JSON.stringify(result), job.id]
      );
    } catch (err) {
      await client.query(
        "UPDATE jobs SET status = 'failed', error = $1, failed_at = now() WHERE id = $2",
        [(err as Error).message, job.id]
      );
    }

    await client.query("COMMIT");
    return job;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
```

## Advisory Locks

Application-level locks managed by PostgreSQL. Don't lock rows — lock a concept.

```sql
-- Session-level advisory lock (held until session ends or manually released)
SELECT pg_advisory_lock(hashtext('report_generation'));
-- ... generate report ...
SELECT pg_advisory_unlock(hashtext('report_generation'));

-- Transaction-level advisory lock (released on COMMIT/ROLLBACK)
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('deploy_migration'));
-- ... run migration ...
COMMIT; -- Lock automatically released
```

```typescript
// Ensure only one worker processes a specific task
async function withAdvisoryLock<T>(
  pool: Pool,
  lockKey: string,
  fn: () => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    // Try to acquire lock (non-blocking)
    const { rows } = await client.query(
      "SELECT pg_try_advisory_lock(hashtext($1)) AS acquired",
      [lockKey]
    );

    if (!rows[0].acquired) {
      throw new Error(`Could not acquire lock: ${lockKey}`);
    }

    const result = await fn();
    return result;
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext($1))", [lockKey]);
    client.release();
  }
}

// Usage
await withAdvisoryLock(pool, "nightly-report", async () => {
  await generateReport();
});
```

## Deadlock Prevention

```sql
-- 🔴 DEADLOCK: Two transactions lock rows in different order
-- TX1: UPDATE accounts SET ... WHERE id = 'A' → locks A
-- TX2: UPDATE accounts SET ... WHERE id = 'B' → locks B
-- TX1: UPDATE accounts SET ... WHERE id = 'B' → WAITS for B
-- TX2: UPDATE accounts SET ... WHERE id = 'A' → WAITS for A → DEADLOCK!

-- ✅ FIX: Always lock rows in the same order (e.g., sort by ID)
BEGIN;
SELECT * FROM accounts WHERE id IN ('A', 'B') ORDER BY id FOR UPDATE;
-- Both rows locked in deterministic order — no deadlock
UPDATE accounts SET balance = balance - 100 WHERE id = 'A';
UPDATE accounts SET balance = balance + 100 WHERE id = 'B';
COMMIT;
```

```typescript
// Always sort IDs before locking
async function transferFundsSafe(fromId: string, toId: string, amount: number) {
  const [first, second] = [fromId, toId].sort(); // Deterministic order!

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT * FROM accounts WHERE id IN ($1, $2) ORDER BY id FOR UPDATE",
      [first, second]
    );
    // Now both rows are locked in consistent order — no deadlock possible
    await client.query("UPDATE accounts SET balance = balance - $1 WHERE id = $2", [amount, fromId]);
    await client.query("UPDATE accounts SET balance = balance + $1 WHERE id = $2", [amount, toId]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
```

## Transaction Best Practices

| Practice | Why |
|----------|-----|
| Keep transactions short | Long transactions hold locks, block others |
| Don't do HTTP calls inside transactions | Network timeouts = long locks |
| Always ROLLBACK on error | Use try/catch/finally pattern |
| Always release connections | `finally { client.release() }` |
| Use `FOR UPDATE SKIP LOCKED` for queues | Avoid contention between workers |
| Sort lock order to prevent deadlocks | Always lock rows in consistent order |
| Retry on serialization errors (40001) | Expected with REPEATABLE READ / SERIALIZABLE |
| Use `NOWAIT` when you can't afford to wait | Fail fast instead of blocking |
| Default to READ COMMITTED | Only use higher isolation when specifically needed |
