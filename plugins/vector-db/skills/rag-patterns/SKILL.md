---
description: When the user asks about RAG, retrieval-augmented generation, context retrieval, grounding LLMs with documents, citation, multi-step retrieval, or building a knowledge base chatbot
---

# RAG (Retrieval-Augmented Generation) Patterns

Production patterns for building retrieval-augmented generation systems.

## RAG Architecture

```
User Query
    │
    ▼
┌─────────────────┐
│  Query Processing │  ← Rewrite, expand, decompose
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│   Retriever     │────▶│  Vector DB   │
│                 │     │  (pgvector,  │
│  embed query,   │     │   Pinecone)  │
│  search, filter │     └──────────────┘
└────────┬────────┘
         │ Top-K documents
         ▼
┌─────────────────┐
│  Re-Ranker      │  ← Cross-encoder, Cohere rerank
└────────┬────────┘
         │ Re-ranked docs
         ▼
┌─────────────────┐
│  LLM Generator  │  ← Prompt with context + query
│                 │
│  "Based on the  │
│   following..." │
└────────┬────────┘
         │
         ▼
    Answer + Citations
```

## Basic RAG Pipeline

### TypeScript Implementation

```typescript
import OpenAI from "openai";

const openai = new OpenAI();

interface Document {
  id: string;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
}

class RAGPipeline {
  // Step 1: Embed the query
  private async embedQuery(query: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: query,
      dimensions: 1536,
    });
    return response.data[0].embedding;
  }

  // Step 2: Retrieve relevant documents
  private async retrieve(queryEmbedding: number[], limit: number = 5): Promise<Document[]> {
    const { rows } = await db.query(
      `SELECT id, content, metadata,
              1 - (embedding <=> $1::vector) AS similarity
       FROM documents
       WHERE 1 - (embedding <=> $1::vector) > 0.5
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [pgvector.toSql(queryEmbedding), limit]
    );
    return rows;
  }

  // Step 3: Generate answer with context
  private async generate(query: string, documents: Document[]): Promise<string> {
    const context = documents
      .map((doc, i) => `[${i + 1}] ${doc.content}`)
      .join("\n\n");

    const response = await openai.chat.completions.create({
      model: "claude-sonnet-4-20250514",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant. Answer the user's question based ONLY on the provided context. If the context doesn't contain enough information, say so. Always cite your sources using [1], [2], etc.

Context:
${context}`,
        },
        { role: "user", content: query },
      ],
      temperature: 0.1,
    });

    return response.choices[0].message.content ?? "";
  }

  // Full pipeline
  async query(userQuery: string): Promise<{ answer: string; sources: Document[] }> {
    const embedding = await this.embedQuery(userQuery);
    const documents = await this.retrieve(embedding);
    const answer = await this.generate(userQuery, documents);
    return { answer, sources: documents };
  }
}
```

### Python Implementation

```python
from openai import OpenAI
import psycopg2
from pgvector.psycopg2 import register_vector

client = OpenAI()

class RAGPipeline:
    def __init__(self, db_url: str):
        self.conn = psycopg2.connect(db_url)
        register_vector(self.conn)

    def embed_query(self, query: str) -> list[float]:
        response = client.embeddings.create(
            model="text-embedding-3-large",
            input=query,
            dimensions=1536,
        )
        return response.data[0].embedding

    def retrieve(self, query_embedding: list[float], limit: int = 5) -> list[dict]:
        cur = self.conn.cursor()
        cur.execute("""
            SELECT id, content, metadata,
                   1 - (embedding <=> %s::vector) AS similarity
            FROM documents
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """, (query_embedding, query_embedding, limit))

        columns = ["id", "content", "metadata", "similarity"]
        return [dict(zip(columns, row)) for row in cur.fetchall()]

    def generate(self, query: str, documents: list[dict]) -> str:
        context = "\n\n".join(
            f"[{i+1}] {doc['content']}"
            for i, doc in enumerate(documents)
        )

        response = client.chat.completions.create(
            model="claude-sonnet-4-20250514",
            messages=[
                {"role": "system", "content": f"""Answer based ONLY on the provided context.
Cite sources using [1], [2], etc.

Context:
{context}"""},
                {"role": "user", "content": query},
            ],
            temperature=0.1,
        )
        return response.choices[0].message.content

    def query(self, user_query: str) -> dict:
        embedding = self.embed_query(user_query)
        documents = self.retrieve(embedding)
        answer = self.generate(user_query, documents)
        return {"answer": answer, "sources": documents}
```

## Advanced RAG Patterns

### Query Rewriting

Improve retrieval by rewriting the user's query:

```typescript
async function rewriteQuery(query: string): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: "claude-sonnet-4-20250514",
    messages: [
      {
        role: "system",
        content: `Generate 3 different search queries that would help answer the user's question.
Return ONLY the queries, one per line. No numbering or bullets.`,
      },
      { role: "user", content: query },
    ],
    temperature: 0.7,
  });

  return response.choices[0].message.content?.split("\n").filter(Boolean) ?? [query];
}

// Use multiple queries for better recall
async function multiQueryRetrieve(query: string): Promise<Document[]> {
  const queries = await rewriteQuery(query);
  const allDocs = new Map<string, Document>();

  for (const q of queries) {
    const embedding = await embedQuery(q);
    const docs = await retrieve(embedding, 5);
    for (const doc of docs) {
      if (!allDocs.has(doc.id) || doc.similarity > allDocs.get(doc.id)!.similarity) {
        allDocs.set(doc.id, doc);
      }
    }
  }

  return [...allDocs.values()].sort((a, b) => b.similarity - a.similarity);
}
```

### HyDE (Hypothetical Document Embeddings)

Generate a hypothetical answer, embed it, and search with that:

```typescript
async function hydeRetrieve(query: string): Promise<Document[]> {
  // Generate a hypothetical answer
  const response = await openai.chat.completions.create({
    model: "claude-sonnet-4-20250514",
    messages: [
      {
        role: "system",
        content: "Write a short, factual paragraph answering this question. Write as if you know the answer.",
      },
      { role: "user", content: query },
    ],
    temperature: 0.5,
  });

  const hypotheticalAnswer = response.choices[0].message.content ?? query;

  // Embed the hypothetical answer (not the query)
  const embedding = await embedQuery(hypotheticalAnswer);
  return retrieve(embedding, 10);
}
```

### Multi-Step Retrieval (Follow-Up)

For complex questions that need multiple retrieval rounds:

```typescript
async function multiStepRAG(query: string): Promise<string> {
  // Step 1: Initial retrieval
  const embedding = await embedQuery(query);
  const initialDocs = await retrieve(embedding, 5);
  const initialContext = initialDocs.map((d) => d.content).join("\n");

  // Step 2: Generate follow-up questions
  const followUpResponse = await openai.chat.completions.create({
    model: "claude-sonnet-4-20250514",
    messages: [
      {
        role: "system",
        content: `Based on the initial context, what additional information is needed to fully answer the question? Generate 1-2 follow-up search queries.

Context: ${initialContext}`,
      },
      { role: "user", content: query },
    ],
  });

  const followUps = followUpResponse.choices[0].message.content?.split("\n").filter(Boolean) ?? [];

  // Step 3: Retrieve follow-up documents
  const allDocs = [...initialDocs];
  for (const followUp of followUps.slice(0, 2)) {
    const fEmbed = await embedQuery(followUp);
    const fDocs = await retrieve(fEmbed, 3);
    allDocs.push(...fDocs);
  }

  // Step 4: Deduplicate and generate final answer
  const uniqueDocs = [...new Map(allDocs.map((d) => [d.id, d])).values()];
  return generate(query, uniqueDocs);
}
```

### Parent Document Retrieval

Store chunks for search but return the full parent document:

```typescript
async function parentDocRetrieval(query: string): Promise<Document[]> {
  // Search chunks
  const embedding = await embedQuery(query);
  const chunks = await db.query(
    `SELECT c.document_id, c.content, c.chunk_index,
            1 - (c.embedding <=> $1::vector) AS similarity
     FROM chunks c
     ORDER BY c.embedding <=> $1::vector
     LIMIT 10`,
    [pgvector.toSql(embedding)]
  );

  // Get unique parent document IDs
  const parentIds = [...new Set(chunks.rows.map((c: any) => c.document_id))];

  // Fetch full parent documents
  const parents = await db.query(
    `SELECT d.id, d.content, d.metadata
     FROM documents d
     WHERE d.id = ANY($1)`,
    [parentIds]
  );

  return parents.rows;
}
```

## Prompt Engineering for RAG

### System Prompt Template

```
You are a helpful assistant. Answer the user's question based on the provided context documents.

## Rules
1. ONLY use information from the provided context
2. If the context doesn't contain enough information, say: "I don't have enough information to answer this question."
3. Cite your sources using [1], [2], etc.
4. Be concise and direct
5. If multiple sources agree, synthesize them
6. If sources conflict, mention the discrepancy

## Context Documents
{context}
```

### Citation Format

```typescript
// Include source metadata for citations
const context = documents.map((doc, i) => {
  const source = doc.metadata.source || doc.metadata.url || `Document ${doc.id}`;
  return `[${i + 1}] (Source: ${source})\n${doc.content}`;
}).join("\n\n---\n\n");
```

## Ingestion Pipeline

### Document Processing

```typescript
interface IngestionPipeline {
  // 1. Load documents from various sources
  load(source: string): Promise<RawDocument[]>;
  // 2. Clean and preprocess text
  preprocess(doc: RawDocument): string;
  // 3. Chunk into smaller pieces
  chunk(text: string): string[];
  // 4. Generate embeddings
  embed(chunks: string[]): Promise<number[][]>;
  // 5. Store in vector database
  store(chunks: string[], embeddings: number[][], metadata: any): Promise<void>;
}

async function ingestDocument(filePath: string, metadata: Record<string, any>) {
  // 1. Read file
  const content = await readFile(filePath, "utf-8");

  // 2. Clean text
  const cleaned = content
    .replace(/\s+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // 3. Chunk
  const chunks = recursiveSplit(cleaned, 1000);

  // 4. Embed (batch)
  const embeddings = await embedBatch(chunks);

  // 5. Store
  for (let i = 0; i < chunks.length; i++) {
    await db.query(
      `INSERT INTO chunks (document_id, chunk_index, content, embedding, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [metadata.documentId, i, chunks[i], pgvector.toSql(embeddings[i]), metadata]
    );
  }
}
```

## RAG Evaluation

### Key Metrics

| Metric | What It Measures | How |
|--------|-----------------|-----|
| **Retrieval Precision** | Are retrieved docs relevant? | Manual labeling or LLM judge |
| **Retrieval Recall** | Are all relevant docs found? | Compare against gold set |
| **Answer Faithfulness** | Is the answer grounded in context? | LLM judge: "Is this claim in the context?" |
| **Answer Relevance** | Does the answer address the question? | LLM judge or human eval |
| **Hallucination Rate** | How often does it make things up? | Check claims against context |

### Simple LLM-as-Judge

```typescript
async function evaluateFaithfulness(answer: string, context: string): Promise<number> {
  const response = await openai.chat.completions.create({
    model: "claude-sonnet-4-20250514",
    messages: [
      {
        role: "system",
        content: `Score the faithfulness of the answer on a scale of 1-5.
5 = Every claim in the answer is supported by the context
1 = The answer contains many claims not in the context

Context: ${context}

Answer: ${answer}

Return ONLY a number 1-5.`,
      },
    ],
  });

  return parseInt(response.choices[0].message.content ?? "3");
}
```

## Best Practices

1. **Chunk size matters** — 200-500 tokens per chunk is usually optimal for RAG
2. **Add overlap** — 10-20% overlap prevents losing context at boundaries
3. **Use hybrid search** — combine vector + keyword for better recall
4. **Re-rank** — a cross-encoder or Cohere rerank significantly improves relevance
5. **Include metadata** — store source, date, author for filtering and citation
6. **Evaluate regularly** — build a test set and measure retrieval + generation quality
7. **Handle no-results** — if similarity is too low, say "I don't know" instead of hallucinating
8. **Cache embeddings** — don't re-embed queries you've seen before
9. **Update incrementally** — add/remove documents without rebuilding the entire index
10. **Monitor** — track query latency, retrieval quality, and LLM costs
