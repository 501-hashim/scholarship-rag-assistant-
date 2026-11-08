"""Replaceable vector interface; Qdrant vector database with metadata filtering and atomic versioning."""

import hashlib
import json
import os
import uuid
from abc import ABC, abstractmethod
from pathlib import Path

import numpy as np

from core.rag.documents import Chunk


class VectorStore(ABC):
    def close(self):
        """Release underlying connections or storage handles if applicable."""

    @abstractmethod
    def search(
        self, query: np.ndarray, top_k: int, filters: dict | None = None
    ) -> list[tuple[Chunk, float]]:
        """Search only documents satisfying the scheme/section metadata filter."""

    @abstractmethod
    def save(self, directory: Path, metadata: dict):
        """Persist a complete version and atomically switch the current pointer."""


class QdrantVectorStore(VectorStore):
    """Qdrant-backed vector store supporting embedded local disk, remote server, or in-memory mode."""

    def __init__(
        self,
        vectors: np.ndarray,
        chunks: list[Chunk],
        client=None,
        collection_name: str = "scholarships",
        storage_path: Path | None = None,
    ):
        from qdrant_client import QdrantClient, models

        self.vectors = np.ascontiguousarray(vectors, dtype="float32")
        if len(chunks) != len(vectors) or not len(chunks):
            raise ValueError("Embedding count must match nonempty chunk count.")
        self.chunks = chunks
        self.collection_name = collection_name
        self.dimension = self.vectors.shape[1]

        if client is not None:
            self.client = client
        elif os.getenv("QDRANT_URL"):
            self.client = QdrantClient(
                url=os.getenv("QDRANT_URL"),
                api_key=os.getenv("QDRANT_API_KEY") or None,
            )
        elif storage_path is not None:
            self.client = QdrantClient(path=str(storage_path))
        else:
            self.client = QdrantClient(":memory:")

        # Initialize collection and points
        if not self.client.collection_exists(self.collection_name):
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(size=self.dimension, distance=models.Distance.COSINE),
            )

        points = [
            models.PointStruct(
                id=i + 1,
                vector=self.vectors[i].tolist(),
                payload=c.to_dict(),
            )
            for i, c in enumerate(self.chunks)
        ]
        self.client.upsert(collection_name=self.collection_name, points=points)

    def close(self):
        if hasattr(self, "client") and self.client is not None:
            try:
                self.client.close()
            except Exception:
                pass

    def __del__(self):
        self.close()

    def search(
        self, query: np.ndarray, top_k: int, filters: dict | None = None
    ) -> list[tuple[Chunk, float]]:
        from qdrant_client import models

        if top_k < 1:
            raise ValueError("top_k must be positive.")

        if filters:
            for v in filters.values():
                if isinstance(v, (list, tuple, set)) and len(v) == 0:
                    return []

        conditions = []
        if filters:
            for key, val in filters.items():
                if isinstance(val, (list, tuple, set)):
                    conditions.append(models.FieldCondition(key=key, match=models.MatchAny(any=list(val))))
                else:
                    conditions.append(models.FieldCondition(key=key, match=models.MatchValue(value=val)))

        query_filter = models.Filter(must=conditions) if conditions else None
        query_vector = np.ascontiguousarray(query, dtype="float32").flatten().tolist()

        response = self.client.query_points(
            collection_name=self.collection_name,
            query=query_vector,
            query_filter=query_filter,
            limit=top_k,
        )
        return [
            (Chunk(**p.payload), float(p.score))
            for p in response.points
            if p.payload is not None and p.score is not None
        ]

    def save(self, directory: Path, metadata: dict):
        directory.mkdir(parents=True, exist_ok=True)
        version = uuid.uuid4().hex
        target = directory / version
        target.mkdir()

        chunks_path = target / "chunks.json"
        chunks_path.write_text(json.dumps([c.to_dict() for c in self.chunks]), encoding="utf-8")

        vectors_path = target / "vectors.npy"
        np.save(str(vectors_path), self.vectors)

        qdrant_dir = target / "qdrant_db"
        from qdrant_client import QdrantClient, models

        disk_client = QdrantClient(path=str(qdrant_dir))
        disk_client.create_collection(
            collection_name=self.collection_name,
            vectors_config=models.VectorParams(size=self.dimension, distance=models.Distance.COSINE),
        )
        disk_client.upsert(
            collection_name=self.collection_name,
            points=[
                models.PointStruct(id=i + 1, vector=self.vectors[i].tolist(), payload=c.to_dict())
                for i, c in enumerate(self.chunks)
            ],
        )
        disk_client.close()

        faiss_sha256 = ""
        try:
            import faiss

            index = faiss.IndexFlatIP(self.dimension)
            index.add(self.vectors)
            faiss.write_index(index, str(target / "vectors.faiss"))
            faiss_sha256 = hashlib.sha256((target / "vectors.faiss").read_bytes()).hexdigest()
        except ImportError:
            pass

        metadata = dict(
            metadata,
            engine="qdrant",
            chunks_sha256=hashlib.sha256(chunks_path.read_bytes()).hexdigest(),
            vectors_sha256=hashlib.sha256(vectors_path.read_bytes()).hexdigest(),
            index_sha256=faiss_sha256,
            chunk_count=len(self.chunks),
            dimension=self.dimension,
        )
        (target / "metadata.json").write_text(json.dumps(metadata), encoding="utf-8")
        pointer = directory / (version + ".tmp")
        pointer.write_text(version, encoding="utf-8")
        os.replace(pointer, directory / "CURRENT")

    @classmethod
    def load(cls, directory: Path):
        version = (directory / "CURRENT").read_text(encoding="utf-8").strip()
        if len(version) != 32 or any(c not in "0123456789abcdef" for c in version):
            raise ValueError("Invalid index version pointer.")
        target = directory / version
        metadata = json.loads((target / "metadata.json").read_text(encoding="utf-8"))

        chunks_path = target / "chunks.json"
        if hashlib.sha256(chunks_path.read_bytes()).hexdigest() != metadata.get("chunks_sha256"):
            raise ValueError("Vector index integrity check failed.")

        chunks = [Chunk(**c) for c in json.loads(chunks_path.read_text(encoding="utf-8"))]

        if (target / "vectors.npy").is_file():
            vectors = np.load(str(target / "vectors.npy"))
        elif (target / "vectors.faiss").is_file():
            import faiss

            index = faiss.read_index(str(target / "vectors.faiss"))
            vectors = index.reconstruct_n(0, index.ntotal)
        else:
            raise ValueError("No vector file found in target index directory.")

        if (target / "qdrant_db").is_dir() and not os.getenv("QDRANT_URL"):
            store = cls(vectors, chunks, storage_path=target / "qdrant_db")
        else:
            store = cls(vectors, chunks)

        return store, metadata


