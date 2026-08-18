"""
rag/store.py
============
ChromaDB wrapper — all vector database read/write operations live here.

This module intentionally knows NOTHING about embeddings or documents.
It receives pre-computed embeddings and metadata from the ingester, and
returns raw results to the retriever.

Public API:
    get_or_create_collection(session_id)  → chromadb.Collection
    add_chunks(session_id, ids, texts, embeddings, metadatas)
    query_collection(session_id, query_embedding, top_k) → dict
    get_session_info(session_id)          → dict
    delete_session(session_id)            → bool
"""

import os
import logging
from typing import List, Dict, Any, Optional

import chromadb

from app.config import CHROMA_DATA_DIR

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# ChromaDB client — persists data to disk between server restarts
# ---------------------------------------------------------------------------

_chroma_client = chromadb.PersistentClient(path=CHROMA_DATA_DIR)

logger.info("ChromaDB initialized at: %s", CHROMA_DATA_DIR)


# ---------------------------------------------------------------------------
# Collection naming
# ---------------------------------------------------------------------------

def _collection_name(session_id: str) -> str:
    """
    Build a valid ChromaDB collection name from a session ID.

    ChromaDB rules:
        - 3 to 63 characters
        - Must start and end with an alphanumeric character
        - Only alphanumerics, underscores, and hyphens allowed
    """
    name = f"session-{session_id}"
    # Truncate to 63 chars (UUID is 36 chars so 'session-' + UUID = 44 chars — fine)
    return name[:63]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_or_create_collection(session_id: str) -> chromadb.Collection:
    """
    Get an existing session collection or create a new one.

    We use cosine distance so that similarity scores feel intuitive
    (higher = more similar), unlike the default L2 distance.
    """
    name = _collection_name(session_id)
    return _chroma_client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"},
    )


def add_chunks(
    session_id: str,
    ids: List[str],
    texts: List[str],
    embeddings: List[List[float]],
    metadatas: List[Dict[str, Any]],
) -> None:
    """
    Insert a batch of pre-embedded text chunks into the session collection.

    Args:
        session_id:  Identifies which collection to write to.
        ids:         Unique string IDs — one per chunk.
        texts:       The raw text of each chunk (stored as the document).
        embeddings:  Pre-computed float vectors — one per chunk.
        metadatas:   Dict of metadata per chunk (source, chunk_index, etc.).
    """
    collection = get_or_create_collection(session_id)
    collection.add(
        ids=ids,
        documents=texts,
        embeddings=embeddings,
        metadatas=metadatas,
    )
    logger.info(
        "Stored %d chunks in session '%s' (collection: '%s')",
        len(ids),
        session_id,
        _collection_name(session_id),
    )


def query_collection(
    session_id: str,
    query_embedding: List[float],
    top_k: int = 5,
) -> Dict[str, Any]:
    """
    Find the top-K most similar chunks to the query embedding.

    Args:
        session_id:       Identifies which collection to search.
        query_embedding:  The embedded query vector.
        top_k:            Maximum number of results to return.

    Returns:
        Raw ChromaDB results dict (keys: documents, metadatas, distances).
        Returns an empty dict if the collection has no data.
    """
    collection = get_or_create_collection(session_id)
    chunk_count = collection.count()

    if chunk_count == 0:
        logger.debug("Session '%s' has no chunks — skipping query.", session_id)
        return {}

    # Clamp top_k to the number of available chunks
    actual_top_k = min(top_k, chunk_count)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=actual_top_k,
        include=["documents", "metadatas", "distances"],
    )
    return results


def get_session_info(session_id: str) -> Dict[str, Any]:
    """
    Return metadata about what has been ingested for a session.

    Returns:
        {
            "session_id":    str,
            "total_chunks":  int,
            "sources":       List[str],   # unique source names
            "has_data":      bool,
        }
    """
    collection = get_or_create_collection(session_id)
    total_chunks = collection.count()

    sources: List[str] = []
    if total_chunks > 0:
        all_metadata = collection.get(include=["metadatas"])
        if all_metadata and all_metadata.get("metadatas"):
            sources = sorted(
                set(m.get("source", "unknown") for m in all_metadata["metadatas"])
            )

    return {
        "session_id": session_id,
        "total_chunks": total_chunks,
        "sources": sources,
        "has_data": total_chunks > 0,
    }


def delete_session(session_id: str) -> bool:
    """
    Delete the entire ChromaDB collection for a session.

    Returns:
        True if deleted, False if the collection didn't exist.
    """
    name = _collection_name(session_id)
    try:
        _chroma_client.delete_collection(name=name)
        logger.info("Deleted ChromaDB collection '%s'", name)
        return True
    except Exception as exc:
        logger.warning("Could not delete collection '%s': %s", name, exc)
        return False
