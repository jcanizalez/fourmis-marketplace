---
description: When the user asks about Pinecone, Pinecone serverless, Pinecone vector database, managed vector search, or cloud-hosted vector storage
---

# Pinecone Vector Database

Production patterns for Pinecone — managed vector database with serverless and pod-based indexes.

## Setup

### Install SDK

```bash
# Node.js
npm install @pinecone-database/pinecone

# Python
pip install pinecone
```

### Initialize Client

```typescript
import { Pinecone } from "@pinecone-database/pinecone";

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});
```

```python
from pinecone import Pinecone

pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
```

## Create Index

### Serverless (Recommended for most use cases)

```typescript
await pc.createIndex({
  name: "my-index",
  dimension: 1536,
  metric: "cosine",   // "cosine" | "euclidean" | "dotproduct"
  spec: {
    serverless: {
      cloud: "aws",
      region: "us-east-1",
    },
  },
});
```

```python
from pinecone import ServerlessSpec

pc.create_index(
    name="my-index",
    dimension=1536,
    metric="cosine",
    spec=ServerlessSpec(
        cloud="aws",
        region="us-east-1",
    ),
)
```

### Pod-Based (Predictable performance)

```typescript
await pc.createIndex({
  name: "my-index",
  dimension: 1536,
  metric: "cosine",
  spec: {
    pod: {
      environment: "us-east-1-aws",
      podType: "p1.x1",   // p1 = storage optimized, s1 = perf optimized
      pods: 1,
      replicas: 1,
    },
  },
});
```

### Index Types Comparison

| Feature | Serverless | Pod |
|---------|-----------|-----|
| Pricing | Pay per query/storage | Pay per pod/hour |
| Scaling | Auto | Manual (configure pods) |
| Cold start | Possible for idle indexes | None |
| Best for | Variable workloads | Steady, high-throughput |
| Metadata filtering | Full | Full |

## Upsert (Insert/Update Vectors)

### Single Upsert

```typescript
const index = pc.index("my-index");

await index.upsert([
  {
    id: "doc-1",
    values: embedding,   // number[]
    metadata: {
      content: "The quick brown fox...",
      source: "wiki",
      category: "animals",
      createdAt: "2024-01-15",
    },
  },
]);
```

### Batch Upsert

```typescript
// Upsert in batches of 100 (Pinecone limit)
const BATCH_SIZE = 100;

async function batchUpsert(
  index: any,
  records: { id: string; values: number[]; metadata: Record<string, any> }[]
) {
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    await index.upsert(batch);
    console.log(`Upserted ${Math.min(i + BATCH_SIZE, records.length)} / ${records.length}`);
  }
}
```

```python
# Python batch upsert
index = pc.Index("my-index")

def batch_upsert(records, batch_size=100):
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        index.upsert(vectors=batch)

# Records format
records = [
    {"id": "doc-1", "values": embedding, "metadata": {"content": "..."}},
    {"id": "doc-2", "values": embedding, "metadata": {"content": "..."}},
]
batch_upsert(records)
```

## Query (Search)

### Basic Similarity Search

```typescript
const index = pc.index("my-index");

const results = await index.query({
  vector: queryEmbedding,
  topK: 10,
  includeMetadata: true,
  includeValues: false,    // Don't return vectors (saves bandwidth)
});

for (const match of results.matches ?? []) {
  console.log(`Score: ${match.score}, Content: ${match.metadata?.content}`);
}
```

```python
results = index.query(
    vector=query_embedding,
    top_k=10,
    include_metadata=True,
)

for match in results["matches"]:
    print(f"Score: {match['score']}, Content: {match['metadata']['content']}")
```

### Query with Metadata Filtering

```typescript
const results = await index.query({
  vector: queryEmbedding,
  topK: 10,
  includeMetadata: true,
  filter: {
    category: { $eq: "engineering" },
    createdAt: { $gte: "2024-01-01" },
  },
});
```

### Filter Operators

