---
name: rag
description: Set up a RAG pipeline — document chunking, embedding, vector search, and context-augmented generation with proper grounding and citation
allowed-tools: Read, Write, Glob, Grep, Bash
---

# /rag — RAG Pipeline Setup

Set up retrieval-augmented generation for your project.

## Usage

```
/rag                                    # Analyze project and suggest RAG approach
/rag setup                              # Set up a RAG pipeline from scratch
/rag chunk docs/                        # Chunk documents in a directory
/rag evaluate                           # Evaluate retrieval quality
```

## Workflow

### Setup Mode

1. **Analyze content**: Scan the project for documents, markdown, code, data
2. **Choose chunking strategy**: Based on content type (markdown, code, mixed)
3. **Choose embedding model**: text-embedding-3-small, text-embedding-3-large, or local
4. **Choose vector store**: In-memory (small), SQLite with vectors, or external (Pinecone, Qdrant)
5. **Generate pipeline code**: Ingestion, search, and generation modules
6. **Add evaluation**: Test queries with expected results
7. **Output**: Working RAG pipeline with TypeScript/Python code

### Chunk Mode

1. **Read documents**: Load files from the specified directory
2. **Detect content type**: Markdown, code, plain text, JSON
3. **Apply chunking strategy**: Section-based for markdown, function-based for code
4. **Report**: Chunk statistics (count, avg size, overlap)

### Evaluate Mode

1. **Load test queries**: Predefined questions with expected source documents
2. **Run retrieval**: Search for each query
3. **Score**: Recall (did we find the right docs?), precision (are results relevant?)
4. **Report**: Retrieval quality metrics

## Output

```markdown
## RAG Pipeline Setup

### Content Analysis
- Documents: [N] files, [N] total tokens
- Types: [markdown, code, etc.]
- Chunking: [strategy] → [N] chunks

### Architecture
- Embedding: text-embedding-3-small (1536 dims)
- Vector Store: [choice]
- Search: hybrid (vector + keyword)
- Reranking: [yes/no]

### Files Created
- lib/rag/ingest.ts — Document loading and chunking
- lib/rag/search.ts — Vector search with hybrid scoring
- lib/rag/generate.ts — Context-augmented LLM calls
- lib/rag/evaluate.ts — Retrieval quality testing

### Test Results
| Query | Top-1 Relevant | Top-5 Recall | Latency |
|-------|---------------|-------------|---------|
```

## Important

- Chunk size should balance context richness vs search precision (500-1000 chars typical)
- Always include chunk overlap (100-200 chars) to prevent information loss
- Hybrid search (vector + keyword) outperforms pure vector search
- Grounding prompt must instruct the model to ONLY use provided context
- Evaluate retrieval quality separately from generation quality
