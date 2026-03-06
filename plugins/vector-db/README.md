# 🔧 vector-db

> Vector database and RAG patterns — embedding models (OpenAI text-embedding-3, Cohere, Voyage AI, sentence-transformers, Ollama local models, chunking strategies, token counting), pgvector (PostgreSQL extension setup, HNSW/IVFFlat indexes, cosine/L2/IP similarity search, hybrid search with full-text, metadata filtering, Drizzle/Prisma/node-postgres usage), vector search fundamentals (distance metrics, ANN algorithms, filtering strategies, cross-encoder re-ranking, Cohere rerank, Reciprocal Rank Fusion, evaluation metrics), RAG patterns (retrieval-augmented generation pipelines, query rewriting, HyDE, multi-step retrieval, parent document retrieval, context assembly, citation, ingestion pipelines, LLM-as-judge evaluation), Pinecone (serverless/pod indexes, batch upsert, metadata filtering, namespaces, hybrid search, index management), and ChromaDB/Weaviate (local embedded DB, collections, custom embedding functions, Weaviate schema, hybrid BM25+vector search, multi-tenancy).

**Category:** Development | **6 skills** | **3 commands** | **1 agent**

## Install

```bash
claude plugin add --from https://github.com/jcanizalez/fourmis-marketplace/plugins/vector-db
```

## Overview

Vector database and RAG patterns — embedding models (OpenAI text-embedding-3, Cohere, Voyage AI, sentence-transformers, Ollama local models, chunking strategies, token counting), pgvector (PostgreSQL extension setup, HNSW/IVFFlat indexes, cosine/L2/IP similarity search, hybrid search with full-text, metadata filtering, Drizzle/Prisma/node-postgres usage), vector search fundamentals (distance metrics, ANN algorithms, filtering strategies, cross-encoder re-ranking, Cohere rerank, Reciprocal Rank Fusion, evaluation metrics), RAG patterns (retrieval-augmented generation pipelines, query rewriting, HyDE, multi-step retrieval, parent document retrieval, context assembly, citation, ingestion pipelines, LLM-as-judge evaluation), Pinecone (serverless/pod indexes, batch upsert, metadata filtering, namespaces, hybrid search, index management), and ChromaDB/Weaviate (local embedded DB, collections, custom embedding functions, Weaviate schema, hybrid BM25+vector search, multi-tenancy). 6 skills, 3 commands, 1 agent. No dependencies.

## Skills

| Skill | Activates when... |
|-------|-------------------|
| `chroma-weaviate` | When the user asks about ChromaDB |
| `embedding-models` | When the user asks about text embeddings |
| `pgvector` | When the user asks about pgvector |
| `pinecone` | When the user asks about Pinecone |
| `rag-patterns` | When the user asks about RAG, retrieval-augmented generation |
| `vector-search` | When the user asks about vector search |

## Commands

| Command | Description |
|---------|-------------|
| `/embedding-benchmark` | Benchmark embedding models for quality, speed, and cost on your data |
| `/rag-setup` | Scaffold a complete RAG pipeline with vector database, embeddings, and retrieval |
| `/vector-audit` | Audit a vector search or RAG implementation for performance, quality, and best practices |

## Agents

### vector-expert
Vector database and RAG expert that helps design, implement, and optimize embedding pipelines, vector search, and retrieval-augmented generation

---

Part of the [Fourmis Marketplace](https://jcanizalez.github.io/fourmis-marketplace/) — open-source plugins for Claude Code.
