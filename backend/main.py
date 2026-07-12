import os
import uuid
import tempfile
import logging

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from agents.web_researcher import run_research
from agents.research_assistant import generate_assistant_response, ChatMessage
from agents.code_reviewer import review_code
from agents.rag_engine import (
    ingest_file,
    ingest_youtube,
    get_session_info,
    delete_session,
)
from fastapi.middleware.cors import CORSMiddleware
from database import (
    init_db,
    get_user_sessions,
    get_session,
    create_session,
    add_message,
    delete_db_session
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Productivity Suite Backend")

@app.on_event("startup")
def on_startup():
    init_db()

# Optional: Add CORS if you run frontend and backend on different ports without proxy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Allowed file extensions for upload
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


# ===================================================================
# REQUEST / RESPONSE MODELS
# ===================================================================

class ResearchRequest(BaseModel):
    query: str

class ResearchResponse(BaseModel):
    report: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    session_id: str
    user_id: str
    module: Optional[str] = "research-assistant"
    top_k: Optional[int] = 5  # number of RAG chunks to retrieve (higher for broad actions like summary)
    youtube_url: Optional[str] = ""  # kept for backwards compatibility

class ChatResponse(BaseModel):
    reply: str

class CodeReviewRequest(BaseModel):
    code: str

class IngestYoutubeRequest(BaseModel):
    session_id: str
    youtube_url: str

class IngestResponse(BaseModel):
    success: bool
    chunk_count: int
    source_name: str
    error: Optional[str] = None

class SessionInfoResponse(BaseModel):
    session_id: str
    total_chunks: int
    sources: List[str]
    has_data: bool


# ===================================================================
# EXISTING ENDPOINTS
# ===================================================================

@app.get("/api/py/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/py/web-research", response_model=ResearchResponse)
def perform_web_research(request: ResearchRequest):
    """
    Endpoint that takes a query, searches the web, 
    and returns an AI-generated report.
    """
    report = run_research(request.query)
    return ResearchResponse(report=report)

@app.post("/api/py/chat", response_model=ChatResponse)
def perform_chat(request: ChatRequest):
    """
    Endpoint that takes chat history and a session_id.
    Saves to the DB and returns the generated reply.
    """
    if request.messages:
        last_msg = request.messages[-1]
        
        # Check if session exists
        db_session = get_session(request.session_id)
        if not db_session:
            title = last_msg.content[:40] + ("..." if len(last_msg.content) > 40 else "")
            create_session(request.session_id, request.user_id, title, request.module)
            
        # Save user message
        add_message(request.session_id, "user", last_msg.content)

    reply = generate_assistant_response(
        messages=request.messages,
        session_id=request.session_id,
        top_k=request.top_k or 5,
    )
    
    add_message(request.session_id, "assistant", reply)
    return ChatResponse(reply=reply)

@app.post("/api/py/code-review")
def perform_code_review(request: CodeReviewRequest):
    """
    Endpoint that takes raw code and returns a structured review
    with bugs, security issues, improvements, explanation, etc.
    """
    result = review_code(request.code)
    return result


# ===================================================================
# RAG INGEST ENDPOINTS
# ===================================================================

@app.post("/api/py/ingest/file", response_model=IngestResponse)
async def ingest_file_endpoint(
    file: UploadFile = File(...),
    session_id: str = Form(...),
):
    """
    Upload a file (PDF, DOCX, TXT) and ingest it into the RAG pipeline.
    The file is chunked, embedded, and stored in the vector database.
    """
    # Validate file extension
    filename = file.filename or "unknown"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Validate file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large: {len(contents)} bytes. Maximum: {MAX_FILE_SIZE} bytes (50MB).",
        )

    # Save to temp file for parsing
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        result = ingest_file(session_id, tmp_path)

        return IngestResponse(
            success="error" not in result,
            chunk_count=result.get("chunk_count", 0),
            source_name=filename,
            error=result.get("error"),
        )
    except Exception as e:
        logger.error(f"File ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.post("/api/py/ingest/youtube", response_model=IngestResponse)
def ingest_youtube_endpoint(request: IngestYoutubeRequest):
    """
    Fetch a YouTube video's transcript and ingest it into the RAG pipeline.
    """
    try:
        result = ingest_youtube(request.session_id, request.youtube_url)
        return IngestResponse(
            success="error" not in result,
            chunk_count=result.get("chunk_count", 0),
            source_name=result.get("source_name", request.youtube_url),
            error=result.get("error"),
        )
    except Exception as e:
        logger.error(f"YouTube ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/py/ingest/status/{session_id}", response_model=SessionInfoResponse)
def get_ingest_status(session_id: str):
    """
    Get the ingestion status for a session — how many chunks, which sources.
    """
    info = get_session_info(session_id)
    return SessionInfoResponse(**info)


@app.delete("/api/py/ingest/{session_id}")
def clear_session(session_id: str):
    """
    Delete all ingested data for a session and its DB record.
    """
    success = delete_session(session_id)
    try:
        delete_db_session(session_id)
    except Exception as e:
        logger.error(f"Error deleting DB session: {e}")
        
    if success:
        return {"status": "deleted", "session_id": session_id}
    return {"status": "not_found", "session_id": session_id}

@app.get("/api/py/conversations")
def list_conversations(user_id: str, module: Optional[str] = None):
    return get_user_sessions(user_id, module)

@app.get("/api/py/conversations/{session_id}")
def get_conversation(session_id: str):
    data = get_session(session_id)
    if not data:
        raise HTTPException(status_code=404, detail="Session not found")
    return data
