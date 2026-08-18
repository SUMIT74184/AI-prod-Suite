"""
generators/summary.py
=====================
Generates a comprehensive Markdown summary from retrieved RAG chunks.

Public API:
    generate_summary(chunks) → str
"""

import logging
from typing import List

from app.core.llm_client import generate_text
from app.core.prompts import SUMMARY_SYSTEM_PROMPT
from app.rag.retriever import RetrievedChunk, format_context_block

logger = logging.getLogger(__name__)


def generate_summary(chunks: List[RetrievedChunk]) -> str:
    """
    Produce a structured Markdown summary of the provided content chunks.

    The function builds a prompt from:
        1. The SUMMARY_SYSTEM_PROMPT (defines output format and rules).
        2. All retrieved chunks formatted as a context block.
        3. A final instruction asking for the summary.

    Args:
        chunks: List of RetrievedChunk objects from app.rag.retriever.retrieve().
                Pass a large top_k (e.g., 20) for comprehensive coverage.

    Returns:
        A Markdown-formatted summary string.
        Returns an error message string if the API call fails.
    """
    if not chunks:
        return (
            "## Summary\n\n"
            "_No content has been ingested yet. Please upload a document, "
            "paste a YouTube URL, or add a web page link first._"
        )

    context_block = format_context_block(chunks)

    prompt = (
        f"{SUMMARY_SYSTEM_PROMPT}\n\n"
        f"{context_block}\n\n"
        "Please generate a comprehensive summary of all the content above."
    )

    logger.info("Generating summary from %d chunks", len(chunks))

    try:
        return generate_text(prompt)
    except Exception as exc:
        logger.error("Summary generation failed: %s", exc)
        return f"Error generating summary: {exc}"
