---
description: When the user asks about vector search, similarity search, nearest neighbor search, ANN algorithms, cosine similarity, distance metrics, re-ranking, or how vector databases work
---

# Vector Search Fundamentals

Core concepts, algorithms, and patterns for similarity search with vector embeddings.

## How Vector Search Works

```
Query Text → Embedding Model → Query Vector → ANN Search → Top-K Results → Re-rank → Response
                                    ↓
                              Vector Index (HNSW, IVF, etc.)
                                    ↓
                              Stored Document Vectors
```

1. Convert query text to a vector using the same embedding model used for documents
2. Search the vector index for the K nearest neighbors
3. Optionally re-rank results using a cross-encoder or other scoring
4. Return the most relevant documents

## Distance Metrics

### Cosine Similarity

Measures the angle between two vectors. **Most common for text embeddings.**

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Range: -1 to 1 (1 = identical, 0 = orthogonal, -1 = opposite)
// Most embedding models produce normalized vectors, so cosine ≈ dot product
```

### Euclidean (L2) Distance

Measures straight-line distance. Sensitive to magnitude.

```typescript
function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

// Range: 0 to ∞ (0 = identical)
// Use when vector magnitude carries meaning
```

### Dot Product

Fast, equivalent to cosine for normalized vectors.

```typescript
function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

// Range: -∞ to ∞ (higher = more similar for normalized vectors)
```

### Which Metric to Use

| Metric | Best For | Notes |
|--------|----------|-------|
| **Cosine** | Text embeddings | Direction matters, magnitude doesn't. Default choice |
| **Euclidean** | Image features, geographic | When absolute distance matters |
| **Dot Product** | Normalized vectors | Fastest, equivalent to cosine if normalized |

## ANN (Approximate Nearest Neighbor) Algorithms

Exact nearest neighbor search is O(n). ANN algorithms trade accuracy for speed.

### HNSW (Hierarchical Navigable Small World)

The most popular algorithm. Used by pgvector, Pinecone, Weaviate, Qdrant.

```
Layer 3: [A] ——————————————— [D]          (few nodes, long links)
Layer 2: [A] ———— [C] ———— [D]
Layer 1: [A] — [B] — [C] — [D] — [E]     (more nodes, shorter links)
Layer 0: [A]-[B]-[C]-[D]-[E]-[F]-[G]-[H]  (all nodes)
```

**How it works:**
1. Start search at the top layer (fewest nodes)
2. Greedily move to the nearest neighbor at each layer
3. Drop to the next layer and continue
4. At layer 0, explore neighbors to find the K nearest

**Parameters:**
- `M` (max connections): Higher = better recall, more memory (default: 16)
- `ef_construction`: Build-time search width (default: 64-200)
- `ef_search`: Query-time search width (default: 40-100)

**Trade-offs:** Best recall, moderate memory usage, moderate build time.

### IVF (Inverted File Index)

Clusters vectors using k-means, then only searches relevant clusters.

**How it works:**
1. Cluster all vectors into `nlist` groups using k-means
2. At query time, find the nearest `nprobe` clusters
3. Search only within those clusters

**Parameters:**
- `nlist`: Number of clusters (try `sqrt(n)`)
- `nprobe`: Number of clusters to search (higher = better recall, slower)

**Trade-offs:** Faster build, less memory, lower recall than HNSW.

### Flat (Brute Force)

Exact search — compare query against every vector.

- **Use when:** < 10,000 vectors, or you need 100% recall
- **Performance:** O(n × d) where n = vectors, d = dimensions

## Filtering Strategies

### Pre-Filtering

Filter metadata BEFORE vector search. Precise but can reduce the effective index.

```sql
-- pgvector: metadata filter + vector search
SELECT * FROM documents
WHERE metadata->>'category' = 'engineering'
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

### Post-Filtering

Run vector search first, then filter. Fast but may return fewer than K results.

