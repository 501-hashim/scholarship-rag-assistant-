# Scholarship RAG Architecture

```mermaid
flowchart TD
    UI[React 19 Workspace] --> API[Django REST API and validation]
    API --> Domain[Local semantic domain and intent check]
    Domain -->|Unrelated| Redirect[Scholarship-only guidance: zero LLM calls]
    Domain -->|Relevant| Query[Query extraction & conversation context]
    Corpus[Curated JSON dataset] --> Chunks[Section-aware chunks]
    Chunks --> Embeddings[Embedding Model]
    Embeddings --> VectorDB[Qdrant Vector Database]
    Query --> Retriever[Section-aware semantic retrieval]
    VectorDB --> Retriever
    Retriever --> Context[Deduplicated bounded evidence and recent history]
    Context --> LLM[Local Qwen3:4b LLM Generation]
    LLM --> Checks[Schema, contiguous quote & numeric validation]
    Checks --> Review[Selective semantic grounding review]
    Review --> Response[Verified answer and authenticated sources]
    Response --> UI
    UI --> Detail[View Full Scheme detail route]
    Redirect --> UI
    API --> SQL[Sessions, metadata, audit & usage: MySQL / SQLite]
```

RAG serves as the deterministic factual engine: JSON -> embeddings / vector retrieval -> bounded context -> LLM -> verified answer & sources. Domain gates prevent off-topic generation, while verbatim quote validators and numeric checks eliminate hallucinations.
