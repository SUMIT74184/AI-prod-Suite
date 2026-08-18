"""
routers/ingest.py
=================
FastAPI router for all data ingestion endpoints.

Endpoints:
    POST   /api/py/ingest/file          — Upload a PDF, DOCX, or TXT file
    POST   /api/py/ingest/youtube       — Ingest a YouTube video by URL
    POST   /api/py/ingest/url           — Scrape and ingest a web page by URL
    GET    /api/py/ingest/status/{sid}  — Get ingestion status for a session
    DELETE /api/py/ingest/{sid}         — Delete all ingested data for a session

All endpoints return IngestResponse (success, chunk_count, source_name, error).
"""

import os
import logging
import tempfile
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.rag.ingester import ingest_file, ingest_youtube, ingest_url
from app.rag.store import get_session_info, delete_session
from app.core.database import delete_db_session

logger = logging.getLogger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ALLOWED_FILE_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class IngestYoutubeRequest(BaseModel):
    session_id: str
    youtube_url: str


class IngestUrlRequest(BaseModel):
    session_id: str
    url: str


class IngestResponse(BaseModel):
    success: bool
    chunk_count: int
    source_name: str
    error: Optional[str] = None


class SessionInfoResponse(BaseModel):
    session_id: str
    total_chunks: int
    sources: list
    has_data: bool


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/api/py/ingest/file", response_model=IngestResponse)
async def ingest_file_endpoint(
    file: UploadFile = File(...),
    session_id: str = Form(...),
) -> IngestResponse:
    """
    Upload a file and ingest it into the RAG pipeline.

    Accepts: PDF (.pdf), Word (.docx), plain text (.txt)
    Max size: 50 MB

    The file is:
        1. Validated (extension + size).
        2. Written to a temporary file on disk.
        3. Parsed → chunked → embedded → stored in ChromaDB.
        4. Temp file is deleted on completion.
    """
    # Validate extension
    filename = file.filename or "unknown"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_FILE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '{ext}'. "
                f"Allowed types: {', '.join(sorted(ALLOWED_FILE_EXTENSIONS))}"
            ),
        )

    # Read and validate size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"File too large ({len(contents):,} bytes). "
                f"Maximum allowed size is {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB."
            ),
        )

    # Write to temp file, ingest, then clean up
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        result = ingest_file(session_id, tmp_path)

        return IngestResponse(
            success=result.success,
            chunk_count=result.chunk_count,
            source_name=filename,   # use original filename, not temp path
            error=result.error,
        )
    except Exception as exc:
        logger.error("File ingestion endpoint error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


@router.post("/api/py/ingest/youtube", response_model=IngestResponse)
def ingest_youtube_endpoint(request: IngestYoutubeRequest) -> IngestResponse:
    """
    Fetch a YouTube video's transcript and ingest it into the RAG pipeline.

    The video ID is extracted from the URL, the transcript is fetched via
    youtube-transcript-api, then chunked → embedded → stored.
    """
    try:
        result = ingest_youtube(request.session_id, request.youtube_url)
        return IngestResponse(
            success=result.success,
            chunk_count=result.chunk_count,
            source_name=result.source_name,
            error=result.error,
        )
    except Exception as exc:
        logger.error("YouTube ingestion endpoint error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/api/py/ingest/url", response_model=IngestResponse)
def ingest_url_endpoint(request: IngestUrlRequest) -> IngestResponse:
    """
    Scrape a web page and ingest its text content into the RAG pipeline.

    The URL is fetched via httpx, HTML is stripped with BeautifulSoup,
    and the clean text is chunked → embedded → stored.

    Requirements: URL must start with http:// or https://
    """
    try:
        result = ingest_url(request.session_id, request.url)
        return IngestResponse(
            success=result.success,
            chunk_count=result.chunk_count,
            source_name=result.source_name,
            error=result.error,
        )
    except Exception as exc:
        logger.error("URL ingestion endpoint error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/api/py/ingest/status/{session_id}", response_model=SessionInfoResponse)
def get_ingest_status(session_id: str) -> SessionInfoResponse:
    """
    Get the ingestion status for a session.

    Returns the number of indexed chunks, the list of source names,
    and whether any data has been ingested.
    """
    info = get_session_info(session_id)
    return SessionInfoResponse(**info)


@router.delete("/api/py/ingest/{session_id}")
def clear_session(session_id: str) -> dict:
    """
    Delete all ingested data for a session (ChromaDB + SQLite).

    This is a destructive operation. The frontend calls this when the
    user clicks "Clear session" or starts a new research session.
    """
    vector_deleted = delete_session(session_id)

    try:
        delete_db_session(session_id)
    except Exception as exc:
        logger.warning("Could not delete DB session '%s': %s", session_id, exc)

    status = "deleted" if vector_deleted else "not_found"
    return {"status": status, "session_id": session_id}
