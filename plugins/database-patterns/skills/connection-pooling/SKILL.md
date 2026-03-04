---
description: When the user asks about database connection pooling, pg Pool, pgxpool, connection limits, PgBouncer, pool sizing, idle connections, connection health checks, or database connection management
---

# Connection Pooling Patterns

Manage database connections efficiently. Covers pool sizing, configuration, health checks, PgBouncer, monitoring, and common pitfalls for Node.js (pg) and Go (pgx/database-sql).

## Why Connection Pooling

```
Without pooling:                    With pooling:
Request → Connect → Query → Close  Request → Pool.acquire → Query → Pool.release
Request → Connect → Query → Close  Request → Pool.acquire → Query → Pool.release
Request → Connect → Query → Close  Request → Pool.acquire → Query → Pool.release

Each connection: ~50ms overhead     Reuse existing connections: ~0ms overhead
100 concurrent requests = 100 TCP   100 concurrent requests = 20 connections
connections to database              shared from pool
```

## Node.js — pg Pool

### Configuration

```typescript
import { Pool, PoolConfig } from "pg";

const poolConfig: PoolConfig = {
  // Connection
  connectionString: process.env.DATABASE_URL,
  // OR individual params:
  // host: process.env.DB_HOST,
  // port: parseInt(process.env.DB_PORT || "5432"),
  // database: process.env.DB_NAME,
  // user: process.env.DB_USER,
  // password: process.env.DB_PASSWORD,

  // Pool sizing
  max: 20,                        // Maximum connections in pool
  min: 5,                         // Minimum idle connections to maintain
  idleTimeoutMillis: 30000,       // Close idle connections after 30s
  connectionTimeoutMillis: 5000,  // Fail if can't connect in 5s

  // SSL (production)
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: true, ca: process.env.DB_CA_CERT }
    : false,

  // Statement timeout (kill slow queries)
  statement_timeout: 30000,       // 30s max query time

  // Application name (visible in pg_stat_activity)
  application_name: process.env.SERVICE_NAME || "my-api",
};

export const pool = new Pool(poolConfig);

// Handle pool errors (disconnects, etc.)
pool.on("error", (err) => {
  console.error("Unexpected pool error:", err.message);
  // Don't crash — pool will reconnect
});

// Optional: log when connections are created/removed
pool.on("connect", () => {
  console.debug("New pool connection created");
});

pool.on("remove", () => {
  console.debug("Pool connection removed");
});
```

### Usage Patterns

```typescript
// Pattern 1: Simple query (pool manages connection automatically)
const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);

// Pattern 2: Explicit checkout (for transactions)
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("UPDATE ...", [...]);
  await client.query("INSERT ...", [...]);
  await client.query("COMMIT");
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  client.release(); // 🔴 CRITICAL: Always release, even on error!
}

// ❌ NEVER forget to release — causes pool exhaustion
// ❌ NEVER release inside the try block before catch runs
```

### Pool Monitoring

```typescript
// Check pool status
function getPoolStats() {
  return {
    totalCount: pool.totalCount,     // Total connections (active + idle)
    idleCount: pool.idleCount,       // Connections available
    waitingCount: pool.waitingCount, // Queries waiting for a connection
  };
}

// Expose as health check
app.get("/health/db", async (req, res) => {
  const stats = getPoolStats();

  if (stats.waitingCount > 5) {
    return res.status(503).json({
      status: "unhealthy",
      message: "Pool saturated",
      ...stats,
    });
  }

  // Test connectivity
  try {
    await pool.query("SELECT 1");
    res.json({ status: "healthy", ...stats });
  } catch (err) {
    res.status(503).json({
      status: "unhealthy",
      error: err.message,
      ...stats,
    });
  }
});

// Prometheus metrics
import client from "prom-client";

const poolGauge = new client.Gauge({
  name: "db_pool_connections",
  help: "Database connection pool status",
  labelNames: ["state"] as const,
});

setInterval(() => {
  poolGauge.set({ state: "total" }, pool.totalCount);
  poolGauge.set({ state: "idle" }, pool.idleCount);
  poolGauge.set({ state: "waiting" }, pool.waitingCount);
  poolGauge.set({ state: "active" }, pool.totalCount - pool.idleCount);
}, 5000);
```

### Graceful Shutdown

```typescript
async function shutdown() {
  console.log("Shutting down...");

  // Stop accepting new requests
  server.close();

  // Wait for active queries to finish, then close pool
  await pool.end();

  console.log("Pool closed, exiting");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

## Go — pgxpool

```go
import (
    "context"
    "time"

    "github.com/jackc/pgx/v5/pgxpool"
)

