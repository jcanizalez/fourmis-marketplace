---
description: When the user asks about text embeddings, embedding models, OpenAI embeddings, Cohere embed, sentence transformers, chunking strategies, token counting, or converting text to vectors
---

# Embedding Models

Production patterns for generating, managing, and optimizing text embeddings.

## Embedding Model Comparison

| Model | Dimensions | Max Tokens | Cost | Quality | Use Case |
|-------|-----------|------------|------|---------|----------|
| OpenAI `text-embedding-3-large` | 3072 (or 256-3072) | 8191 | $0.13/1M tokens | Excellent | Production RAG |
| OpenAI `text-embedding-3-small` | 1536 (or 256-1536) | 8191 | $0.02/1M tokens | Good | Cost-effective |
| Cohere `embed-v4.0` | 1024 | 512 | $0.10/1M tokens | Excellent | Multilingual |
| Voyage AI `voyage-3` | 1024 | 32000 | $0.06/1M tokens | Excellent | Long documents |
| `all-MiniLM-L6-v2` | 384 | 256 | Free (local) | Good | Local/offline |
| `nomic-embed-text` | 768 | 8192 | Free (Ollama) | Good | Local with Ollama |
| `bge-large-en-v1.5` | 1024 | 512 | Free (local) | Very Good | Local high quality |

## OpenAI Embeddings

### Node.js / TypeScript

```typescript
import OpenAI from "openai";

const openai = new OpenAI();

// Single text embedding
async function embed(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: text,
    dimensions: 1536, // Optional: reduce dimensions for cost/speed
  });
  return response.data[0].embedding;
}

// Batch embedding (up to 2048 inputs)
async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: texts,
    dimensions: 1536,
  });
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

// Usage
const embedding = await embed("What is vector search?");
console.log(`Dimensions: ${embedding.length}`); // 1536
```

### Python

```python
from openai import OpenAI

client = OpenAI()

def embed(text: str, model: str = "text-embedding-3-large") -> list[float]:
    response = client.embeddings.create(
        model=model,
        input=text,
        dimensions=1536,
    )
    return response.data[0].embedding

def embed_batch(texts: list[str], model: str = "text-embedding-3-large") -> list[list[float]]:
    response = client.embeddings.create(
        model=model,
        input=texts,
        dimensions=1536,
    )
    return [d.embedding for d in sorted(response.data, key=lambda d: d.index)]
```

## Local Embeddings (No API Key)

### Ollama

```bash
# Install and pull model
ollama pull nomic-embed-text
```

```typescript
// Node.js with Ollama
async function embedLocal(text: string): Promise<number[]> {
  const response = await fetch("http://localhost:11434/api/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nomic-embed-text",
      prompt: text,
    }),
  });
  const data = await response.json();
  return data.embedding;
}
```

### Python with Sentence Transformers

```python
from sentence_transformers import SentenceTransformer

# Load model (downloads on first use, ~90MB for MiniLM)
model = SentenceTransformer("all-MiniLM-L6-v2")

# Single embedding
embedding = model.encode("What is vector search?")
print(f"Dimensions: {len(embedding)}")  # 384

# Batch embedding (much faster than one-by-one)
texts = ["First document", "Second document", "Third document"]
embeddings = model.encode(texts, batch_size=32, show_progress_bar=True)
print(f"Shape: {embeddings.shape}")  # (3, 384)

# Normalize for cosine similarity
embeddings = model.encode(texts, normalize_embeddings=True)
```

### Python with Fastembed (Lightweight)

```python
from fastembed import TextEmbedding

model = TextEmbedding("BAAI/bge-small-en-v1.5")

# Returns generator — list() to materialize
embeddings = list(model.embed(["Hello world", "Vector search"]))
print(f"Dimensions: {len(embeddings[0])}")  # 384
```

## Chunking Strategies

### Fixed-Size Chunking

```typescript
interface ChunkOptions {
  chunkSize: number;    // characters per chunk
  chunkOverlap: number; // overlap between chunks
}

function chunkText(text: string, options: ChunkOptions): string[] {
  const { chunkSize, chunkOverlap } = options;
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - chunkOverlap;
  }

  return chunks;
}

// Typical settings for RAG
const chunks = chunkText(document, {
  chunkSize: 1000,      // ~250 tokens
  chunkOverlap: 200,    // 20% overlap
});
```

### Recursive Text Splitting (LangChain-style)

