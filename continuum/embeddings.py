"""
Local embedding using sentence-transformers.

Uses all-MiniLM-L6-v2 (~80MB) on the GPU for zero-cost, zero-rate-limit
embedding. Falls back to CPU if CUDA is unavailable.
"""

from __future__ import annotations

import logging
from typing import Optional

import numpy as np

from continuum.config import EMBEDDING_MODEL_NAME, EMBEDDING_DIMENSION

logger = logging.getLogger(__name__)

# Lazy-loaded singleton
_model = None


def _get_model():
    """Lazy-load the embedding model (avoids import-time GPU allocation)."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        import torch

        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Loading embedding model '{EMBEDDING_MODEL_NAME}' on {device}")
        _model = SentenceTransformer(EMBEDDING_MODEL_NAME, device=device)
        logger.info(f"Embedding model loaded (dim={EMBEDDING_DIMENSION}, device={device})")
    return _model


def embed_texts(texts: list[str], batch_size: int = 32) -> list[list[float]]:
    """
    Embed a batch of texts into vectors.
    Returns a list of float vectors, each of dimension EMBEDDING_DIMENSION.
    """
    model = _get_model()
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=len(texts) > 10,
        convert_to_numpy=True,
        normalize_embeddings=True,  # Cosine similarity = dot product with L2-norm
    )
    return embeddings.tolist()


def embed_text(text: str) -> list[float]:
    """Embed a single text string."""
    return embed_texts([text])[0]


def decision_record_to_text(record: dict) -> str:
    """
    Convert a decision record into a single text string for embedding.
    Concatenates the most semantically meaningful fields.
    """
    parts = []

    # Title and decision summary are most important
    parts.append(record.get("title", ""))

    decision = record.get("decision", {})
    if isinstance(decision, dict):
        parts.append(decision.get("summary", ""))

    # Alternatives and their rejection reasons
    for alt in record.get("alternatives_considered", []):
        if isinstance(alt, dict):
            parts.append(f"Alternative: {alt.get('option', '')}")
            if alt.get("rejection_reason"):
                parts.append(f"Rejected because: {alt['rejection_reason']}")

    # Evidence paraphrases
    for ev in record.get("evidence", []):
        if isinstance(ev, dict):
            parts.append(ev.get("quote_or_paraphrase", ""))

    return " | ".join(p for p in parts if p)
