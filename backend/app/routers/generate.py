"""
routers/generate.py
===================
FastAPI router for structured output generation endpoints.

These endpoints provide on-demand generation without needing a full chat
exchange. They are called by the frontend quick-action buttons.

Endpoints:
    POST /api/py/generate/summary     → { markdown: str }
    POST /api/py/generate/notes       → { markdown: str }
    POST /api/py/generate/flashcards  → { flashcards: [...], total: int, categories: [...] }
    POST /api/py/generate/mindmap     → { tree: {...} }

All endpoints accept:
    {
        "session_id": "...",
        "top_k": 20   (optional, defaults to 20 for broad coverage)
    }
"""

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.rag.retriever import retrieve
from app.generators.summary import generate_summary
from app.generators.notes import generate_notes
from app.generators.flashcards import generate_flashcards
from app.generators.mindmap import generate_mindmap

logger = logging.getLogger(__name__)

router = APIRouter()

# Higher default top_k for generation tasks — they need more context
# than a specific chat question.
DEFAULT_TOP_K = 20


# ---------------------------------------------------------------------------
# Shared request model
# ---------------------------------------------------------------------------

class GenerateRequest(BaseModel):
    session_id: str
    top_k: Optional[int] = DEFAULT_TOP_K


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/api/py/generate/summary")
def summary_endpoint(request: GenerateRequest) -> Dict[str, Any]:
    """
    Generate a comprehensive Markdown summary of all ingested content.

    Returns:
        { "markdown": "<formatted summary>" }
    """
    logger.info("Summary requested for session '%s' (top_k=%d)", request.session_id, request.top_k)
    chunks = retrieve(request.session_id, "summarize all content", top_k=request.top_k)
    markdown = generate_summary(chunks)
    return {"markdown": markdown}


@router.post("/api/py/generate/notes")
def notes_endpoint(request: GenerateRequest) -> Dict[str, Any]:
    """
    Generate structured study notes from all ingested content.

    Returns:
        { "markdown": "<formatted notes>" }
    """
    logger.info("Notes requested for session '%s' (top_k=%d)", request.session_id, request.top_k)
    chunks = retrieve(request.session_id, "key concepts topics and important details", top_k=request.top_k)
    markdown = generate_notes(chunks)
    return {"markdown": markdown}


@router.post("/api/py/generate/flashcards")
def flashcards_endpoint(request: GenerateRequest) -> Dict[str, Any]:
    """
    Generate a set of Q&A flashcards from all ingested content.

    Returns:
        {
          "flashcards": [{ "id", "front", "back", "category", "difficulty" }, ...],
          "total": int,
          "categories": ["..."],
          "raw_markdown": str | null,  -- set if JSON parsing failed
          "error": str | null
        }
    """
    logger.info("Flashcards requested for session '%s' (top_k=%d)", request.session_id, request.top_k)
    chunks = retrieve(request.session_id, "key concepts definitions terms facts", top_k=request.top_k)
    result = generate_flashcards(chunks)
    return result.to_dict()


@router.post("/api/py/generate/mindmap")
def mindmap_endpoint(request: GenerateRequest) -> Dict[str, Any]:
    """
    Generate a hierarchical mindmap JSON tree from all ingested content.

    Returns:
        {
          "tree": {
            "title": "Root topic",
            "children": [
              { "title": "Branch", "color": "#hex", "children": [...] },
              ...
            ]
          },
          "raw_markdown": str | null,
          "error": str | null
        }
    """
    logger.info("Mindmap requested for session '%s' (top_k=%d)", request.session_id, request.top_k)
    chunks = retrieve(request.session_id, "main topics themes structure overview", top_k=request.top_k)
    result = generate_mindmap(chunks)
    return result.to_dict()
