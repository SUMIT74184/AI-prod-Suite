"""
generators/mindmap.py
=====================
Generates a hierarchical JSON mindmap tree from retrieved RAG chunks.

The JSON structure is designed to be consumed directly by the frontend's
MindmapViewer component — no post-processing required.

Public API:
    generate_mindmap(chunks) → MindmapResult
"""

import json
import logging
import re
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

from core.llm_client import generate_text
from core.prompts import MINDMAP_SYSTEM_PROMPT
from rag.retriever import RetrievedChunk, format_context_block

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------

@dataclass
class MindmapResult:
    """
    The complete output of generate_mindmap().

    Attributes:
        tree:         The parsed JSON tree dict (title + nested children).
        raw_markdown: If JSON parsing fails, raw AI response stored here.
        error:        Set if generation failed entirely.
    """
    tree: Optional[Dict[str, Any]] = None
    raw_markdown: Optional[str] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tree": self.tree,
            "raw_markdown": self.raw_markdown,
            "error": self.error,
        }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_mindmap(chunks: List[RetrievedChunk]) -> MindmapResult:
    """
    Produce a hierarchical mindmap JSON tree from the ingested content.

    The AI returns a JSON object following this schema:
    {
      "title": "Central topic",
      "children": [
        {
          "title": "Branch A",
          "color": "#6366f1",
          "children": [
            { "title": "Sub-topic", "children": [] }
          ]
        },
        ...
      ]
    }

    If JSON parsing fails, the raw text is returned in raw_markdown.

    Args:
        chunks: List of RetrievedChunk objects from rag.retriever.retrieve().
                Recommend top_k >= 20 for a rich, multi-branch mindmap.

    Returns:
        MindmapResult with a parsed tree dict or raw_markdown fallback.
    """
    if not chunks:
        return MindmapResult(
            error="No content ingested. Upload a document or add a source first."
        )

    context_block = format_context_block(chunks)

    prompt = (
        f"{MINDMAP_SYSTEM_PROMPT}\n\n"
        f"{context_block}\n\n"
        "Generate a comprehensive mind map JSON from the content above. "
        "Return ONLY valid JSON — no markdown code fences, no extra text."
    )

    logger.info("Generating mindmap from %d chunks", len(chunks))

    try:
        raw_text = generate_text(prompt).strip()
    except Exception as exc:
        logger.error("Mindmap generation API call failed: %s", exc)
        return MindmapResult(error=f"AI generation failed: {exc}")

    # --- Parse JSON response ---
    # Strip markdown fences if the model included them
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        tree = json.loads(cleaned)
        # Basic validation: must have 'title' and 'children' at the root
        if "title" not in tree or "children" not in tree:
            raise ValueError("JSON missing required 'title' or 'children' keys.")
        return MindmapResult(tree=tree)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.warning("Could not parse mindmap JSON (%s); returning raw text.", exc)
        return MindmapResult(
            raw_markdown=raw_text,
            error=f"JSON parsing failed: {exc}. Raw output is in 'raw_markdown'.",
        )