class FAISSVectorStore(VectorStore):
    """Backwards-compatible FAISS store interface."""

    def __init__(self, vectors: np.ndarray, chunks: list[Chunk]):
        import faiss

        self.vectors = np.ascontiguousarray(vectors, dtype="float32")
        if len(chunks) != len(vectors) or not len(chunks):
            raise ValueError("Embedding count must match nonempty chunk count.")
        self.chunks = chunks
        self.index = faiss.IndexFlatIP(self.vectors.shape[1])
        self.index.add(self.vectors)
        self.dimension = self.vectors.shape[1]

    def search(self, query, top_k, filters=None):
        import faiss

        if top_k < 1:
            raise ValueError("top_k must be positive.")
        candidates = [
            i
            for i, c in enumerate(self.chunks)
            if not filters or all(getattr(c, key) in value for key, value in filters.items())
        ]
        if not candidates:
            return []
        subset = faiss.IndexFlatIP(self.vectors.shape[1])
        subset.add(self.vectors[candidates])
        scores, positions = subset.search(
            np.ascontiguousarray(query, dtype="float32"), min(top_k, len(candidates))
        )
        return [
            (self.chunks[candidates[int(i)]], float(score))
            for i, score in zip(positions[0], scores[0])
            if i >= 0
        ]

    def save(self, directory, metadata):
        import faiss

        directory.mkdir(parents=True, exist_ok=True)
        version = uuid.uuid4().hex
        target = directory / version
        target.mkdir()
        faiss.write_index(self.index, str(target / "vectors.faiss"))
        chunks_path = target / "chunks.json"
        chunks_path.write_text(json.dumps([c.to_dict() for c in self.chunks]), encoding="utf-8")
        metadata = dict(
            metadata,
            chunks_sha256=hashlib.sha256(chunks_path.read_bytes()).hexdigest(),
            index_sha256=hashlib.sha256((target / "vectors.faiss").read_bytes()).hexdigest(),
            chunk_count=len(self.chunks),
        )
        (target / "metadata.json").write_text(json.dumps(metadata), encoding="utf-8")
        pointer = directory / (version + ".tmp")
        pointer.write_text(version, encoding="utf-8")
        os.replace(pointer, directory / "CURRENT")

    @classmethod
    def load(cls, directory: Path):
        import faiss

        version = (directory / "CURRENT").read_text(encoding="utf-8").strip()
        if len(version) != 32 or any(c not in "0123456789abcdef" for c in version):
            raise ValueError("Invalid index version pointer.")
        target = directory / version
        metadata = json.loads((target / "metadata.json").read_text(encoding="utf-8"))
        for file, key in [("chunks.json", "chunks_sha256"), ("vectors.faiss", "index_sha256")]:
            if hashlib.sha256((target / file).read_bytes()).hexdigest() != metadata[key]:
                raise ValueError("Vector index integrity check failed.")
        index = faiss.read_index(str(target / "vectors.faiss"))
        chunks = [
            Chunk(**c) for c in json.loads((target / "chunks.json").read_text(encoding="utf-8"))
        ]
        if index.ntotal != len(chunks):
            raise ValueError("Index and chunk counts disagree.")
        return cls(index.reconstruct_n(0, index.ntotal), chunks), metadata


DefaultVectorStore = QdrantVectorStore
