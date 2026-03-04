---
name: rag-setup
description: Scaffold a complete RAG pipeline with vector database, embeddings, and retrieval
arguments:
  - name: database
    description: "Vector database to use: pgvector, pinecone, chroma, weaviate (default: pgvector)"
    required: false
  - name: language
    description: "Programming language: typescript, python (default: typescript)"
    required: false
---

# Scaffold RAG Pipeline

Generate a complete, production-ready RAG (Retrieval-Augmented Generation) pipeline.

## Instructions

Based on the specified database and language, generate a full RAG setup.

### 1. Assess Project

- Check existing dependencies (package.json / requirements.txt / pyproject.toml)
- Determine if a vector DB is already configured
- Check for existing embedding or LLM integration
- Match the project's code style and patterns

### 2. Generate Components

Create the following files/modules:

#### Embedding Service
- Initialize embedding model (OpenAI text-embedding-3-large by default)
- Batch embedding function
- Token counting and text truncation
- Caching layer for repeated queries

#### Chunking Module
- Recursive text splitter (markdown/code-aware)
- Configurable chunk size and overlap
- Metadata preservation (source, index, total chunks)

#### Vector Database Setup
- **pgvector**: SQL migration, index creation, search function
- **Pinecone**: Index creation, upsert helpers, query function
- **Chroma**: Collection setup, custom embedding function
- **Weaviate**: Schema definition, batch import, query

#### Retrieval Service
- Similarity search with configurable top-K
- Metadata filtering support
- Hybrid search (vector + keyword) where supported
- Re-ranking integration (optional Cohere rerank)
- Similarity threshold filtering

#### RAG Pipeline
- Query processing (clean, expand)
- Context assembly with citations
- LLM generation with grounded system prompt
- Source attribution in responses
- Error handling for no-results and low-confidence

#### Ingestion Pipeline
- Document loader (file, URL, text)
- Preprocessing (clean, normalize)
- Chunk → embed → store pipeline
- Incremental updates (add/remove documents)

### 3. Configuration

Generate a configuration file:

```typescript
// rag.config.ts
export const ragConfig = {
  embedding: {
    model: "text-embedding-3-large",
    dimensions: 1536,
    batchSize: 100,
  },
  chunking: {
    chunkSize: 1000,    // characters
    chunkOverlap: 200,
    separators: ["\n\n", "\n", ". ", " "],
  },
  retrieval: {
    topK: 5,
    similarityThreshold: 0.5,
    includeMetadata: true,
  },
  generation: {
    model: "claude-sonnet-4-20250514",
    temperature: 0.1,
    maxTokens: 2048,
  },
};
```

### 4. Output Summary

After generating all files:
- List files created
- Show required environment variables (API keys)
- Provide example usage code
- Include commands to install dependencies
- Note any database setup steps needed (migrations, index creation)
