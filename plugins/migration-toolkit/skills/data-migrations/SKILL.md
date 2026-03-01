---
description: When the user asks about data migrations, backfilling data, ETL pipelines, data transformation scripts, zero-downtime data migration, bulk data updates, data backfills, migrating between databases, or moving data between systems
---

# Data Migrations

Patterns for migrating, transforming, and backfilling data in production systems without downtime. Covers ETL scripts, batch processing, dual-write patterns, and verification strategies.

## Migration Types

| Type | Use Case | Risk Level |
|------|----------|------------|
| **Backfill** | Populate a new column from existing data | Low-Medium |
| **Transform** | Change data format (string dates → timestamps) | Medium |
| **Merge** | Combine two tables/collections into one | High |
| **Split** | Break a table into normalized pieces | High |
| **Cross-system** | Move data between databases/services | Very High |

## Backfill Pattern (Most Common)

### Step 1: Add Column (Schema Migration)

```sql
-- Migration: add display_name column (nullable first)
ALTER TABLE users ADD COLUMN display_name TEXT;
```

### Step 2: Backfill Script

```typescript
// scripts/backfill-display-name.ts
import { db } from '../lib/db';

const BATCH_SIZE = 1000;
const SLEEP_MS = 100; // Throttle to avoid DB pressure

async function backfillDisplayName() {
  let processed = 0;
  let lastId = 0;

  while (true) {
    // Cursor-based pagination (NOT OFFSET — offset is O(n))
    const rows = await db.query(`
      SELECT id, first_name, last_name
      FROM users
      WHERE display_name IS NULL AND id > $1
      ORDER BY id
      LIMIT $2
    `, [lastId, BATCH_SIZE]);

    if (rows.length === 0) break;

    // Batch update
    for (const row of rows) {
      await db.query(`
        UPDATE users SET display_name = $1 WHERE id = $2
      `, [`${row.first_name} ${row.last_name}`.trim(), row.id]);
    }

    lastId = rows[rows.length - 1].id;
    processed += rows.length;

    console.log(`Backfilled ${processed} rows (last id: ${lastId})`);

    // Throttle to reduce DB load
    await new Promise(r => setTimeout(r, SLEEP_MS));
  }

  console.log(`Done. Total: ${processed} rows backfilled.`);
}

backfillDisplayName().catch(console.error);
```

### Step 3: Verify & Enforce

```sql
-- Verify no NULLs remain
SELECT COUNT(*) FROM users WHERE display_name IS NULL;
-- Should be 0

-- Now make it NOT NULL
ALTER TABLE users ALTER COLUMN display_name SET NOT NULL;
```

## Batch Processing Pattern

For large tables (millions+ rows), use batched updates with progress tracking:

```typescript
interface BatchConfig {
  tableName: string;
  batchSize: number;
  sleepMs: number;
  dryRun: boolean;
}

async function batchMigrate(
  config: BatchConfig,
  transform: (rows: any[]) => Promise<void>,
) {
  const { tableName, batchSize, sleepMs, dryRun } = config;

  // Get total count for progress
  const [{ count }] = await db.query(
    `SELECT COUNT(*) as count FROM ${tableName} WHERE NOT migrated`,
  );

  let processed = 0;
  let lastId = 0;
  const startTime = Date.now();

  while (true) {
    const rows = await db.query(`
      SELECT * FROM ${tableName}
      WHERE NOT migrated AND id > $1
      ORDER BY id LIMIT $2
    `, [lastId, batchSize]);

    if (rows.length === 0) break;

    if (!dryRun) {
      await db.transaction(async (tx) => {
        await transform(rows);

        // Mark as migrated
        const ids = rows.map(r => r.id);
        await tx.query(`
          UPDATE ${tableName} SET migrated = true WHERE id = ANY($1)
        `, [ids]);
      });
    }

    lastId = rows[rows.length - 1].id;
    processed += rows.length;

    const elapsed = (Date.now() - startTime) / 1000;
    const rate = processed / elapsed;
    const remaining = (count - processed) / rate;

    console.log(
      `[${processed}/${count}] ${((processed / count) * 100).toFixed(1)}% ` +
      `| ${rate.toFixed(0)} rows/s | ETA: ${formatDuration(remaining)}`
    );

    await new Promise(r => setTimeout(r, sleepMs));
  }

  console.log(`Migration complete: ${processed} rows in ${formatDuration((Date.now() - startTime) / 1000)}`);
}
```

