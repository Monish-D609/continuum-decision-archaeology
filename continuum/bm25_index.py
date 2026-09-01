"""
In-memory BM25 keyword index over decision records.

Provides keyword-based retrieval as the second leg of hybrid search.
BM25 handles informal decision language ("let's not do this", "reverting
because...") that doesn't embed cleanly against formal questions.
"""

from __future__ import annotations

import logging
import re
from typing import Optional

from rank_bm25 import BM25Okapi

logger = logging.getLogger(__name__)


class BM25Index:
    """
    In-memory BM25 index over decision record text content.
    Built at startup from all records in the vector store.
    """

    def __init__(self):
        self._documents: list[dict] = []
        self._tokenized_corpus: list[list[str]] = []
        self._bm25: Optional[BM25Okapi] = None

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        """Simple whitespace + punctuation tokenizer."""
        text = text.lower()
        tokens = re.findall(r'\b\w+\b', text)
        return tokens

    def build(self, records: list[dict]) -> None:
        """
        Build the BM25 index from a list of decision records.
        Each record should have at minimum: id, title, text_content.
        """
        self._documents = records
        self._tokenized_corpus = [
            self._tokenize(
                f"{r.get('title', '')} {r.get('decision_summary', '')} {r.get('text_content', '')}"
            )
            for r in records
        ]

        if self._tokenized_corpus:
            self._bm25 = BM25Okapi(self._tokenized_corpus)
            logger.info(f"BM25 index built with {len(records)} documents")
        else:
            logger.warning("BM25 index built with 0 documents")

    def search(self, query: str, top_k: int = 10) -> list[dict]:
        """
        Search the BM25 index for relevant documents.
        Returns records with bm25_score added.
        """
        if not self._bm25 or not self._documents:
            return []

        tokens = self._tokenize(query)
        scores = self._bm25.get_scores(tokens)

        # Pair scores with documents and sort
        scored = [
            {**doc, "bm25_score": float(score)}
            for doc, score in zip(self._documents, scores)
            if score > 0
        ]
        scored.sort(key=lambda x: x["bm25_score"], reverse=True)

        return scored[:top_k]

    @property
    def document_count(self) -> int:
        return len(self._documents)
