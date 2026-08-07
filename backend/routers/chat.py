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
from pydantic import BaseModel

from core.gemini_client import gemini_client, GENERATION_MODEL
from core.prompts import CHAT_SYSTEM_PROMPT
from rag.retriever import retrieve, format_context_block
from database import get_session, create_session, add_message

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


class ChatResponse(BaseModel):
    reply: str


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/api/py/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    """
    Generate a RAG-augmented conversational response.

    Flow:
        1. Extract the latest user message as the retrieval query.
        2. Retrieve relevant chunks from the vector store (top_k).
        3. Build an augmented prompt with system instructions, context, and history.
        4. Call Gemini to generate the reply.
        5. Save user message + AI reply to SQLite.
        6. Return the reply.
    """
    # --- Extract latest user message ---
    latest_user_message = ""
    for msg in reversed(request.messages):
        if msg.role == "user":
            latest_user_message = msg.content
            break

    if not latest_user_message:
        return ChatResponse(reply="Please send a message to get started.")

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

    # --- Generate ---
    try:
        response = gemini_client.models.generate_content(
            model=GENERATION_MODEL,
            contents=full_prompt,
        )
        reply = response.text
    except Exception as exc:
        logger.error("Gemini generation failed: %s", exc)
        reply = f"Error communicating with AI: {exc}"

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
        add_message(request.session_id, "assistant", reply)
    except Exception as exc:
        # DB errors should not break the API response
        logger.error("Failed to persist chat to DB: %s", exc)

    return ChatResponse(reply=reply)