## Zero-Downtime Data Migration (Dual-Write)

When restructuring data that the application actively reads/writes:

```
Phase 1: Dual-Write          Phase 2: Backfill          Phase 3: Cut Over
┌─────────────────┐         ┌──────────────┐           ┌──────────────┐
│ Write to OLD     │         │ Backfill new  │           │ Read from NEW│
│ Write to NEW     │         │ from old data │           │ Write to NEW │
│ Read from OLD    │         │ Read from OLD │           │ Drop OLD     │
└─────────────────┘         └──────────────┘           └──────────────┘
```

### Implementation

```typescript
// Phase 1: Dual-write service
class UserService {
  async updateEmail(userId: string, email: string) {
    // Write to both old and new tables
    await db.transaction(async (tx) => {
      // Old table (current source of truth)
      await tx.query(
        'UPDATE users SET email = $1 WHERE id = $2',
        [email, userId],
      );

      // New table (future source of truth)
      await tx.query(
        'UPDATE user_profiles SET email = $1 WHERE user_id = $2',
        [email, userId],
      );
    });
  }

  async getEmail(userId: string): string {
    // Phase 1-2: Read from OLD
    // Phase 3: Switch to read from NEW
    const source = featureFlag('read-from-new-table')
      ? 'user_profiles'
      : 'users';

    const [row] = await db.query(
      `SELECT email FROM ${source} WHERE ${source === 'users' ? 'id' : 'user_id'} = $1`,
      [userId],
    );

    return row.email;
  }
}
```

### Phase 2: Backfill with Verification

```typescript
async function backfillAndVerify() {
  // Backfill missing records
  await db.query(`
    INSERT INTO user_profiles (user_id, email, name)
    SELECT id, email, name FROM users u
    WHERE NOT EXISTS (
      SELECT 1 FROM user_profiles up WHERE up.user_id = u.id
    )
  `);

  // Verify consistency
  const mismatches = await db.query(`
    SELECT u.id, u.email as old_email, up.email as new_email
    FROM users u
    JOIN user_profiles up ON up.user_id = u.id
    WHERE u.email != up.email
  `);

  if (mismatches.length > 0) {
    console.error(`Found ${mismatches.length} mismatches!`);
    // Fix mismatches before proceeding to Phase 3
  } else {
    console.log('All records consistent — safe to cut over');
  }
}
```

## Cross-System Migration (ETL)

Moving data between different databases or services:

```typescript
// ETL pipeline: PostgreSQL → new service via API
interface ETLConfig {
  source: { query: string; batchSize: number };
  transform: (row: any) => any;
  destination: { url: string; batchSize: number };
  checkpoint: { key: string }; // Resume from last position
}

async function runETL(config: ETLConfig) {
  const lastCheckpoint = await getCheckpoint(config.checkpoint.key);
  let cursor = lastCheckpoint ?? 0;
  let totalMigrated = 0;
  let errors: Array<{ id: string; error: string }> = [];

  while (true) {
    // Extract
    const rows = await sourceDb.query(config.source.query, [
      cursor,
      config.source.batchSize,
    ]);

    if (rows.length === 0) break;

    // Transform
    const transformed = rows.map(config.transform).filter(Boolean);

    // Load (with retry)
    for (const batch of chunk(transformed, config.destination.batchSize)) {
      try {
        await fetch(config.destination.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: batch }),
        });
      } catch (err) {
        errors.push(...batch.map(r => ({
          id: r.id,
          error: err.message,
        })));
      }
    }

    cursor = rows[rows.length - 1].id;
    totalMigrated += transformed.length;

    // Checkpoint for resumability
    await saveCheckpoint(config.checkpoint.key, cursor);
    console.log(`Migrated ${totalMigrated} records (cursor: ${cursor})`);
  }

  return { totalMigrated, errors };
}

// Usage
await runETL({
  source: {
    query: 'SELECT * FROM orders WHERE id > $1 ORDER BY id LIMIT $2',
    batchSize: 500,
  },
  transform: (row) => ({
    id: row.id,
    customerId: row.customer_id,
    total: row.total_cents / 100, // cents → dollars
    createdAt: row.created_at.toISOString(),
  }),
  destination: {
    url: 'https://new-service.internal/api/orders/import',
    batchSize: 100,
  },
  checkpoint: { key: 'orders-migration-v1' },
});
```

