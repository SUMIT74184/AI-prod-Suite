"""
RAG Engine — Core Retrieval-Augmented Generation module.

Handles document ingestion (chunking + embedding + storage) and
semantic retrieval for the Research Assistant.

Uses:
  - ChromaDB (local persistent) for vector storage
  - Gemini text-embedding-004 for embeddings
  - langchain-text-splitters for smart chunking
  - PyMuPDF / python-docx for document parsing
"""

import os
import re
import uuid
import logging
from typing import List, Optional, Dict, Any

import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from google import genai
from dotenv import load_dotenv

# pyrefly: ignore [missing-import]
from youtube_transcript_api import YouTubeTranscriptApi

load_dotenv(dotenv_path="../.env.local")

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Gemini client
# ---------------------------------------------------------------------------
api_key = os.environ.get("GEMINI_API_KEY")
gemini_client = genai.Client(api_key=api_key) if api_key else None

EMBEDDING_MODEL = "text-embedding-004"
EMBEDDING_DIM = 768  # text-embedding-004 output dimension

# ---------------------------------------------------------------------------
# ChromaDB — persistent local store
# ---------------------------------------------------------------------------
CHROMA_DIR = os.path.join(os.path.dirname(__file__), "..", "chroma_data")

chroma_client = chromadb.PersistentClient(path=os.path.abspath(CHROMA_DIR))

# ---------------------------------------------------------------------------
# Text splitter
# ---------------------------------------------------------------------------
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=2000,       # ~500 tokens
    chunk_overlap=200,     # ~50 tokens overlap
    length_function=len,
    separators=["\n\n", "\n", ". ", " ", ""],
)


# ===================================================================
# EMBEDDING HELPERS
# ===================================================================

def _embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed a batch of texts using Gemini text-embedding-004."""
    if not gemini_client:
        raise RuntimeError("GEMINI_API_KEY is not set — cannot generate embeddings.")

    embeddings: List[List[float]] = []
    # Gemini embed_content supports batching, but we batch in groups of 100
    # to stay well within API limits.
    batch_size = 100
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        result = gemini_client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=batch,
        )
        for emb in result.embeddings:
            embeddings.append(emb.values)
    return embeddings


def _embed_query(text: str) -> List[float]:
    """Embed a single query string."""
    return _embed_texts([text])[0]


# ===================================================================
# DOCUMENT PARSERS
# ===================================================================

def _extract_text_from_pdf(file_path: str) -> str:
    """Extract text from a PDF file using PyMuPDF."""
    import fitz  # pymupdf

    doc = fitz.open(file_path)
    pages: List[str] = []
    for page in doc:
        pages.append(page.get_text())
    doc.close()
    return "\n\n".join(pages)


def _extract_text_from_docx(file_path: str) -> str:
    """Extract text from a DOCX file using python-docx."""
    import docx

    doc = docx.Document(file_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)


def _extract_text_from_txt(file_path: str) -> str:
    """Read plain text file."""
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def extract_text_from_file(file_path: str) -> str:
    """Route to the correct parser based on file extension."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return _extract_text_from_pdf(file_path)
    elif ext == ".docx":
        return _extract_text_from_docx(file_path)
    elif ext == ".txt":
        return _extract_text_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


# ===================================================================
# YOUTUBE TRANSCRIPT
# ===================================================================

def extract_video_id(url: str) -> Optional[str]:
    """Extract YouTube video ID from a URL."""
    pattern = r'(?:v=|\/)([0-9A-Za-z_-]{11}).*'
    match = re.search(pattern, url)
    return match.group(1) if match else None


def get_youtube_transcript(video_id: str) -> str:
    """Fetch the transcript for a YouTube video."""
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        return " ".join([t["text"] for t in transcript])
    except Exception as e:
        raise RuntimeError(f"Failed to retrieve YouTube transcript: {e}")


# ===================================================================
# COLLECTION HELPERS
# ===================================================================

def _get_collection_name(session_id: str) -> str:
    """Generate a valid ChromaDB collection name from session_id."""
    # ChromaDB collection names: 3-63 chars, start/end with alphanum,
    # allowed chars: a-z, A-Z, 0-9, _, -
    name = f"session-{session_id}"
    # Ensure valid length
    return name[:63]


def _get_or_create_collection(session_id: str):
    """Get or create a ChromaDB collection for the session."""
    name = _get_collection_name(session_id)
    return chroma_client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"},
    )


