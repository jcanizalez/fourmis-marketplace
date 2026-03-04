---
name: embedding-benchmark
description: Benchmark embedding models for quality, speed, and cost on your data
arguments:
  - name: dataset
    description: "Path to a file or directory with documents to benchmark"
    required: false
---

# Embedding Model Benchmark

Compare embedding models on your actual data to find the best fit for your use case.

## Instructions

### 1. Prepare Test Data

If a dataset path is provided, use those documents. Otherwise, prompt the user for:
- Sample documents (at least 10-20)
- Sample queries (at least 5-10)
- Known relevant document-query pairs (for measuring retrieval quality)

Generate a benchmark script:

### 2. Benchmark Script (TypeScript)

```typescript
import OpenAI from "openai";

const openai = new OpenAI();

interface BenchmarkResult {
  model: string;
  dimensions: number;
  avgEmbedTimeMs: number;
  totalCost: number;
  avgSimilarity: number;     // Between known relevant pairs
  avgIrrelevantSim: number;  // Between known irrelevant pairs
  separation: number;        // relevant - irrelevant (higher = better)
}

const MODELS = [
  { name: "text-embedding-3-large", dims: 3072, costPer1M: 0.13 },
  { name: "text-embedding-3-large", dims: 1536, costPer1M: 0.13 },
  { name: "text-embedding-3-small", dims: 1536, costPer1M: 0.02 },
  { name: "text-embedding-3-small", dims: 512, costPer1M: 0.02 },
];

async function benchmark(
  documents: string[],
  queries: string[],
  relevantPairs: [number, number][], // [queryIdx, docIdx]
): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];

  for (const model of MODELS) {
    console.log(`\nBenchmarking ${model.name} (${model.dims}d)...`);

    // Embed documents
    const docStart = Date.now();
    const docResponse = await openai.embeddings.create({
      model: model.name,
      input: documents,
      dimensions: model.dims,
    });
    const docTime = Date.now() - docStart;
    const docEmbeddings = docResponse.data.map(d => d.embedding);

    // Embed queries
    const queryStart = Date.now();
    const queryResponse = await openai.embeddings.create({
      model: model.name,
      input: queries,
      dimensions: model.dims,
    });
    const queryTime = Date.now() - queryStart;
    const queryEmbeddings = queryResponse.data.map(d => d.embedding);

    // Calculate similarities for relevant pairs
    const relevantSims = relevantPairs.map(([qi, di]) =>
      cosineSimilarity(queryEmbeddings[qi], docEmbeddings[di])
    );

    // Calculate similarities for random irrelevant pairs
    const irrelevantSims: number[] = [];
    for (let i = 0; i < relevantPairs.length; i++) {
      const qi = relevantPairs[i][0];
      let di: number;
      do { di = Math.floor(Math.random() * documents.length); }
      while (relevantPairs.some(([q, d]) => q === qi && d === di));
      irrelevantSims.push(cosineSimilarity(queryEmbeddings[qi], docEmbeddings[di]));
    }

    const totalTokens = docResponse.usage.total_tokens + queryResponse.usage.total_tokens;

    results.push({
      model: `${model.name} (${model.dims}d)`,
      dimensions: model.dims,
      avgEmbedTimeMs: (docTime + queryTime) / (documents.length + queries.length),
      totalCost: (totalTokens / 1_000_000) * model.costPer1M,
      avgSimilarity: avg(relevantSims),
      avgIrrelevantSim: avg(irrelevantSims),
      separation: avg(relevantSims) - avg(irrelevantSims),
    });
  }

  return results;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
```

### 3. Metrics to Report

Generate a comparison table:

```markdown
## Embedding Benchmark Results

| Model | Dims | Avg Time | Cost/1M | Relevant Sim | Irrelevant Sim | Separation |
|-------|------|----------|---------|-------------|----------------|------------|
| text-embedding-3-large | 3072 | 45ms | $0.13 | 0.85 | 0.42 | 0.43 |
| text-embedding-3-large | 1536 | 38ms | $0.13 | 0.83 | 0.40 | 0.43 |
| text-embedding-3-small | 1536 | 32ms | $0.02 | 0.78 | 0.38 | 0.40 |
| text-embedding-3-small | 512  | 28ms | $0.02 | 0.72 | 0.35 | 0.37 |

### Recommendation
Based on your data:
- **Best quality**: [model] — highest separation between relevant and irrelevant
- **Best value**: [model] — best quality per dollar
- **Best speed**: [model] — fastest embedding time
```

### 4. Additional Benchmarks

If the user wants a thorough comparison:

- **Local models**: Test all-MiniLM-L6-v2, nomic-embed-text, bge-large via Ollama
- **Chunk size impact**: Test 200, 500, 1000 token chunks with the chosen model
- **Index performance**: Compare HNSW vs IVFFlat query latency (if using pgvector)
- **Re-ranking impact**: Measure recall@10 with and without cross-encoder re-ranking

### 5. Save Results

Write benchmark results to a file for reference and future comparison.
