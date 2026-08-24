"""
rag/ingester.py
===============
Parses source material into text, chunks it, embeds each chunk, and stores
everything in ChromaDB via rag.store.

Supported source types:
    File upload  — PDF (.pdf), Word (.docx), plain text (.txt)
    YouTube URL  — fetches transcript via youtube-transcript-api
    Web URL      — fetches and strips HTML via httpx + BeautifulSoup

Public API:
    ingest_file(session_id, file_path)         → IngestResult
    ingest_youtube(session_id, youtube_url)    → IngestResult
    ingest_url(session_id, web_url)            → IngestResult
    ingest_raw_text(session_id, text, source)  → IngestResult
"""

import os
import re
import uuid
import logging
from dataclasses import dataclass
from typing import Optional, Dict, Any

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.rag.embedder import embed_texts
from app.rag.store import add_chunks

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Text splitter — shared across all source types
# ---------------------------------------------------------------------------

_text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=2000,        # ~500 tokens per chunk
    chunk_overlap=200,      # ~50 token overlap so context isn't lost at boundaries
    length_function=len,
    separators=["\n\n", "\n", ". ", " ", ""],
)


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------

@dataclass
class IngestResult:
    """
    Returned by every ingest_* function.

    Attributes:
        success:     True if at least one chunk was stored.
        chunk_count: Number of chunks indexed.
        source_name: Human-readable label for the ingested source.
        error:       Error message if success is False, else None.
    """
    success: bool
    chunk_count: int
    source_name: str
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "chunk_count": self.chunk_count,
            "source_name": self.source_name,
            "error": self.error,
        }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _chunk_and_store(
    session_id: str,
    text: str,
    source_name: str,
    extra_metadata: Optional[Dict[str, Any]] = None,
) -> IngestResult:
    """
    Common pipeline: text → chunks → embeddings → ChromaDB.

    This function is called by all public ingest_* functions after they
    have extracted raw text from their respective source type.

    Steps:
        1. Split text into overlapping chunks.
        2. Embed all chunks in batches.
        3. Write chunks + embeddings + metadata to ChromaDB.
    """
    text = text.strip()
    if not text:
        return IngestResult(
            success=False,
            chunk_count=0,
            source_name=source_name,
            error="No text content found in the source.",
        )

    # Step 1: Chunk the text
    chunks = _text_splitter.split_text(text)
    if not chunks:
        return IngestResult(
            success=False,
            chunk_count=0,
            source_name=source_name,
            error="Text splitter produced zero chunks.",
        )

    logger.info(
        "Ingesting %d chunks from '%s' into session '%s'",
        len(chunks),
        source_name,
        session_id,
    )

    # Step 2: Embed
    try:
        embeddings = embed_texts(chunks)
    except RuntimeError as exc:
        return IngestResult(
            success=False,
            chunk_count=0,
            source_name=source_name,
            error=f"Embedding failed: {exc}",
        )

    # Step 3: Build IDs and metadata, then store
    ids = [f"{source_name[:30]}-{uuid.uuid4().hex[:8]}" for _ in chunks]
    metadatas = [
        {
            "source": source_name,
            "chunk_index": i,
            "total_chunks": len(chunks),
            **(extra_metadata or {}),
        }
        for i in range(len(chunks))
    ]

    add_chunks(session_id, ids, chunks, embeddings, metadatas)

    logger.info(
        "Successfully stored %d chunks from '%s'",
        len(chunks),
        source_name,
    )
    return IngestResult(success=True, chunk_count=len(chunks), source_name=source_name)


# ---------------------------------------------------------------------------
# File parsers
# ---------------------------------------------------------------------------

def _parse_pdf(file_path: str) -> str:
    """Extract text from a PDF using PyMuPDF (fitz)."""
    import fitz  # pymupdf

    doc = fitz.open(file_path)
    pages = [page.get_text() for page in doc]
    doc.close()
    return "\n\n".join(pages)


def _parse_docx(file_path: str) -> str:
    """Extract text from a Word document using python-docx."""
    import docx

    doc = docx.Document(file_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)


def _parse_txt(file_path: str) -> str:
    """Read a plain text file (UTF-8, with fallback for encoding errors)."""
    with open(file_path, "r", encoding="utf-8", errors="replace") as fh:
        return fh.read()


def _parse_file(file_path: str) -> str:
    """Route to the correct parser based on the file extension."""
    ext = os.path.splitext(file_path)[1].lower()
    parsers = {
        ".pdf":  _parse_pdf,
        ".docx": _parse_docx,
        ".txt":  _parse_txt,
    }
    if ext not in parsers:
        raise ValueError(
            f"Unsupported file type '{ext}'. Supported types: {', '.join(parsers)}"
        )
    return parsers[ext](file_path)


# ---------------------------------------------------------------------------
# YouTube transcript fetcher
# ---------------------------------------------------------------------------

