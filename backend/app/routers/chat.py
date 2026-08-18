"""
routers/chat.py
===============
FastAPI router for the Research Assistant chat endpoint.

Endpoint:
    POST /api/py/chat  → ChatResponse

The router is a thin HTTP layer — it:
    1. Validates the incoming request (Pydantic).
    2. Retrieves relevant chunks from the RAG pipeline.
    3. Builds an augmented prompt (system + context + history).
    4. Calls Gemini to generate the reply.
    5. Persists the exchange to SQLite via database.py.
    6. Returns the reply.

No business logic lives here — that belongs in rag/ and core/.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.llm_client import generate_text_stream
from app.core.prompts import CHAT_SYSTEM_PROMPT
from app.rag.retriever import retrieve, format_context_block
from app.core.database import get_session, create_session, add_message

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    """A single message in the conversation history."""
    role: str     # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]   # Full conversation history (newest message last)
    session_id: str               # Identifies the ChromaDB collection and DB session
    user_id: str                  # Used for session ownership / listing
    module: Optional[str] = "research-assistant"
    top_k: Optional[int] = 5     # Number of RAG chunks to retrieve for context


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/api/py/chat")
def chat(request: ChatRequest) -> StreamingResponse:
    """
    Generate a RAG-augmented conversational response.

    Flow:
        1. Extract the latest user message as the retrieval query.
        2. Retrieve relevant chunks from the vector store (top_k).
        3. Build an augmented prompt with system instructions, context, and history.
        4. Call Gemini or OpenRouter stream to generate the reply.
        5. Save user message + AI reply to SQLite after stream completes.
        6. Return the stream response.
    """
    # --- Extract latest user message ---
    latest_user_message = ""
    for msg in reversed(request.messages):
        if msg.role == "user":
            latest_user_message = msg.content
            break

    if not latest_user_message:
        def empty_generator():
            yield "Please send a message to get started."
        return StreamingResponse(empty_generator(), media_type="text/plain")

    # --- RAG Retrieval ---
    retrieved_chunks = []
    if request.session_id:
        retrieved_chunks = retrieve(
            session_id=request.session_id,
            question=latest_user_message,
            top_k=request.top_k or 5,
        )

    # --- Build augmented prompt ---
    context_block = format_context_block(retrieved_chunks)

    # Start with the system prompt
    prompt_parts = [CHAT_SYSTEM_PROMPT, ""]

    # Add context (or a note that no documents are loaded)
    if context_block:
        prompt_parts.append(context_block)
    else:
        prompt_parts.append(
            "[No documents have been ingested yet. "
            "Responding with general knowledge.]"
        )

    # Add conversation history (last 20 turns = 10 user + 10 assistant)
    prompt_parts.append("\n--- CONVERSATION HISTORY ---")
    recent_messages = request.messages[-20:]
    for msg in recent_messages:
        role_label = "User" if msg.role == "user" else "Assistant"
        prompt_parts.append(f"{role_label}: {msg.content}")

    prompt_parts.append("Assistant:")
    full_prompt = "\n".join(prompt_parts)

    # --- Generate Stream and Persist on Completion ---
    def generate_stream():
        full_reply = ""
        try:
            for chunk in generate_text_stream(full_prompt):
                full_reply += chunk
                yield chunk
        except Exception as exc:
            logger.error("LLM stream generation failed: %s", exc)
            yield f"\n[Error communicating with AI: {exc}]"
            return

        # --- Persist to SQLite ---
        try:
            db_session = get_session(request.session_id)
            if not db_session:
                title = latest_user_message[:40]
                if len(latest_user_message) > 40:
                    title += "..."
                create_session(
                    request.session_id,
                    request.user_id,
                    title,
                    request.module,
                )
            add_message(request.session_id, "user", latest_user_message)
            add_message(request.session_id, "assistant", full_reply)
        except Exception as exc:
            logger.error("Failed to persist stream chat to DB: %s", exc)

    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering for SSE/streaming
        }
    )