```typescript
// Equality
{ field: { $eq: "value" } }

// Comparison
{ field: { $gt: 10 } }
{ field: { $gte: 10 } }
{ field: { $lt: 100 } }
{ field: { $lte: 100 } }
{ field: { $ne: "excluded" } }

// Set membership
{ field: { $in: ["a", "b", "c"] } }
{ field: { $nin: ["x", "y"] } }

// Existence
{ field: { $exists: true } }

// Logical operators
{ $and: [{ category: { $eq: "tech" } }, { year: { $gte: 2024 } }] }
{ $or: [{ source: { $eq: "wiki" } }, { source: { $eq: "docs" } }] }
```

## Namespaces

Partition data within a single index (like collections):

```typescript
const index = pc.index("my-index");

// Upsert to a namespace
await index.namespace("user-123").upsert([
  { id: "doc-1", values: embedding, metadata: { content: "..." } },
]);

// Query within a namespace
const results = await index.namespace("user-123").query({
  vector: queryEmbedding,
  topK: 10,
  includeMetadata: true,
});

// Delete all vectors in a namespace
await index.namespace("user-123").deleteAll();
```

**Use namespaces for:**
- Per-user data isolation
- Per-tenant separation
- Environment separation (dev/staging/prod in same index)
- Topic/category partitioning

## Delete

```typescript
// Delete by ID
await index.deleteOne("doc-1");

// Delete multiple by ID
await index.deleteMany(["doc-1", "doc-2", "doc-3"]);

// Delete by metadata filter
await index.deleteMany({
  filter: {
    source: { $eq: "old-import" },
  },
});

// Delete all in namespace
await index.namespace("temp").deleteAll();
```

## Index Management

```typescript
// List indexes
const indexes = await pc.listIndexes();

// Describe index
const description = await pc.describeIndex("my-index");
console.log(description.status); // "Ready"
console.log(description.dimension); // 1536

// Index stats
const stats = await pc.index("my-index").describeIndexStats();
console.log(stats.totalRecordCount);
console.log(stats.namespaces);

// Delete index
await pc.deleteIndex("my-index");
```

## Hybrid Search (Sparse + Dense)

Combine keyword matching with semantic search:

```typescript
// Requires a model that produces sparse vectors (e.g., SPLADE, BM25)
const results = await index.query({
  vector: denseEmbedding,         // Semantic (dense)
  sparseVector: {
    indices: [102, 3547, 8921],   // Token IDs
    values: [0.5, 0.8, 0.3],     // Token weights
  },
  topK: 10,
  includeMetadata: true,
});
```

## RAG with Pinecone

```typescript
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const pc = new Pinecone();
const openai = new OpenAI();

async function ragQuery(question: string): Promise<string> {
  // 1. Embed the question
  const embResponse = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: question,
    dimensions: 1536,
  });
  const queryEmbedding = embResponse.data[0].embedding;

  // 2. Search Pinecone
  const index = pc.index("knowledge-base");
  const results = await index.query({
    vector: queryEmbedding,
    topK: 5,
    includeMetadata: true,
  });

  // 3. Build context
  const context = results.matches
    ?.map((m, i) => `[${i + 1}] ${m.metadata?.content}`)
    .join("\n\n") ?? "";

  // 4. Generate answer
  const response = await openai.chat.completions.create({
    model: "claude-sonnet-4-20250514",
    messages: [
      {
        role: "system",
        content: `Answer based on context. Cite using [1], [2], etc.\n\nContext:\n${context}`,
      },
      { role: "user", content: question },
    ],
  });

  return response.choices[0].message.content ?? "";
}
```

## Best Practices

1. **Use serverless** unless you need predictable latency — auto-scales, pay per use
2. **Namespace for multi-tenancy** — cheaper than separate indexes
3. **Batch upserts** in groups of 100 — Pinecone's max batch size
4. **Include content in metadata** — avoids a second DB lookup for RAG
5. **Store metadata wisely** — Pinecone has a 40KB metadata limit per vector
6. **Use filters** to narrow search scope — improves relevance and speed
7. **Don't return values** — set `includeValues: false` to save bandwidth
8. **Monitor index stats** — track total records and namespace distribution