def _extract_youtube_video_id(url: str) -> Optional[str]:
    """Pull the 11-character video ID out of any YouTube URL format."""
    pattern = r"(?:v=|/)([0-9A-Za-z_-]{11})(?:[&?/]|$)"
    match = re.search(pattern, url)
    return match.group(1) if match else None


def _fetch_youtube_transcript(video_id: str) -> str:
    """Fetch and join the transcript for a YouTube video."""
    from youtube_transcript_api import YouTubeTranscriptApi

    transcript_segments = YouTubeTranscriptApi.get_transcript(video_id)  # type: ignore
    # Each segment is {'text': ..., 'start': ..., 'duration': ...}
    return " ".join(seg["text"] for seg in transcript_segments)


# ---------------------------------------------------------------------------
# Web page scraper
# ---------------------------------------------------------------------------

def _fetch_web_page_text(url: str) -> str:
    """
    Download a web page and extract its readable text content.

    Uses httpx for the HTTP request and BeautifulSoup to strip HTML tags,
    navigation, scripts, and other non-content elements.
    """
    import httpx
    from bs4 import BeautifulSoup

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; ResearchAssistantBot/1.0; "
            "+https://github.com/your-repo)"
        )
    }

    # Follow redirects, 20-second timeout
    response = httpx.get(url, headers=headers, follow_redirects=True, timeout=20)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "lxml")

    # Remove non-content tags
    for tag in soup(["script", "style", "nav", "header", "footer", "aside", "form"]):
        tag.decompose()

    # Extract visible text with single-space separation
    text = soup.get_text(separator="\n", strip=True)

    # Collapse excessive blank lines (more than 2 consecutive)
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def ingest_file(session_id: str, file_path: str) -> IngestResult:
    """
    Parse a local file (PDF / DOCX / TXT) and store its chunks in ChromaDB.

    Args:
        session_id: The session to ingest into.
        file_path:  Absolute or relative path to the file on disk.

    Returns:
        IngestResult with success status and chunk count.
    """
    source_name = os.path.basename(file_path)
    try:
        text = _parse_file(file_path)
    except Exception as exc:
        return IngestResult(
            success=False,
            chunk_count=0,
            source_name=source_name,
            error=str(exc),
        )
    return _chunk_and_store(session_id, text, source_name)


def ingest_youtube(session_id: str, youtube_url: str) -> IngestResult:
    """
    Fetch a YouTube video transcript and store its chunks in ChromaDB.

    Args:
        session_id:   The session to ingest into.
        youtube_url:  Any valid YouTube video URL.

    Returns:
        IngestResult with success status and chunk count.
    """
    video_id = _extract_youtube_video_id(youtube_url)
    if not video_id:
        return IngestResult(
            success=False,
            chunk_count=0,
            source_name=youtube_url,
            error="Could not extract a video ID from the provided URL.",
        )

    source_name = f"youtube-{video_id}"
    try:
        transcript = _fetch_youtube_transcript(video_id)
    except Exception as exc:
        return IngestResult(
            success=False,
            chunk_count=0,
            source_name=source_name,
            error=f"Transcript fetch failed: {exc}",
        )

    return _chunk_and_store(
        session_id,
        transcript,
        source_name,
        extra_metadata={"type": "youtube", "video_id": video_id, "url": youtube_url},
    )


def ingest_url(session_id: str, web_url: str) -> IngestResult:
    """
    Scrape a web page and store its text content as chunks in ChromaDB.

    Args:
        session_id: The session to ingest into.
        web_url:    The full URL of the page to scrape (must start with http/https).

    Returns:
        IngestResult with success status and chunk count.
    """
    # Strip trailing whitespace / newlines from copy-pasted URLs
    web_url = web_url.strip()

    if not web_url.startswith(("http://", "https://")):
        return IngestResult(
            success=False,
            chunk_count=0,
            source_name=web_url,
            error="URL must start with http:// or https://",
        )

    # Use the domain as the source name for readability
    try:
        from urllib.parse import urlparse
        source_name = urlparse(web_url).netloc or web_url
    except Exception:
        source_name = web_url

    try:
        text = _fetch_web_page_text(web_url)
    except Exception as exc:
        return IngestResult(
            success=False,
            chunk_count=0,
            source_name=source_name,
            error=f"Web page fetch failed: {exc}",
        )

    return _chunk_and_store(
        session_id,
        text,
        source_name,
        extra_metadata={"type": "web_url", "url": web_url},
    )


def ingest_raw_text(
    session_id: str,
    text: str,
    source_name: str = "manual-input",
) -> IngestResult:
    """
    Ingest arbitrary text directly (useful for testing or pasted content).

    Args:
        session_id:  The session to ingest into.
        text:        The raw text content to ingest.
        source_name: A human-readable label for this content.

    Returns:
        IngestResult with success status and chunk count.
    """
    return _chunk_and_store(session_id, text, source_name)
