---
description: When the user asks about pgvector, PostgreSQL vector search, vector columns in Postgres, HNSW index, IVFFlat index, similarity search in SQL, or using Postgres as a vector database
---

# pgvector — PostgreSQL Vector Search

Production patterns for using PostgreSQL as a vector database with the pgvector extension.

## Setup

### Install pgvector

```bash
# Docker (easiest)
docker run -d --name pgvector \
  -e POSTGRES_PASSWORD=secret \
  -p 5432:5432 \
  pgvector/pgvector:pg16

# Or add to existing PostgreSQL
# Ubuntu/Debian
sudo apt install postgresql-16-pgvector

# macOS
brew install pgvector
```

### Enable Extension

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify
SELECT * FROM pg_extension WHERE extname = 'vector';
```

## Schema Design

### Basic Vector Table

```sql
CREATE TABLE documents (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  content     TEXT NOT NULL,
  embedding   vector(1536) NOT NULL,  -- Match your model's dimensions
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Add a source/collection column for multi-tenant or multi-collection use
CREATE TABLE documents (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  collection  TEXT NOT NULL DEFAULT 'default',
  content     TEXT NOT NULL,
  embedding   vector(1536) NOT NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### With Chunking Metadata

```sql
CREATE TABLE chunks (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id   BIGINT REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index   INT NOT NULL,
  content       TEXT NOT NULL,
  embedding     vector(1536) NOT NULL,
  token_count   INT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(document_id, chunk_index)
);

CREATE TABLE documents (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title       TEXT,
  source_url  TEXT,
  file_path   TEXT,
  total_chunks INT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

## Indexing

### HNSW Index (Recommended)

Hierarchical Navigable Small World — best for most use cases. Faster queries, slower builds.

```sql
-- Cosine distance (most common for normalized embeddings)
CREATE INDEX ON documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- L2 (Euclidean) distance
CREATE INDEX ON documents
USING hnsw (embedding vector_l2_ops)
WITH (m = 16, ef_construction = 64);

-- Inner product (for dot product similarity)
CREATE INDEX ON documents
USING hnsw (embedding vector_ip_ops)
WITH (m = 16, ef_construction = 64);
```

**HNSW Parameters:**
| Parameter | Default | Description |
|-----------|---------|-------------|
| `m` | 16 | Max connections per node. Higher = better recall, more memory |
| `ef_construction` | 64 | Build-time search width. Higher = better index, slower build |

**Query-time parameter:**
```sql
-- Increase for better recall (default: 40)
SET hnsw.ef_search = 100;
```

### IVFFlat Index (Faster Builds)

Inverted File with Flat compression. Faster to build, slightly lower recall.

```sql
-- Need enough data first (recommended: > 1000 rows)
CREATE INDEX ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);  -- sqrt(num_rows) is a good starting point
```

**IVFFlat Parameters:**
| Parameter | Description |
|-----------|-------------|
| `lists` | Number of clusters. Use `sqrt(rows)` for < 1M rows, `sqrt(rows)/10` for > 1M |

**Query-time parameter:**
```sql
-- Number of lists to search (default: 1, higher = better recall)
SET ivfflat.probes = 10;
```

### When to Use Which

| | HNSW | IVFFlat |
|---|------|---------|
| Query speed | Faster | Slower |
| Build speed | Slower | Faster |
| Recall | Better | Good |
| Memory | More | Less |
| Recommendation | **Default choice** | Large datasets, frequent rebuilds |

## Similarity Search

### Basic Nearest Neighbor

```sql
-- Cosine similarity (most common)
SELECT id, content, metadata,
       1 - (embedding <=> $1::vector) AS similarity
FROM documents
ORDER BY embedding <=> $1::vector
LIMIT 10;

-- L2 (Euclidean) distance
SELECT id, content,
       embedding <-> $1::vector AS distance
FROM documents
ORDER BY embedding <-> $1::vector
LIMIT 10;

-- Inner product (negative for ORDER BY to work)
SELECT id, content,
       (embedding <#> $1::vector) * -1 AS similarity
FROM documents
ORDER BY embedding <#> $1::vector
LIMIT 10;
```

### Distance Operators

| Operator | Distance | Use With |
|----------|----------|----------|
| `<=>` | Cosine | Normalized embeddings (most models) |
| `<->` | L2 (Euclidean) | When magnitude matters |
| `<#>` | Inner product (negative) | Dot product similarity |

### With Metadata Filtering

```sql
-- Filter by metadata before vector search
SELECT id, content,
       1 - (embedding <=> $1::vector) AS similarity
FROM documents
WHERE metadata->>'category' = 'technical'
  AND metadata->>'language' = 'en'
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY embedding <=> $1::vector
LIMIT 10;

-- Filter by collection
SELECT id, content,
       1 - (embedding <=> $1::vector) AS similarity
FROM chunks
WHERE collection = 'knowledge-base'
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

### With Similarity Threshold

```sql
-- Only return results above a similarity threshold
SELECT id, content,
       1 - (embedding <=> $1::vector) AS similarity
FROM documents
WHERE 1 - (embedding <=> $1::vector) > 0.7  -- Minimum 70% similarity
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

## Hybrid Search (Vector + Full-Text)

Combine vector similarity with PostgreSQL's built-in full-text search:

```sql
-- Add tsvector column
ALTER TABLE documents ADD COLUMN tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX ON documents USING gin(tsv);

-- Hybrid search with RRF (Reciprocal Rank Fusion)
WITH vector_results AS (
  SELECT id, content,
         ROW_NUMBER() OVER (ORDER BY embedding <=> $1::vector) AS vector_rank
  FROM documents
  ORDER BY embedding <=> $1::vector
  LIMIT 20
),
text_results AS (
  SELECT id, content,
         ROW_NUMBER() OVER (ORDER BY ts_rank(tsv, plainto_tsquery('english', $2)) DESC) AS text_rank
  FROM documents
  WHERE tsv @@ plainto_tsquery('english', $2)
  LIMIT 20
)
SELECT COALESCE(v.id, t.id) AS id,
       COALESCE(v.content, t.content) AS content,
       COALESCE(1.0 / (60 + v.vector_rank), 0) +
       COALESCE(1.0 / (60 + t.text_rank), 0) AS rrf_score
FROM vector_results v
FULL OUTER JOIN text_results t ON v.id = t.id
ORDER BY rrf_score DESC
LIMIT 10;
```

## Node.js / TypeScript Usage

### With Drizzle ORM

```typescript
import { pgTable, bigint, text, vector, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const documents = pgTable("documents", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  embeddingIdx: index("embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
}));

// Search
import { cosineDistance, gt, desc } from "drizzle-orm";

const results = await db
  .select({
    id: documents.id,
    content: documents.content,
    similarity: sql<number>`1 - (${cosineDistance(documents.embedding, queryEmbedding)})`,
  })
  .from(documents)
  .where(gt(sql`1 - (${cosineDistance(documents.embedding, queryEmbedding)})`, 0.7))
  .orderBy(cosineDistance(documents.embedding, queryEmbedding))
  .limit(10);
```

### With Prisma (via raw SQL)

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Prisma doesn't natively support vector — use raw queries
async function search(queryEmbedding: number[], limit: number = 10) {
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  return prisma.$queryRaw`
    SELECT id, content, metadata,
           1 - (embedding <=> ${embeddingStr}::vector) AS similarity
    FROM documents
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `;
}
```

### With pg (node-postgres)

```typescript
import pg from "pg";
import pgvector from "pgvector/pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Register pgvector type
await pgvector.registerType(pool);

async function upsertDocument(content: string, embedding: number[], metadata: Record<string, any>) {
  await pool.query(
    `INSERT INTO documents (content, embedding, metadata)
     VALUES ($1, $2, $3)`,
    [content, pgvector.toSql(embedding), JSON.stringify(metadata)]
  );
}

async function search(queryEmbedding: number[], limit: number = 10) {
  const { rows } = await pool.query(
    `SELECT id, content, metadata,
            1 - (embedding <=> $1::vector) AS similarity
     FROM documents
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [pgvector.toSql(queryEmbedding), limit]
  );
  return rows;
}
```

## Python Usage

```python
import psycopg2
from pgvector.psycopg2 import register_vector

conn = psycopg2.connect("postgresql://localhost/mydb")
register_vector(conn)

# Insert
cur = conn.cursor()
cur.execute(
    "INSERT INTO documents (content, embedding) VALUES (%s, %s)",
    ("Hello world", embedding)
)
conn.commit()

# Search
cur.execute(
    """SELECT id, content, 1 - (embedding <=> %s::vector) AS similarity
       FROM documents
       ORDER BY embedding <=> %s::vector
       LIMIT 10""",
    (query_embedding, query_embedding)
)
results = cur.fetchall()
```

## Performance Tuning

```sql
-- Check index usage
EXPLAIN ANALYZE
SELECT id, content
FROM documents
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 10;

-- Increase shared_buffers for large indexes
-- postgresql.conf:
-- shared_buffers = '2GB'
-- effective_cache_size = '6GB'
-- maintenance_work_mem = '1GB'  -- for index builds

-- Increase ef_search for better recall (tradeoff: slower queries)
SET hnsw.ef_search = 200;

-- Increase probes for IVFFlat
SET ivfflat.probes = 20;

-- Vacuum and analyze after bulk inserts
VACUUM ANALYZE documents;
```

## Best Practices

1. **Use HNSW over IVFFlat** for most use cases — better recall and query speed
2. **Match dimensions** between your embedding model and vector column
3. **Use cosine distance** (`<=>`) for normalized embeddings (OpenAI, most models)
4. **Create partial indexes** for filtered searches: `CREATE INDEX ... WHERE collection = 'x'`
5. **Batch inserts** — use `COPY` or multi-row `INSERT` for bulk loading
6. **Monitor index size** — HNSW indexes can be large; ensure enough RAM
7. **Set `ef_search`** appropriately — 40 (default) for speed, 100-200 for recall
8. **Use hybrid search** — combine vector + full-text for best results