```sql
-- Get more candidates, then filter
SELECT * FROM (
  SELECT *, 1 - (embedding <=> $1::vector) AS similarity
  FROM documents
  ORDER BY embedding <=> $1::vector
  LIMIT 100  -- Fetch more than needed
) sub
WHERE sub.metadata->>'category' = 'engineering'
LIMIT 10;
```

### Hybrid (Recommended)

Combine pre-filtering on high-cardinality fields with post-filtering on others:

```sql
-- Pre-filter on partition, post-filter on metadata
SELECT * FROM (
  SELECT *, 1 - (embedding <=> $1::vector) AS similarity
  FROM documents
  WHERE collection = 'knowledge-base'  -- Pre-filter (indexed)
  ORDER BY embedding <=> $1::vector
  LIMIT 50
) sub
WHERE sub.metadata->>'language' = 'en'  -- Post-filter
LIMIT 10;
```

## Re-Ranking

Improve result quality with a second-stage re-ranker.

### Cross-Encoder Re-Ranking

```python
from sentence_transformers import CrossEncoder

# Cross-encoder scores (query, document) pairs
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

# First stage: fast vector search (top 50)
candidates = vector_search(query_embedding, limit=50)

# Second stage: precise re-ranking
pairs = [(query, doc["content"]) for doc in candidates]
scores = reranker.predict(pairs)

# Sort by cross-encoder score
reranked = sorted(
    zip(candidates, scores),
    key=lambda x: x[1],
    reverse=True
)[:10]
```

### Cohere Re-Rank API

```typescript
import { CohereClient } from "cohere-ai";

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

async function rerank(query: string, documents: string[], topN: number = 10) {
  const response = await cohere.rerank({
    model: "rerank-v3.5",
    query,
    documents,
    topN,
  });

  return response.results.map((r) => ({
    index: r.index,
    relevanceScore: r.relevanceScore,
    document: documents[r.index],
  }));
}
```

### Reciprocal Rank Fusion (RRF)

Combine results from multiple retrieval methods:

```typescript
interface RankedResult {
  id: string;
  rank: number;
}

function reciprocalRankFusion(
  resultSets: RankedResult[][],
  k: number = 60
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const results of resultSets) {
    for (const { id, rank } of results) {
      const current = scores.get(id) || 0;
      scores.set(id, current + 1 / (k + rank));
    }
  }

  return scores;
}

// Combine vector search + keyword search
const vectorResults = await vectorSearch(query);
const keywordResults = await keywordSearch(query);
const fused = reciprocalRankFusion([
  vectorResults.map((r, i) => ({ id: r.id, rank: i + 1 })),
  keywordResults.map((r, i) => ({ id: r.id, rank: i + 1 })),
]);
```

## Evaluation Metrics

### Recall@K

What fraction of relevant documents are in the top K results?

```python
def recall_at_k(retrieved_ids: list, relevant_ids: set, k: int) -> float:
    retrieved_k = set(retrieved_ids[:k])
    return len(retrieved_k & relevant_ids) / len(relevant_ids)
```

### NDCG (Normalized Discounted Cumulative Gain)

Measures ranking quality — relevant documents should appear higher.

### MRR (Mean Reciprocal Rank)

Where does the first relevant result appear?

```python
def mrr(retrieved_ids: list, relevant_ids: set) -> float:
    for i, doc_id in enumerate(retrieved_ids):
        if doc_id in relevant_ids:
            return 1.0 / (i + 1)
    return 0.0
```

## Performance Guidelines

| Vector Count | Dimensions | Index | Query Latency |
|-------------|------------|-------|---------------|
| < 10K | Any | Flat (brute force) | < 10ms |
| 10K - 1M | 768-1536 | HNSW | 1-10ms |
| 1M - 100M | 768-1536 | HNSW | 5-50ms |
| > 100M | 768-1536 | IVF + PQ | 10-100ms |

### Dimension Reduction

- OpenAI `text-embedding-3-large`: reduce from 3072 → 1536 or 256 via `dimensions` param
- PCA: reduce dimensions post-hoc (loses some quality)
- Matryoshka embeddings: trained to work at multiple dimension sizes
