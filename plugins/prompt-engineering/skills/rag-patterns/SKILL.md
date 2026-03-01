---
description: When the user asks about RAG, retrieval-augmented generation, vector search with LLMs, embeddings, context injection, knowledge bases, semantic search, grounding LLM responses, or reducing hallucination with retrieved context
---

# RAG Patterns

Retrieval-Augmented Generation (RAG) grounds LLM responses in actual data by retrieving relevant documents and injecting them as context. This eliminates hallucination and keeps responses up-to-date without retraining.

## RAG Architecture

```
User Query
    ↓
┌──────────┐     ┌──────────────┐     ┌──────────┐
│  Embed   │ ──→ │ Vector Store │ ──→ │ Retrieve │
│  Query   │     │  (search)    │     │ Top K    │
└──────────┘     └──────────────┘     └──────────┘
                                            ↓
                                     ┌──────────────┐
                                     │ Rerank       │ (optional)
                                     │ (relevance)  │
                                     └──────────────┘
                                            ↓
┌──────────────────────────────────────────────┐
│            LLM Prompt                         │
│  System: You are a helpful assistant.         │
│  Context: [retrieved documents]               │
│  User: [original query]                       │
│  Rules: Only use provided context.            │
└──────────────────────────────────────────────┘
                    ↓
              LLM Response
            (grounded in data)
```

## Basic RAG Implementation

### Step 1: Document Ingestion

```typescript
import { OpenAI } from 'openai';

const openai = new OpenAI();

interface Document {
  id: string;
  content: string;
  metadata: {
    source: string;
    title: string;
    chunk_index: number;
  };
  embedding?: number[];
}

// Chunk documents into manageable pieces
function chunkText(text: string, maxChars: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChars;

    // Try to break at a sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > start + maxChars / 2) {
        end = breakPoint + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap; // Overlap for continuity
  }

  return chunks.filter(c => c.length > 50); // Skip tiny fragments
}

// Generate embeddings
async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });
  return response.data.map(d => d.embedding);
}
```

### Step 2: Vector Search

```typescript
// Cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Simple in-memory vector search
function searchDocuments(
  queryEmbedding: number[],
  documents: Document[],
  topK: number = 5,
  minScore: number = 0.7
): (Document & { score: number })[] {
  return documents
    .map(doc => ({
      ...doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding!),
    }))
    .filter(doc => doc.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
```

### Step 3: Context-Augmented Generation

