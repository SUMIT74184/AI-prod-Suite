"""
generators/notes.py
===================
Generates structured, hierarchical study notes from retrieved RAG chunks.

Public API:
    generate_notes(chunks) → str
"""

import logging
from typing import List

from core.gemini_client import gemini_client, GENERATION_MODEL
from core.prompts import NOTES_SYSTEM_PROMPT
from rag.retriever import RetrievedChunk, format_context_block

logger = logging.getLogger(__name__)


def generate_notes(chunks: List[RetrievedChunk]) -> str:
    """
    Produce well-organized, hierarchical study notes from content chunks.

    The notes include topic headings, key concept definitions, important
    details as bullet points, and a Quick Reference table at the end.

    Args:
        chunks: List of RetrievedChunk objects from rag.retriever.retrieve().
                Recommend top_k >= 15 for thorough notes.

    Returns:
        A Markdown-formatted notes string.
        Returns an error message string if the API call fails.
    """
    if not chunks:
        return (
            "## Study Notes\n\n"
            "_No content has been ingested yet. Please upload a document, "
            "paste a YouTube URL, or add a web page link first._"
        )

    context_block = format_context_block(chunks)

    prompt = (
        f"{NOTES_SYSTEM_PROMPT}\n\n"
        f"{context_block}\n\n"
        "Please generate detailed, well-organized study notes from all the content above."
    )

    logger.info("Generating notes from %d chunks", len(chunks))

    try:
        response = gemini_client.models.generate_content(
            model=GENERATION_MODEL,
            contents=prompt,
        )
        return response.text
    except Exception as exc:
        logger.error("Notes generation failed: %s", exc)
        return f"Error generating notes: {exc}"
