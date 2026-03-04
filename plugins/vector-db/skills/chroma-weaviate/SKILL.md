---
description: When the user asks about ChromaDB, Chroma, Weaviate, local vector databases, self-hosted vector search, open-source vector stores, or embedded vector databases
---

# ChromaDB & Weaviate

Production patterns for open-source, self-hosted vector databases.

## ChromaDB

Lightweight, embedded vector database. Great for prototyping and local applications.

### Setup

```bash
# Python
pip install chromadb

# Node.js
npm install chromadb

# Docker (persistent server)
docker run -d --name chroma \
  -p 8000:8000 \
  -v chroma-data:/chroma/chroma \
  chromadb/chroma:latest
```

### Python Usage

```python
import chromadb

# Ephemeral (in-memory)
client = chromadb.Client()

# Persistent (local directory)
client = chromadb.PersistentClient(path="./chroma-data")

# Remote server
client = chromadb.HttpClient(host="localhost", port=8000)
```

### Collections

```python
# Create or get collection
collection = client.get_or_create_collection(
    name="my-docs",
    metadata={
        "hnsw:space": "cosine",      # "cosine" | "l2" | "ip"
        "hnsw:M": 16,
        "hnsw:construction_ef": 100,
    },
)

# List collections
collections = client.list_collections()

# Delete collection
client.delete_collection("my-docs")
```

### Add Documents

```python
# With automatic embedding (Chroma uses all-MiniLM-L6-v2 by default)
collection.add(
    documents=["Document one text", "Document two text", "Document three text"],
    metadatas=[
        {"source": "wiki", "category": "science"},
        {"source": "blog", "category": "tech"},
        {"source": "docs", "category": "science"},
    ],
    ids=["doc-1", "doc-2", "doc-3"],
)

# With pre-computed embeddings
collection.add(
    embeddings=[[0.1, 0.2, ...], [0.3, 0.4, ...], [0.5, 0.6, ...]],
    documents=["Doc one", "Doc two", "Doc three"],
    metadatas=[{"source": "wiki"}, {"source": "blog"}, {"source": "docs"}],
    ids=["doc-1", "doc-2", "doc-3"],
)
```

### Query

```python
# Query with text (auto-embeds)
results = collection.query(
    query_texts=["What is machine learning?"],
    n_results=5,
    include=["documents", "metadatas", "distances"],
)

print(results["documents"][0])    # List of matching documents
print(results["distances"][0])    # List of distances
print(results["metadatas"][0])    # List of metadata dicts

# Query with embedding
results = collection.query(
    query_embeddings=[query_embedding],
    n_results=5,
)

# Query with metadata filter
results = collection.query(
    query_texts=["machine learning"],
    n_results=5,
    where={"category": "science"},
)

# Complex filters
results = collection.query(
    query_texts=["AI"],
    n_results=10,
    where={
        "$and": [
            {"category": {"$eq": "tech"}},
            {"year": {"$gte": 2024}},
        ]
    },
    where_document={"$contains": "neural"},  # Full-text filter on documents
)
```

### Update and Delete

```python
# Update documents
collection.update(
    ids=["doc-1"],
    documents=["Updated content"],
    metadatas=[{"source": "wiki", "updated": True}],
)

# Upsert (insert or update)
collection.upsert(
    ids=["doc-1", "doc-4"],
    documents=["Updated doc 1", "New doc 4"],
    metadatas=[{"source": "wiki"}, {"source": "new"}],
)

# Delete by ID
collection.delete(ids=["doc-1", "doc-2"])

# Delete by filter
collection.delete(where={"category": "outdated"})
```

### Custom Embedding Function

```python
from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction

# Use OpenAI embeddings
openai_ef = OpenAIEmbeddingFunction(
    api_key=os.environ["OPENAI_API_KEY"],
    model_name="text-embedding-3-large",
)

collection = client.get_or_create_collection(
    name="my-docs",
    embedding_function=openai_ef,
)
```

### Node.js Usage

```typescript
import { ChromaClient, OpenAIEmbeddingFunction } from "chromadb";

const client = new ChromaClient({ path: "http://localhost:8000" });

const embedder = new OpenAIEmbeddingFunction({
  openai_api_key: process.env.OPENAI_API_KEY!,
  openai_model: "text-embedding-3-large",
});

const collection = await client.getOrCreateCollection({
  name: "my-docs",
  embeddingFunction: embedder,
});

// Add documents
await collection.add({
  ids: ["doc-1", "doc-2"],
  documents: ["First document", "Second document"],
  metadatas: [{ source: "wiki" }, { source: "blog" }],
});

// Query
const results = await collection.query({
  queryTexts: ["search query"],
  nResults: 5,
});
```

## Weaviate

Full-featured vector database with GraphQL API, modules, and multi-tenancy.

### Setup

```bash
# Docker Compose
cat > docker-compose.yml << 'YAML'
version: '3.4'
services:
  weaviate:
    image: cr.weaviate.io/semitechnologies/weaviate:1.27.0
    restart: on-failure
    ports:
      - "8080:8080"
      - "50051:50051"
    environment:
      QUERY_DEFAULTS_LIMIT: 25
      AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: 'true'
      PERSISTENCE_DATA_PATH: '/var/lib/weaviate'
      DEFAULT_VECTORIZER_MODULE: 'none'
      ENABLE_API_BASED_MODULES: 'true'
      CLUSTER_HOSTNAME: 'node1'
    volumes:
      - weaviate-data:/var/lib/weaviate

volumes:
  weaviate-data:
YAML

docker compose up -d
```

```bash
# Python client
pip install weaviate-client

# Node.js client
npm install weaviate-client
```

