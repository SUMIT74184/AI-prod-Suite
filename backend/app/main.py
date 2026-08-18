"""
main.py
=======
AI Productivity Suite — FastAPI application entry point.

This file is intentionally minimal. It:
    1. Creates the FastAPI app.
    2. Mounts all routers (chat, ingest, generate, plus legacy agents).
    3. Adds CORS middleware so the Next.js frontend can reach the API.
    4. Initializes the SQLite database on startup.

To run locally:
    cd backend
    uvicorn app.main:app --reload --port 8000
"""

import logging
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
from app.core.database import init_db, get_user_sessions, get_session

# ---------------------------------------------------------------------------
# New modular routers
# ---------------------------------------------------------------------------
from app.routers.chat import router as chat_router
from app.routers.ingest import router as ingest_router
from app.routers.generate import router as generate_router
from app.prompt_playground.api.router import router as prompt_playground_router

# ---------------------------------------------------------------------------
# Legacy agents (kept as-is — code reviewer and web researcher)
# ---------------------------------------------------------------------------
from app.services.code_reviewer import review_code
from app.routers.web_research import router as web_research_router
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="AI Productivity Suite Backend",
    description=(
        "FastAPI backend powering the Research Assistant (RAG pipeline), "
        "Code Reviewer, Web Research Agent, and Prompt Playground."
    ),
    version="2.0.0",
)

# CORS — allows the Next.js dev server (port 3000) to call this API (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

@app.on_event("startup")
def on_startup() -> None:
    """Initialize the SQLite database tables on first run."""
    init_db()
    logger.info("Database initialized. Backend ready.")


# ---------------------------------------------------------------------------
# Mount modular routers
# ---------------------------------------------------------------------------

# Research Assistant chat (RAG-augmented)
app.include_router(chat_router)

# Data ingestion (file / YouTube / URL)
app.include_router(ingest_router)

# Structured output generation (summary / notes / flashcards / mindmap)
app.include_router(generate_router)

# LangGraph Web Research Agent (plan / search / read / analyze / write_report)
app.include_router(web_research_router)

# Standalone Prompt Playground Router
app.include_router(prompt_playground_router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/api/py/health")
def health_check() -> dict:
    """Simple liveness probe. Returns 200 if the server is running."""
    return {"status": "healthy", "version": "2.0.0"}


@app.get("/api/py/health/llm")
def llm_info() -> dict:
    """Returns the currently active LLM provider and model name."""
    from app.core.llm_client import get_active_provider, OPENROUTER_MODEL
    import os
    provider = get_active_provider()
    return {
        "provider": provider,
        "openrouter_model": OPENROUTER_MODEL if os.environ.get("OPENROUTER_API_KEY") else None,
        "openrouter_configured": bool(os.environ.get("OPENROUTER_API_KEY", "").strip()),
        "gemini_configured": bool(os.environ.get("GEMINI_API_KEY", "").strip()),
    }


# ---------------------------------------------------------------------------
# Legacy: Web Research Agent (deprecated — use /api/py/web-research/run)
# Kept for backward compatibility with old frontend calls.
# ---------------------------------------------------------------------------

class ResearchRequest(BaseModel):
    query: str

class ResearchResponse(BaseModel):
    report: str

@app.post("/api/py/web-research", response_model=ResearchResponse)
def perform_web_research_legacy(request: ResearchRequest) -> ResearchResponse:
    """
    DEPRECATED: Simple 2-step web research (search + generate).
    Use POST /api/py/web-research/run for the LangGraph agent.
    Kept here so the existing frontend still works during migration.
    """
    from app.web_research_agent.runner import run_agent
    final_state = run_agent(request.query)
    return ResearchResponse(report=final_state.get("report", ""))


# ---------------------------------------------------------------------------
# Legacy: Code Reviewer Agent
# ---------------------------------------------------------------------------

class CodeReviewRequest(BaseModel):
    code: str

@app.post("/api/py/code-review")
def perform_code_review(request: CodeReviewRequest):
    """
    Code Reviewer Agent — analyzes code and returns bugs, suggestions, etc.
    """
    return review_code(request.code)


# ---------------------------------------------------------------------------
# Conversation history endpoints (SQLite)
# ---------------------------------------------------------------------------

@app.get("/api/py/conversations")
def list_conversations(user_id: str, module: Optional[str] = None):
    """List all chat sessions for a user, optionally filtered by module."""
    return get_user_sessions(user_id, module)


@app.get("/api/py/conversations/{session_id}")
def get_conversation(session_id: str):
    """Get the full message history for a specific session."""
    data = get_session(session_id)
    if not data:
        raise HTTPException(status_code=404, detail="Session not found")
    return data
