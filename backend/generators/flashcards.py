"""
generators/flashcards.py
========================
Generates a structured set of Q&A flashcards from retrieved RAG chunks.

Public API:
    generate_flashcards(chunks) → FlashcardsResult
"""

import json
import logging
import re
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

from core.gemini_client import gemini_client, GENERATION_MODEL
from core.prompts import FLASHCARDS_SYSTEM_PROMPT
from rag.retriever import RetrievedChunk, format_context_block

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------

@dataclass
class Flashcard:
    """A single flashcard with a question (front) and answer (back)."""
    id: int
    front: str          # Question or term
    back: str           # Answer or definition
    category: str       # Topic category
    difficulty: str     # "easy" | "medium" | "hard"


@dataclass
class FlashcardsResult:
    """
    The complete output of generate_flashcards().

    Attributes:
        flashcards:  List of Flashcard objects.
        total:       Total number of cards generated.
        categories:  Unique topic categories across all cards.
        raw_markdown:If JSON parsing fails, the raw AI response is stored here.
        error:       Set if generation failed entirely.
    """
    flashcards: List[Flashcard] = field(default_factory=list)
    total: int = 0
    categories: List[str] = field(default_factory=list)
    raw_markdown: Optional[str] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "flashcards": [vars(card) for card in self.flashcards],
            "total": self.total,
            "categories": self.categories,
            "raw_markdown": self.raw_markdown,
            "error": self.error,
        }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_flashcards(chunks: List[RetrievedChunk]) -> FlashcardsResult:
    """
    Produce a set of flashcards covering key concepts from the content.

    The AI is instructed to return strict JSON (see FLASHCARDS_SYSTEM_PROMPT).
    If JSON parsing fails (e.g., the model wraps output in markdown fences),
    we fall back to returning the raw text in raw_markdown so the frontend
    can still display it gracefully.

    Args:
        chunks: List of RetrievedChunk objects from rag.retriever.retrieve().
                Recommend top_k >= 15 for comprehensive card coverage.

    Returns:
        FlashcardsResult with parsed cards or a fallback raw_markdown string.
    """
    if not chunks:
        return FlashcardsResult(
            error="No content ingested. Upload a document or add a source first."
        )

    context_block = format_context_block(chunks)

    prompt = (
        f"{FLASHCARDS_SYSTEM_PROMPT}\n\n"
        f"{context_block}\n\n"
        "Generate a comprehensive set of flashcards from the content above. "
        "Return ONLY valid JSON — no markdown code fences."
    )

    logger.info("Generating flashcards from %d chunks", len(chunks))

    try:
        response = gemini_client.models.generate_content(
            model=GENERATION_MODEL,
            contents=prompt,
        )
        raw_text = response.text.strip()
    except Exception as exc:
        logger.error("Flashcard generation API call failed: %s", exc)
        return FlashcardsResult(error=f"AI generation failed: {exc}")

    # --- Parse JSON response ---
    # Remove markdown code fences if the model included them despite instructions
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        data = json.loads(cleaned)
        cards = [
            Flashcard(
                id=card.get("id", i + 1),
                front=card.get("front", ""),
                back=card.get("back", ""),
                category=card.get("category", "General"),
                difficulty=card.get("difficulty", "medium"),
            )
            for i, card in enumerate(data.get("flashcards", []))
        ]
        return FlashcardsResult(
            flashcards=cards,
            total=data.get("total", len(cards)),
            categories=data.get("categories", list({c.category for c in cards})),
        )
    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        # JSON parsing failed — return raw text as fallback
        logger.warning("Could not parse flashcards JSON (%s); returning raw text.", exc)
        return FlashcardsResult(
            raw_markdown=raw_text,
            total=0,
            error=f"JSON parsing failed: {exc}. Raw output is in 'raw_markdown'.",
        )
