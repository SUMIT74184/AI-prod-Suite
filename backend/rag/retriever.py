"""
rag/retriever.py
================
Semantic retrieval — turns a natural language question into a list of
relevant document chunks by querying the ChromaDB vector store.

Public API:
    retrieve(session_id, question, top_k) → List[RetrievedChunk]
    format_context_block(chunks)          → str   (for injecting into prompts)
"""

import logging
from dataclasses import dataclass
from typing import List

from rag.embedder import embed_query
from rag.store import query_collection

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data type
# ---------------------------------------------------------------------------

@dataclass
class RetrievedChunk:
    """
    A single chunk of text retrieved from the vector store.

    Attributes:
        text:        The raw text content of the chunk.
        source:      Where the chunk came from (filename, YouTube ID, URL domain).
        score:       Similarity score in [0, 1] — higher means more relevant.
        chunk_index: The chunk's position within its source document.
    """
    text: str
    source: str
    score: float
    chunk_index: int

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "source": self.source,
            "score": self.score,
            "chunk_index": self.chunk_index,
        }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def retrieve(
    session_id: str,
    question: str,
    top_k: int = 5,
) -> List[RetrievedChunk]:
    """
    Retrieve the most relevant chunks for a given question.

    Steps:
        1. Embed the question into a vector.
        2. Query ChromaDB for the top-K nearest neighbors.
        3. Convert cosine distances to similarity scores.
        4. Return a list of RetrievedChunk objects sorted by relevance.

    Args:
        session_id: Which ChromaDB collection to search.
        question:   The user's natural language question.
        top_k:      Maximum number of chunks to return.
                    Use a higher value (e.g., 20) for broad tasks like
                    summarization that benefit from more context.

    Returns:
        List of RetrievedChunk, ordered from most to least relevant.
        Empty list if no data is indexed for this session.
    """
    # Embed the question
    try:
        query_embedding = embed_query(question)
    except RuntimeError as exc:
        if "Gemini API key is not configured" in str(exc):
            logger.info("Retrieval bypassed: %s", exc)
        else:
            logger.error("Failed to embed query: %s", exc)
        return []

    # Search ChromaDB
    raw_results = query_collection(session_id, query_embedding, top_k=top_k)

    # Empty result means the session has no data
    if not raw_results or not raw_results.get("documents"):
        return []

    # Parse and format results
    chunks: List[RetrievedChunk] = []
    documents = raw_results["documents"][0]   # list of chunk texts
    metadatas = raw_results["metadatas"][0]   # list of metadata dicts
    distances = raw_results["distances"][0]   # list of cosine distances

    for text, meta, distance in zip(documents, metadatas, distances):
        # ChromaDB cosine distance: 0.0 = identical, 2.0 = opposite direction
        # Convert to a [0, 1] similarity score
        similarity = round(1.0 - (distance / 2.0), 4)

        chunks.append(
            RetrievedChunk(
                text=text,
                source=meta.get("source", "unknown"),
                score=similarity,
                chunk_index=meta.get("chunk_index", -1),
            )
        )

    logger.debug(
        "Retrieved %d chunks for session '%s' (top score: %.2f)",
        len(chunks),
        session_id,
        chunks[0].score if chunks else 0,
    )
    return chunks


def format_context_block(chunks: List[RetrievedChunk]) -> str:
    """
    Format retrieved chunks into a context block ready for prompt injection.

    This produces a clearly delimited section that can be pasted directly
    into any Gemini prompt, making it easy for the model to reference
    individual sources.

    Args:
        chunks: List of RetrievedChunk objects from retrieve().

    Returns:
        A formatted multi-line string, or an empty string if chunks is empty.
    """
    if not chunks:
        return ""

    lines = ["--- RETRIEVED CONTEXT (from ingested documents) ---"]
    for i, chunk in enumerate(chunks, start=1):
        lines.append(
            f"\n[Chunk {i} | Source: {chunk.source} | Relevance: {chunk.score:.0%}]"
        )
        lines.append(chunk.text)
    lines.append("\n--- END OF RETRIEVED CONTEXT ---")

    return "\n".join(lines)