# ===================================================================
# INGEST API
# ===================================================================

def ingest_text(
    session_id: str,
    text: str,
    source_name: str = "unknown",
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Chunk text, embed it, and store in ChromaDB.

    Returns:
        Dict with ingestion stats (chunk_count, source_name).
    """
    if not text or not text.strip():
        return {"chunk_count": 0, "source_name": source_name, "error": "Empty text"}

    # Chunk the text
    chunks = text_splitter.split_text(text)
    if not chunks:
        return {"chunk_count": 0, "source_name": source_name, "error": "No chunks produced"}

    logger.info(f"Ingesting {len(chunks)} chunks from '{source_name}' into session '{session_id}'")

    # Generate embeddings
    embeddings = _embed_texts(chunks)

    # Prepare IDs and metadata
    ids = [f"{source_name}-{uuid.uuid4().hex[:8]}" for _ in chunks]
    metadatas = [
        {
            "source": source_name,
            "chunk_index": i,
            "total_chunks": len(chunks),
            **(metadata or {}),
        }
        for i in range(len(chunks))
    ]

    # Store in ChromaDB
    collection = _get_or_create_collection(session_id)
    collection.add(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=metadatas,
    )

    logger.info(f"Successfully ingested {len(chunks)} chunks from '{source_name}'")
    return {"chunk_count": len(chunks), "source_name": source_name}


def ingest_file(session_id: str, file_path: str) -> Dict[str, Any]:
    """Extract text from a file and ingest it into the RAG pipeline."""
    source_name = os.path.basename(file_path)
    text = extract_text_from_file(file_path)
    return ingest_text(session_id, text, source_name=source_name)


def ingest_youtube(session_id: str, youtube_url: str) -> Dict[str, Any]:
    """Fetch a YouTube transcript and ingest it into the RAG pipeline."""
    video_id = extract_video_id(youtube_url)
    if not video_id:
        return {"chunk_count": 0, "source_name": youtube_url, "error": "Invalid YouTube URL"}

    transcript = get_youtube_transcript(video_id)
    source_name = f"youtube-{video_id}"
    return ingest_text(session_id, transcript, source_name=source_name, metadata={"type": "youtube", "video_id": video_id})


# ===================================================================
# RETRIEVAL API
# ===================================================================

def query(session_id: str, question: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Retrieve the top-K most relevant chunks for a question.

    Returns:
        List of dicts with keys: text, source, score, chunk_index
    """
    collection = _get_or_create_collection(session_id)

    # Check if collection has any data
    if collection.count() == 0:
        return []

    # Embed the question
    query_embedding = _embed_query(question)

    # Query ChromaDB
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count()),
        include=["documents", "metadatas", "distances"],
    )

    # Format results
    retrieved = []
    if results and results["documents"] and results["documents"][0]:
        for i, doc in enumerate(results["documents"][0]):
            meta = results["metadatas"][0][i] if results["metadatas"] else {}
            distance = results["distances"][0][i] if results["distances"] else 0.0
            # ChromaDB cosine distance: 0 = identical, 2 = opposite
            # Convert to similarity score (1 = identical, 0 = orthogonal)
            similarity = 1.0 - (distance / 2.0)
            retrieved.append({
                "text": doc,
                "source": meta.get("source", "unknown"),
                "score": round(similarity, 4),
                "chunk_index": meta.get("chunk_index", -1),
            })

    return retrieved


# ===================================================================
# SESSION MANAGEMENT
# ===================================================================

def get_session_info(session_id: str) -> Dict[str, Any]:
    """Get info about what's been ingested in a session."""
    collection = _get_or_create_collection(session_id)
    count = collection.count()

    sources: List[str] = []
    if count > 0:
        # Get unique sources
        all_meta = collection.get(include=["metadatas"])
        if all_meta and all_meta["metadatas"]:
            sources = list(set(m.get("source", "unknown") for m in all_meta["metadatas"]))

    return {
        "session_id": session_id,
        "total_chunks": count,
        "sources": sources,
        "has_data": count > 0,
    }


def delete_session(session_id: str) -> bool:
    """Delete all data for a session."""
    name = _get_collection_name(session_id)
    try:
        chroma_client.delete_collection(name=name)
        logger.info(f"Deleted session '{session_id}'")
        return True
    except Exception:
        return False