```typescript
function recursiveSplit(
  text: string,
  maxSize: number,
  separators: string[] = ["\n\n", "\n", ". ", " ", ""]
): string[] {
  if (text.length <= maxSize) return [text];

  const separator = separators[0];
  const nextSeparators = separators.slice(1);
  const parts = text.split(separator);
  const chunks: string[] = [];
  let current = "";

  for (const part of parts) {
    const candidate = current ? current + separator + part : part;
    if (candidate.length > maxSize && current) {
      chunks.push(current);
      current = part;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);

  // Recursively split chunks that are still too large
  return chunks.flatMap((chunk) =>
    chunk.length > maxSize && nextSeparators.length > 0
      ? recursiveSplit(chunk, maxSize, nextSeparators)
      : [chunk]
  );
}
```

### Semantic Chunking

Split by meaning, not character count:

```python
from sentence_transformers import SentenceTransformer
import numpy as np

def semantic_chunk(text: str, threshold: float = 0.5) -> list[str]:
    """Split text into semantically coherent chunks."""
    model = SentenceTransformer("all-MiniLM-L6-v2")

    # Split into sentences
    sentences = text.split(". ")
    embeddings = model.encode(sentences)

    chunks = []
    current_chunk = [sentences[0]]

    for i in range(1, len(sentences)):
        # Cosine similarity between consecutive sentences
        sim = np.dot(embeddings[i], embeddings[i-1]) / (
            np.linalg.norm(embeddings[i]) * np.linalg.norm(embeddings[i-1])
        )

        if sim < threshold:
            # Low similarity = topic change = new chunk
            chunks.append(". ".join(current_chunk))
            current_chunk = [sentences[i]]
        else:
            current_chunk.append(sentences[i])

    if current_chunk:
        chunks.append(". ".join(current_chunk))

    return chunks
```

### Markdown/Code-Aware Chunking

```typescript
function chunkMarkdown(markdown: string, maxSize: number = 1000): string[] {
  // Split by headings first
  const sections = markdown.split(/(?=^#{1,3} )/m);
  const chunks: string[] = [];

  for (const section of sections) {
    if (section.length <= maxSize) {
      chunks.push(section.trim());
    } else {
      // Fall back to paragraph splitting within large sections
      const paragraphs = section.split("\n\n");
      let current = "";
      for (const p of paragraphs) {
        if ((current + "\n\n" + p).length > maxSize && current) {
          chunks.push(current.trim());
          current = p;
        } else {
          current = current ? current + "\n\n" + p : p;
        }
      }
      if (current) chunks.push(current.trim());
    }
  }

  return chunks.filter((c) => c.length > 0);
}
```

## Token Counting

### With tiktoken (OpenAI models)

```python
import tiktoken

# For embedding models
enc = tiktoken.encoding_for_model("text-embedding-3-large")

text = "How many tokens is this sentence?"
tokens = enc.encode(text)
print(f"Token count: {len(tokens)}")  # ~7

# Truncate to max tokens
def truncate_to_tokens(text: str, max_tokens: int = 8191) -> str:
    tokens = enc.encode(text)
    if len(tokens) <= max_tokens:
        return text
    return enc.decode(tokens[:max_tokens])
```

### With js-tiktoken (Node.js)

```typescript
import { encoding_for_model } from "js-tiktoken";

const enc = encoding_for_model("text-embedding-3-large");

function countTokens(text: string): number {
  return enc.encode(text).length;
}

function truncateToTokens(text: string, maxTokens: number = 8191): string {
  const tokens = enc.encode(text);
  if (tokens.length <= maxTokens) return text;
  return new TextDecoder().decode(enc.decode(tokens.slice(0, maxTokens)));
}
```

### Rule of Thumb

- English: ~4 characters per token, ~0.75 words per token
- 1000 characters ≈ 250 tokens
- 1 page of text ≈ 500-800 tokens

## Embedding Best Practices

1. **Chunk size**: 200-500 tokens for RAG (smaller chunks = more precise retrieval)
2. **Overlap**: 10-20% overlap prevents losing context at boundaries
3. **Batch embed**: Always batch — much faster and cheaper than one-by-one
4. **Normalize**: Normalize vectors if using cosine similarity (most models do this)
5. **Reduce dimensions**: Use `dimensions` parameter (OpenAI) to trade quality for speed/cost
6. **Prefix queries**: Some models (like `nomic-embed-text`) need prefixes: `"search_query: ..."` vs `"search_document: ..."`
7. **Cache embeddings**: Store computed embeddings — don't re-embed unchanged documents
8. **Test on your data**: Benchmark different models on your actual queries and documents
