"""Configurable CPU sentence-transformer embeddings with bounded query caching."""

import os
import threading
from functools import lru_cache

import numpy as np

MODEL_DEFAULT = "sentence-transformers/all-MiniLM-L6-v2"
_lock = threading.Lock()


def model_name() -> str:
    return os.getenv("EMBEDDING_MODEL", MODEL_DEFAULT)


def _is_ollama_model(name: str) -> bool:
    clean = name.strip().lower()
    return (
        clean.startswith("ollama/")
        or ":" in clean
        or "embeddinggemma" in clean
        or "nomic-embed" in clean
        or "bge" in clean
    )


def _clean_ollama_model_name(name: str) -> str:
    if name.startswith("ollama/"):
        return name[len("ollama/") :]
    return name


class OllamaEmbeddingModel:
    def __init__(self, model_name: str, host: str | None = None):
        self.model = _clean_ollama_model_name(model_name)
        self.host = (
            host
            or os.getenv("OLLAMA_URL")
            or os.getenv("OLLAMA_HOST")
            or "http://127.0.0.1:11434"
        ).rstrip("/")
        self._dim = None

    def get_sentence_embedding_dimension(self) -> int:
        if self._dim is None:
            probe = self.encode(["dim_probe"])
            self._dim = probe.shape[1]
        return self._dim

    def encode(
        self,
        texts: list[str] | str,
        normalize_embeddings: bool = True,
        show_progress_bar: bool = False,
        batch_size: int = 32,
        **kwargs,
    ) -> np.ndarray:
        import httpx

        if isinstance(texts, str):
            texts = [texts]
        if not texts:
            return np.empty((0, self.get_sentence_embedding_dimension()), dtype="float32")

        timeout = float(os.getenv("TOOL_TIMEOUT_SECONDS", "60"))
        all_embeddings = []
        with httpx.Client(base_url=self.host, timeout=timeout) as client:
            for i in range(0, len(texts), batch_size):
                batch = texts[i : i + batch_size]
                resp = client.post(
                    "/api/embed",
                    json={
                        "model": self.model,
                        "input": batch,
                        "options": {"num_gpu": 0},
                        "keep_alive": os.getenv("OLLAMA_EMBED_KEEP_ALIVE", "10m"),
                    },
                )
                if resp.is_error:
                    for t in batch:
                        r = client.post("/api/embeddings", json={"model": self.model, "prompt": t})
                        r.raise_for_status()
                        all_embeddings.append(r.json()["embedding"])
                    continue
                resp.raise_for_status()
                data = resp.json()
                all_embeddings.extend(data.get("embeddings", []))

        embs = np.asarray(all_embeddings, dtype="float32")
        if self._dim is None and embs.shape[0] > 0:
            self._dim = embs.shape[1]
        if normalize_embeddings and embs.shape[0] > 0:
            norm = np.linalg.norm(embs, axis=1, keepdims=True)
            norm = np.where(norm == 0, 1.0, norm)
            embs = embs / norm
        return embs


@lru_cache(maxsize=2)
def get_model(name, allow_download=False):
    if _is_ollama_model(name):
        return OllamaEmbeddingModel(name)

    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(name, device="cpu", local_files_only=not allow_download)


def embed_documents(texts: list[str]) -> np.ndarray:
    with _lock:
        return np.asarray(
            get_model(model_name(), allow_download=True).encode(
                texts, normalize_embeddings=True, show_progress_bar=False, batch_size=32
            ),
            dtype="float32",
        )


@lru_cache(maxsize=256)
def _embed_query(name: str, text: str):
    with _lock:
        return np.asarray(
            get_model(name).encode([text], normalize_embeddings=True, show_progress_bar=False),
            dtype="float32",
        )


def embed_query(text: str):
    return _embed_query(model_name(), text).copy()


def embed_local_texts(texts: list[str]) -> np.ndarray:
    """Embed classifier descriptions locally; request handling never downloads models."""
    with _lock:
        return np.asarray(
            get_model(model_name()).encode(
                texts, normalize_embeddings=True, show_progress_bar=False, batch_size=32
            ),
            dtype="float32",
        )
