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

from app.rag.retriever import retrieve, RetrievedChunk
from app.core.database import get_session
from app.generators.summary import generate_summary
from app.generators.notes import generate_notes
from app.generators.flashcards import generate_flashcards
from app.generators.mindmap import generate_mindmap

logger = logging.getLogger(__name__)

router = APIRouter()

# Higher default top_k for generation tasks — they need more context
# than a specific chat question.
DEFAULT_TOP_K = 20

def get_context_chunks(session_id: str, query: str, top_k: int) -> list[RetrievedChunk]:
    chunks = retrieve(session_id, query, top_k=top_k)
    if not chunks:
        db_session = get_session(session_id)
        if db_session and db_session.get("messages"):
            # Skip the first default greeting if it exists to avoid summarizing "Welcome"
            msgs = db_session["messages"]
            if len(msgs) > 0 and msgs[0]["role"] == "assistant" and "welcome" in msgs[0]["content"].lower():
                msgs = msgs[1:]
            history_text = "\n".join([f"{m['role'].capitalize()}: {m['content']}" for m in msgs])
            if history_text.strip():
                return [RetrievedChunk(text=history_text, source="Conversation History", score=1.0, chunk_index=0)]
    return chunks

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
    chunks = get_context_chunks(request.session_id, "summarize all content", top_k=request.top_k)
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
    chunks = get_context_chunks(request.session_id, "key concepts topics and important details", top_k=request.top_k)
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
    chunks = get_context_chunks(request.session_id, "key concepts definitions terms facts", top_k=request.top_k)
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
    chunks = get_context_chunks(request.session_id, "main topics themes structure overview", top_k=request.top_k)
    result = generate_mindmap(chunks)
    return result.to_dict()
