---
name: vector-audit
description: Audit a vector search or RAG implementation for performance, quality, and best practices
arguments:
  - name: focus
    description: "Focus area: embeddings, retrieval, rag, all (default: all)"
    required: false
---

# Vector Search & RAG Audit

Audit the project's vector search or RAG implementation for correctness, performance, and best practices.

## Audit Steps

### 1. Identify Vector Components

Scan the project for vector-related code:

```bash
# Find vector DB usage
grep -rn "pgvector\|pinecone\|chromadb\|chroma\|weaviate\|qdrant\|milvus" --include="*.ts" --include="*.py" --include="*.js" -l | grep -v node_modules

# Find embedding calls
grep -rn "embeddings.create\|embed(\|encode(\|text-embedding\|embed-v" --include="*.ts" --include="*.py" --include="*.js" -l | grep -v node_modules

# Find vector schema/migrations
grep -rn "vector(\|VECTOR\|vector_cosine\|hnsw\|ivfflat" --include="*.sql" --include="*.ts" --include="*.py" -l | grep -v node_modules

# Find RAG patterns
grep -rn "similarity\|nearest\|topK\|top_k\|n_results\|retrieve\|retriev" --include="*.ts" --include="*.py" --include="*.js" -l | grep -v node_modules
```

### 2. Embedding Audit

Check embedding configuration:

- [ ] **Model specified** — not using a default/unknown model
- [ ] **Dimensions match** — embedding model dimensions match vector column/index
- [ ] **Same model for queries and documents** — must be identical
- [ ] **Token limits respected** — text truncated before embedding call
- [ ] **Batch embedding used** — not embedding one-by-one in a loop
- [ ] **Embeddings cached** — not re-embedding unchanged documents

### 3. Chunking Audit

- [ ] **Chunk size appropriate** — 200-500 tokens for RAG
- [ ] **Overlap configured** — 10-20% prevents context loss at boundaries
- [ ] **Chunks include metadata** — source, page, section tracked
- [ ] **No empty chunks** — whitespace/empty strings filtered out
- [ ] **Content preserved** — no important content lost during splitting

### 4. Indexing Audit

- [ ] **Index exists** — vector column has an HNSW or IVFFlat index (pgvector)
- [ ] **Correct distance metric** — cosine for normalized embeddings
- [ ] **Index parameters tuned** — HNSW M=16, ef_construction=64+
- [ ] **ef_search/probes set** — query-time accuracy parameter configured
- [ ] **Index covers queries** — partial indexes for filtered searches
- [ ] **Vacuum after bulk insert** — `VACUUM ANALYZE` run after loading

### 5. Retrieval Quality Audit

- [ ] **Similarity threshold** — low-confidence results filtered out
- [ ] **Top-K reasonable** — not retrieving too few (< 3) or too many (> 20)
- [ ] **Re-ranking used** — cross-encoder or Cohere rerank for precision
- [ ] **Hybrid search considered** — vector + keyword for better recall
- [ ] **Metadata filtering** — narrowing search scope when applicable
- [ ] **Error handling** — graceful handling when no results found

### 6. RAG Generation Audit

- [ ] **System prompt grounded** — instructs LLM to use only provided context
- [ ] **Citations required** — prompt asks for source references
- [ ] **No-answer handling** — graceful response when context is insufficient
- [ ] **Context size managed** — total context fits within model's window
- [ ] **Temperature appropriate** — low temperature (0-0.3) for factual RAG
- [ ] **Prompt injection mitigation** — user input separated from context

### 7. Generate Report

```markdown
## Vector Search Audit Report

### Summary
- Score: X/10
- Critical: N | Warning: N | Info: N

### Embedding Configuration
- Model: [detected model]
- Dimensions: [detected]
- Chunking: [method, size, overlap]

### Index Configuration
- Database: [pgvector/Pinecone/Chroma/Weaviate]
- Index type: [HNSW/IVFFlat/none]
- Distance metric: [cosine/l2/ip]

### Issues Found
(prioritized list)

### Recommendations
(actionable improvements)
```