## Data Verification

Always verify after migration:

```typescript
async function verifyMigration(sourceTable: string, destTable: string) {
  const checks = {
    // Row count match
    rowCount: await db.query(`
      SELECT
        (SELECT COUNT(*) FROM ${sourceTable}) as source_count,
        (SELECT COUNT(*) FROM ${destTable}) as dest_count
    `),

    // Spot-check random samples
    sampleCheck: await db.query(`
      SELECT s.id,
        s.email as source_email,
        d.email as dest_email,
        s.email = d.email as matches
      FROM ${sourceTable} s
      JOIN ${destTable} d ON d.legacy_id = s.id
      ORDER BY RANDOM()
      LIMIT 100
    `),

    // Check for orphans
    orphans: await db.query(`
      SELECT COUNT(*) as orphan_count
      FROM ${sourceTable} s
      LEFT JOIN ${destTable} d ON d.legacy_id = s.id
      WHERE d.id IS NULL
    `),
  };

  const rowMatch = checks.rowCount[0].source_count === checks.rowCount[0].dest_count;
  const sampleMatch = checks.sampleCheck.every(r => r.matches);
  const noOrphans = checks.orphans[0].orphan_count === 0;

  console.log(`Row count: ${rowMatch ? '✅' : '❌'} (${checks.rowCount[0].source_count} → ${checks.rowCount[0].dest_count})`);
  console.log(`Sample check: ${sampleMatch ? '✅' : '❌'} (100 random rows)`);
  console.log(`No orphans: ${noOrphans ? '✅' : '❌'} (${checks.orphans[0].orphan_count} orphans)`);

  return rowMatch && sampleMatch && noOrphans;
}
```

## Rollback Strategy

```typescript
// Always have a rollback plan
interface MigrationPlan {
  name: string;
  forward: () => Promise<void>;
  verify: () => Promise<boolean>;
  rollback: () => Promise<void>;
}

async function executeMigration(plan: MigrationPlan) {
  console.log(`Starting migration: ${plan.name}`);

  try {
    await plan.forward();

    const valid = await plan.verify();
    if (!valid) {
      console.error('Verification failed — rolling back');
      await plan.rollback();
      throw new Error('Migration verification failed');
    }

    console.log(`Migration ${plan.name} completed and verified ✅`);
  } catch (err) {
    console.error(`Migration failed: ${err.message}`);
    await plan.rollback();
    throw err;
  }
}
```

## Checklist

- [ ] Migration script uses cursor-based pagination (not OFFSET)
- [ ] Batch size tuned (start with 1000, adjust based on DB load)
- [ ] Sleep/throttle between batches to avoid overloading the database
- [ ] Dry-run mode tested before production run
- [ ] Checkpointing for resumability if script fails mid-way
- [ ] Verification query confirms data integrity after migration
- [ ] Rollback plan documented and tested
- [ ] Dual-write period long enough to catch edge cases
- [ ] Monitoring/alerting on error rates during migration
- [ ] Migration runs during low-traffic window