func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
    config, err := pgxpool.ParseConfig(databaseURL)
    if err != nil {
        return nil, fmt.Errorf("parsing config: %w", err)
    }

    // Pool sizing
    config.MaxConns = 20               // Maximum connections
    config.MinConns = 5                // Minimum idle connections
    config.MaxConnLifetime = 1 * time.Hour     // Recycle connections after 1 hour
    config.MaxConnIdleTime = 30 * time.Minute  // Close idle after 30 min
    config.HealthCheckPeriod = 1 * time.Minute // Background health check

    // Connection settings
    config.ConnConfig.ConnectTimeout = 5 * time.Second
    config.ConnConfig.RuntimeParams["statement_timeout"] = "30000" // 30s

    pool, err := pgxpool.NewWithConfig(ctx, config)
    if err != nil {
        return nil, fmt.Errorf("creating pool: %w", err)
    }

    // Test connection
    if err := pool.Ping(ctx); err != nil {
        return nil, fmt.Errorf("pinging database: %w", err)
    }

    return pool, nil
}
```

### Go Pool Usage

```go
// Simple query (automatic connection management)
rows, err := pool.Query(ctx, "SELECT * FROM users WHERE is_active = $1", true)

// Transaction
tx, err := pool.Begin(ctx)
if err != nil { return err }
defer tx.Rollback(ctx) // No-op if committed

_, err = tx.Exec(ctx, "UPDATE ...", ...)
if err != nil { return err }

return tx.Commit(ctx)

// Pool stats
stat := pool.Stat()
fmt.Printf("Total: %d, Idle: %d, Acquired: %d\n",
    stat.TotalConns(), stat.IdleConns(), stat.AcquiredConns())
```

### Go database/sql Pool

```go
import "database/sql"

db, err := sql.Open("postgres", databaseURL)
if err != nil { return err }

// Pool configuration
db.SetMaxOpenConns(20)                  // Max total connections
db.SetMaxIdleConns(5)                   // Max idle connections
db.SetConnMaxLifetime(1 * time.Hour)    // Recycle after 1 hour
db.SetConnMaxIdleTime(30 * time.Minute) // Close idle after 30 min

// Stats
stats := db.Stats()
fmt.Printf("Open: %d, InUse: %d, Idle: %d, WaitCount: %d\n",
    stats.OpenConnections, stats.InUse, stats.Idle, stats.WaitCount)
```

## Pool Sizing Formula

```
Optimal pool size = (core_count * 2) + effective_spindle_count

For SSD:   connections ≈ CPU cores * 2 + 1
4 cores  → max 9 connections
8 cores  → max 17 connections
16 cores → max 33 connections
```

### Rules of Thumb

| Server Type | Max Pool Size | Why |
|-------------|--------------|-----|
| Small API (1-2 CPU) | 5-10 | Low concurrency, small DB |
| Medium API (4-8 CPU) | 15-25 | Most applications |
| Large API (16+ CPU) | 30-50 | High throughput, careful with DB limits |
| Background workers | 3-5 | Low concurrency, long queries |

### PostgreSQL Side

```sql
-- Check max connections (default: 100)
SHOW max_connections;

-- See active connections
SELECT count(*) FROM pg_stat_activity;

-- Connections per application
SELECT application_name, count(*)
FROM pg_stat_activity
GROUP BY application_name;

-- Formula: total across all app instances must be < max_connections
-- 3 API instances × 20 pool = 60 connections
-- 2 worker instances × 5 pool = 10 connections
-- Reserve 10 for admin/monitoring = 10
-- Total: 80 < 100 ✅
```

## PgBouncer (Connection Pooler Proxy)

When you need more app connections than PostgreSQL can handle.

```
App instances (100+ connections)
       │
  ┌────▼────┐
  │PgBouncer│  ← Multiplexes many app connections
  └────┬────┘    into fewer PostgreSQL connections
       │
  ┌────▼────┐
  │PostgreSQL│  ← max_connections = 100
  └─────────┘
```

```ini
# pgbouncer.ini
[databases]
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

# Pool mode
pool_mode = transaction  # transaction (recommended) | session | statement

# Sizing
default_pool_size = 20
max_client_conn = 200      # Max app-side connections
max_db_connections = 50     # Max PostgreSQL connections
reserve_pool_size = 5       # Extra connections for burst

# Timeouts
server_idle_timeout = 300
client_idle_timeout = 300
query_timeout = 30
```

### Pool Modes

| Mode | Behavior | Use When |
|------|----------|----------|
| `session` | Connection held for entire client session | Prepared statements, LISTEN/NOTIFY |
| `transaction` | Connection returned after each transaction (**recommended**) | Most applications |
| `statement` | Connection returned after each statement | Simple queries only |

## Common Pitfalls

```typescript
// ❌ Forgetting to release connections
const client = await pool.connect();
const result = await client.query("SELECT ...");
// client.release() is never called!
// Pool slowly exhausts → all requests hang

// ❌ Creating a new Pool per request
app.get("/users", async (req, res) => {
  const pool = new Pool(); // ← Creates new pool every request!
  const result = await pool.query("SELECT * FROM users");
  res.json(result.rows);
});

// ❌ Using pool.query() inside a transaction
await pool.query("BEGIN");
await pool.query("UPDATE ..."); // ← May use different connection!
await pool.query("COMMIT");     // ← BEGIN and COMMIT on different connections

// ✅ Fix: Use client for transactions
const client = await pool.connect();
await client.query("BEGIN");
await client.query("UPDATE ...");
await client.query("COMMIT");
client.release();
```