```typescript
async function ragQuery(query: string, documents: Document[]): Promise<string> {
  // 1. Embed the query
  const [queryEmbedding] = await embedTexts([query]);

  // 2. Retrieve relevant documents
  const results = searchDocuments(queryEmbedding, documents, 5);

  // 3. Build context
  const context = results
    .map((doc, i) => `[Source ${i + 1}: ${doc.metadata.title}]\n${doc.content}`)
    .join('\n\n---\n\n');

  // 4. Generate with context
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant that answers questions based on the provided context.

## Rules
- ONLY use information from the provided context to answer
- If the context doesn't contain the answer, say "I don't have information about that in the available documents"
- Cite sources using [Source N] notation
- Be concise and direct`,
      },
      {
        role: 'user',
        content: `## Context\n${context}\n\n## Question\n${query}`,
      },
    ],
  });

  return response.choices[0].message.content!;
}
```

## Chunking Strategies

| Strategy | Best For | Chunk Size |
|----------|----------|------------|
| **Fixed size** | General text | 500-1000 chars |
| **Sentence boundary** | Articles, docs | 3-5 sentences |
| **Paragraph** | Well-structured docs | 1-3 paragraphs |
| **Recursive (headers)** | Markdown, HTML docs | Section-based |
| **Semantic** | Mixed content | Embedding similarity |
| **Code-aware** | Source code | Function/class level |

### Markdown-Aware Chunking

```typescript
function chunkMarkdown(markdown: string): { content: string; heading: string }[] {
  const chunks: { content: string; heading: string }[] = [];
  const sections = markdown.split(/^(#{1,3}\s.+)$/gm);

  let currentHeading = '';
  let currentContent = '';

  for (const section of sections) {
    if (section.match(/^#{1,3}\s/)) {
      if (currentContent.trim()) {
        chunks.push({ heading: currentHeading, content: currentContent.trim() });
      }
      currentHeading = section.trim();
      currentContent = '';
    } else {
      currentContent += section;
    }
  }

  if (currentContent.trim()) {
    chunks.push({ heading: currentHeading, content: currentContent.trim() });
  }

  return chunks;
}
```

### Code-Aware Chunking

```typescript
function chunkCode(code: string, language: string): string[] {
  // Split by function/class definitions
  const patterns: Record<string, RegExp> = {
    typescript: /^(?:export\s+)?(?:async\s+)?(?:function|class|interface|type|const\s+\w+\s*=\s*(?:\(|async))/gm,
    python: /^(?:def|class|async def)\s/gm,
    go: /^func\s/gm,
  };

  const pattern = patterns[language];
  if (!pattern) return [code]; // Fallback to whole file

  const matches = [...code.matchAll(pattern)];
  if (matches.length === 0) return [code];

  const chunks: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!;
    const end = i + 1 < matches.length ? matches[i + 1].index! : code.length;
    chunks.push(code.slice(start, end).trim());
  }

  return chunks.filter(c => c.length > 20);
}
```

## Advanced RAG Patterns

### Hybrid Search (Vector + Keyword)

```typescript
function hybridSearch(
  query: string,
  queryEmbedding: number[],
  documents: Document[],
  topK: number = 5,
  alpha: number = 0.7 // Weight for vector vs keyword (0.7 = 70% vector)
): Document[] {
  // Vector scores
  const vectorScores = new Map<string, number>();
  documents.forEach(doc => {
    vectorScores.set(doc.id, cosineSimilarity(queryEmbedding, doc.embedding!));
  });

  // Keyword scores (BM25-like)
  const queryTerms = query.toLowerCase().split(/\s+/);
  const keywordScores = new Map<string, number>();
  documents.forEach(doc => {
    const content = doc.content.toLowerCase();
    const score = queryTerms.reduce((sum, term) => {
      const count = (content.match(new RegExp(term, 'g')) || []).length;
      return sum + (count > 0 ? 1 + Math.log(count) : 0);
    }, 0) / queryTerms.length;
    keywordScores.set(doc.id, score);
  });

  // Combine with reciprocal rank fusion
  return documents
    .map(doc => ({
      ...doc,
      score: alpha * (vectorScores.get(doc.id) ?? 0) +
             (1 - alpha) * (keywordScores.get(doc.id) ?? 0),
    }))
    .sort((a, b) => (b as any).score - (a as any).score)
    .slice(0, topK);
}
```

### Query Expansion

Reformulate the query for better retrieval:

```typescript
async function expandQuery(query: string): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `Generate 3 alternative phrasings of this search query.
Return only the queries, one per line.

Query: "${query}"`,
    }],
  });

  const alternatives = response.choices[0].message.content!.split('\n').filter(Boolean);
  return [query, ...alternatives]; // Original + expansions
}

// Search with all expanded queries, deduplicate and merge results
```

### Contextual Compression

After retrieval, extract only the relevant parts:

```typescript
async function compressContext(query: string, documents: string[]): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'system',
      content: 'Extract ONLY the sentences from the provided documents that are relevant to answering the question. Remove all irrelevant content. Preserve source attribution.',
    }, {
      role: 'user',
      content: `Question: ${query}\n\nDocuments:\n${documents.join('\n\n---\n\n')}`,
    }],
  });

  return response.choices[0].message.content!;
}
```

## RAG Prompt Patterns

### Grounding Pattern

```
Answer the question based ONLY on the provided context.

Context:
{retrieved_documents}

Question: {user_query}

Rules:
- If the context contains the answer, provide it with [Source] citations
- If the context does NOT contain the answer, say "I don't have information about that"
- Do NOT use any knowledge outside the provided context
- Quote relevant passages when helpful
```

### Conversational RAG

```
You are a knowledge base assistant. Use the context to answer questions.

Previous conversation:
{chat_history}

Retrieved context (based on the latest question):
{retrieved_documents}

Current question: {user_query}

If the answer requires information from both the context and the conversation
history, combine them. Always cite context sources.
```

## Evaluation Metrics

| Metric | What It Measures | How to Check |
|--------|------------------|-------------|
| **Retrieval Recall** | % of relevant docs retrieved | Manual annotation on test set |
| **Retrieval Precision** | % of retrieved docs that are relevant | Check top-K relevance |
| **Answer Faithfulness** | Does the answer stick to the context? | LLM-as-judge: "Is this grounded?" |
| **Answer Relevance** | Does the answer address the question? | LLM-as-judge: "Does this answer the question?" |
| **Hallucination Rate** | Claims not supported by context | Compare answer claims to source docs |

## Checklist

- [ ] Documents chunked appropriately for the content type
- [ ] Chunk overlap prevents information loss at boundaries
- [ ] Embedding model matches retrieval needs (speed vs quality)
- [ ] Top-K retrieval returns relevant documents (test with sample queries)
- [ ] RAG prompt instructs model to ONLY use provided context
- [ ] "I don't know" response when context lacks the answer
- [ ] Source citations included in responses
- [ ] Hybrid search (vector + keyword) used for better recall
- [ ] Context window budget managed (don't overflow with too many chunks)
- [ ] Evaluation metrics tracked on a test set
