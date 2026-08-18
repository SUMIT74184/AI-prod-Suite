"""
rag/embedder.py
===============
Converts text into vector embeddings using the Gemini text-embedding-004 model.

Public API:
    embed_texts(texts)  → List[List[float]]   — batch embedding
    embed_query(text)   → List[float]          — single query embedding

Why separate from the rest of the RAG pipeline?
    - Embedding calls are the most likely thing to swap out (model upgrade,
      switch to a different provider). Isolating them here keeps the change
      to a single file.
    - Easier to mock in tests.
"""

import logging
from typing import List

from app.core.gemini_client import gemini_client, EMBEDDING_MODEL

logger = logging.getLogger(__name__)

# Gemini embedding API supports batches; we cap at 100 to stay within limits.
_BATCH_SIZE = 100


def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Embed a list of strings and return their vector representations.

    Args:
        texts: Non-empty list of strings to embed.

    Returns:
        List of float vectors, one per input string.

    Raises:
        ValueError: If the input list is empty.
        RuntimeError: If the Gemini API call fails.
    """
    if not texts:
        raise ValueError("embed_texts() received an empty list.")

    if gemini_client is None:
        raise RuntimeError("Gemini API key is not configured. Vector embeddings are disabled.")

    embeddings: List[List[float]] = []

    # Process in batches to respect API rate limits
    for batch_start in range(0, len(texts), _BATCH_SIZE):
        batch = texts[batch_start : batch_start + _BATCH_SIZE]
        logger.debug(
            "Embedding batch %d–%d of %d texts",
            batch_start + 1,
            batch_start + len(batch),
            len(texts),
        )
        try:
            result = gemini_client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=batch,
            )
            for embedding_obj in result.embeddings:
                embeddings.append(embedding_obj.values)
        except Exception as exc:
            raise RuntimeError(
                f"Gemini embedding API failed on batch starting at index {batch_start}: {exc}"
            ) from exc

    return embeddings


def embed_query(text: str) -> List[float]:
    """
    Embed a single query string for similarity search.

    This is a convenience wrapper around embed_texts() for the common
    single-query case in retrieval.

    Args:
        text: The query string to embed.

    Returns:
        A single float vector.
    """
    return embed_texts([text])[0]
