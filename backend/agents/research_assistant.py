"""
Research Assistant — RAG-powered conversational agent.

Uses the RAG engine for semantic retrieval of relevant document chunks,
then generates grounded responses with Gemini.
"""

import os
from google import genai
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

from agents.rag_engine import query as rag_query

load_dotenv(dotenv_path="../.env.local")

api_key = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None


class ChatMessage(BaseModel):
    role: str
    content: str


SYSTEM_PROMPT = """You are a highly capable AI Research Assistant. You help users analyze documents, YouTube videos, and other content that has been uploaded to your knowledge base.

**IMPORTANT RULES:**
1. When context chunks are provided below, base your answers primarily on that retrieved context.
2. Cite the source of information when available (e.g., "According to [source_name]...").
3. If the context doesn't contain enough information to fully answer, say so clearly and offer what you can based on available context.
4. You can generate summaries, notes, mind maps, flashcards, quizzes, deck reports, and answer questions.
5. Format your responses in clean Markdown for readability.
6. If no context is available and no documents have been ingested, respond helpfully based on your general knowledge but note that no documents are loaded."""


def generate_assistant_response(
    messages: List[ChatMessage],
    session_id: str = "",
    top_k: int = 5,
) -> str:
    """
    Generate a response using RAG retrieval + Gemini generation.

    1. Extract the latest user message as the query
    2. Retrieve relevant chunks from the vector store
    3. Build an augmented prompt with retrieved context
    4. Generate a grounded response
    """
    if not client:
        return "Error: GEMINI_API_KEY is missing from .env.local file."

    # Extract the latest user query for retrieval
    latest_query = ""
    for msg in reversed(messages):
        if msg.role == "user":
            latest_query = msg.content
            break

    if not latest_query:
        return "Please send a message to get started."

    # --- RAG RETRIEVAL ---
    retrieved_chunks = []
    if session_id:
        try:
            retrieved_chunks = rag_query(session_id, latest_query, top_k=top_k)
        except Exception as e:
            # If retrieval fails, continue without context
            retrieved_chunks = []

    # --- BUILD AUGMENTED PROMPT ---
    prompt = SYSTEM_PROMPT + "\n\n"

    # Add retrieved context
    if retrieved_chunks:
        prompt += "--- RETRIEVED CONTEXT (from ingested documents) ---\n"
        for i, chunk in enumerate(retrieved_chunks):
            source = chunk.get("source", "unknown")
            score = chunk.get("score", 0)
            text = chunk.get("text", "")
            prompt += f"\n[Chunk {i+1} | Source: {source} | Relevance: {score:.0%}]\n{text}\n"
        prompt += "\n--- END OF RETRIEVED CONTEXT ---\n\n"
    else:
        prompt += "[No documents have been ingested yet. Responding with general knowledge.]\n\n"

    # Add conversation history (keep last 10 turns to manage context window)
    history_limit = 20  # 10 user + 10 assistant turns
    recent_messages = messages[-history_limit:]

    prompt += "--- CONVERSATION HISTORY ---\n"
    for msg in recent_messages:
        role = "User" if msg.role == "user" else "Assistant"
        prompt += f"{role}: {msg.content}\n"

    prompt += "Assistant:"

    # --- GENERATE ---
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        return response.text
    except Exception as e:
        return f"Error communicating with AI: {str(e)}"