### Python Client v4

```python
import weaviate
from weaviate.classes.config import Configure, Property, DataType
from weaviate.classes.query import MetadataQuery

# Connect
client = weaviate.connect_to_local()  # localhost:8080

# Or cloud
# client = weaviate.connect_to_weaviate_cloud(
#     cluster_url="https://xxx.weaviate.network",
#     auth_credentials=weaviate.auth.AuthApiKey("your-key"),
# )
```

### Define Collection (Schema)

```python
# Create collection with explicit schema
collection = client.collections.create(
    name="Document",
    vectorizer_config=Configure.Vectorizer.none(),  # We provide our own vectors
    properties=[
        Property(name="content", data_type=DataType.TEXT),
        Property(name="source", data_type=DataType.TEXT),
        Property(name="category", data_type=DataType.TEXT),
        Property(name="created_at", data_type=DataType.DATE),
    ],
)

# With auto-vectorizer (OpenAI module)
collection = client.collections.create(
    name="Document",
    vectorizer_config=Configure.Vectorizer.text2vec_openai(
        model="text-embedding-3-large",
        dimensions=1536,
    ),
    properties=[
        Property(name="content", data_type=DataType.TEXT),
        Property(name="source", data_type=DataType.TEXT),
    ],
)
```

### Insert Data

```python
collection = client.collections.get("Document")

# Single insert
uuid = collection.data.insert(
    properties={
        "content": "Vector databases store embeddings...",
        "source": "wiki",
        "category": "tech",
    },
    vector=embedding,  # Your pre-computed vector
)

# Batch insert
with collection.batch.dynamic() as batch:
    for doc in documents:
        batch.add_object(
            properties={
                "content": doc["content"],
                "source": doc["source"],
            },
            vector=doc["embedding"],
        )
```

### Query

```python
collection = client.collections.get("Document")

# Nearest neighbor search
results = collection.query.near_vector(
    near_vector=query_embedding,
    limit=10,
    return_metadata=MetadataQuery(distance=True),
)

for obj in results.objects:
    print(f"Content: {obj.properties['content']}")
    print(f"Distance: {obj.metadata.distance}")

# With text (if vectorizer configured)
results = collection.query.near_text(
    query="machine learning concepts",
    limit=10,
)

# With filters
from weaviate.classes.query import Filter

results = collection.query.near_vector(
    near_vector=query_embedding,
    limit=10,
    filters=Filter.by_property("category").equal("tech"),
)

# Complex filters
results = collection.query.near_vector(
    near_vector=query_embedding,
    limit=10,
    filters=(
        Filter.by_property("category").equal("tech") &
        Filter.by_property("source").not_equal("outdated")
    ),
)
```

### Hybrid Search

```python
# Combine BM25 keyword + vector search (built-in!)
results = collection.query.hybrid(
    query="machine learning",
    alpha=0.5,   # 0 = pure keyword, 1 = pure vector
    limit=10,
)

# With filters
results = collection.query.hybrid(
    query="neural networks",
    alpha=0.7,
    limit=10,
    filters=Filter.by_property("category").equal("tech"),
)
```

### Multi-Tenancy

```python
# Enable multi-tenancy on collection
collection = client.collections.create(
    name="Document",
    multi_tenancy_config=Configure.multi_tenancy(enabled=True),
    properties=[
        Property(name="content", data_type=DataType.TEXT),
    ],
)

# Add tenants
collection.tenants.create([
    weaviate.classes.tenants.Tenant(name="tenant-a"),
    weaviate.classes.tenants.Tenant(name="tenant-b"),
])

# Insert data for a tenant
tenant_collection = collection.with_tenant("tenant-a")
tenant_collection.data.insert(
    properties={"content": "Tenant A's document"},
    vector=embedding,
)

# Query within a tenant
results = tenant_collection.query.near_vector(
    near_vector=query_embedding,
    limit=10,
)
```

### Node.js Usage

```typescript
import weaviate from "weaviate-client";

const client = await weaviate.connectToLocal();

// Create collection
const collection = await client.collections.create({
  name: "Document",
  properties: [
    { name: "content", dataType: "text" },
    { name: "source", dataType: "text" },
  ],
});

// Insert
const docCollection = client.collections.get("Document");
await docCollection.data.insert({
  properties: { content: "Hello world", source: "wiki" },
  vectors: embedding,
});

// Query
const results = await docCollection.query.nearVector(queryEmbedding, {
  limit: 10,
  returnMetadata: ["distance"],
});
```

## Comparison

| Feature | ChromaDB | Weaviate | pgvector |
|---------|----------|----------|----------|
| **Type** | Embedded/Server | Server | PostgreSQL extension |
| **Language** | Python (primary) | Go | SQL |
| **Setup** | pip install | Docker | `CREATE EXTENSION` |
| **Built-in embeddings** | Yes (default model) | Yes (modules) | No |
| **Hybrid search** | Text filter only | BM25 + vector | Full-text + vector |
| **Multi-tenancy** | Collections | Built-in | Schemas/RLS |
| **Scale** | Small-medium | Large | Medium-large |
| **Best for** | Prototyping, local | Production, multi-tenant | Existing Postgres stack |
| **Filtering** | Metadata filters | Rich filters | Full SQL |

## When to Use What

- **ChromaDB**: Prototyping, local RAG, small datasets (< 1M vectors), Python-first
- **Weaviate**: Production multi-tenant, hybrid search, module ecosystem, large scale
- **pgvector**: Already using PostgreSQL, want SQL joins + vector, don't want another service
- **Pinecone**: Fully managed, zero ops, serverless scaling, enterprise support
