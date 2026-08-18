"""
core/llm_client.py
==================
Agnostic LLM text generation client for the entire backend.

Priority order:
    1. OpenRouter (OPENROUTER_API_KEY set) — supports 200+ models, incl. free ones
    2. Google Gemini (GEMINI_API_KEY set) — native SDK

All backend modules (generators, web_research_agent, routers/chat)
should import `generate_text` from here instead of calling gemini_client
directly. This makes switching providers transparent to all callers.

Usage:
    from core.llm_client import generate_text

    text = generate_text("Write a haiku about Python.")
"""

import os
import json
import logging
from typing import Generator
import httpx
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env.local"))

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Read keys at import time (fail fast if neither is configured)
# ---------------------------------------------------------------------------

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "").strip()
OPENROUTER_MODEL   = os.environ.get("OPENROUTER_MODEL", "nvidia/nemotron-3-ultra-550b-a55b:free").strip()
SITE_URL           = os.environ.get("SITE_URL", "http://localhost:3000")
SITE_NAME          = os.environ.get("SITE_NAME", "AI Productivity Suite")

# Lazy-import gemini only when needed so the backend doesn't crash if
# google-genai isn't installed when OpenRouter is being used.
_gemini_client = None
_GEMINI_MODEL  = None

def _get_gemini():
    """Lazily initialise and return (gemini_client, model_name)."""
    global _gemini_client, _GEMINI_MODEL
    if _gemini_client is None:
        from app.core.gemini_client import gemini_client, GENERATION_MODEL
        _gemini_client = gemini_client
        _GEMINI_MODEL  = GENERATION_MODEL
    return _gemini_client, _GEMINI_MODEL


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_text(prompt: str, model: str = "") -> str:
    """
    Generate text using the best available LLM provider.

    Args:
        prompt: The full prompt to send to the model.
        model:  Optional model override. If empty, uses OPENROUTER_MODEL or
                GENERATION_MODEL depending on which provider is active.

    Returns:
        The generated text as a string.

    Raises:
        RuntimeError if no API key is configured.
    """
    if OPENROUTER_API_KEY:
        return _generate_via_openrouter(prompt, model or OPENROUTER_MODEL)
    else:
        return _generate_via_gemini(prompt)


def generate_text_stream(prompt: str, model: str = "") -> Generator[str, None, None]:
    """
    Generate text using the best available LLM provider and stream the response.

    Args:
        prompt: The full prompt to send to the model.
        model:  Optional model override. If empty, uses OPENROUTER_MODEL or
                GENERATION_MODEL depending on which provider is active.

    Yields:
        Chunks of generated text as they become available.
    """
    if OPENROUTER_API_KEY:
        yield from _generate_via_openrouter_stream(prompt, model or OPENROUTER_MODEL)
    else:
        yield from _generate_via_gemini_stream(prompt)


def get_active_provider() -> str:
    """Return a human-readable string describing the active LLM provider."""
    if OPENROUTER_API_KEY:
        return f"OpenRouter ({OPENROUTER_MODEL})"
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if gemini_key:
        return "Google Gemini"
    return "None — no API key configured"


# ---------------------------------------------------------------------------
# Internal: OpenRouter
# ---------------------------------------------------------------------------

def _generate_via_openrouter(prompt: str, model: str) -> str:
    """Call OpenRouter's OpenAI-compatible /chat/completions endpoint."""
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": SITE_URL,
        "X-Title": SITE_NAME,
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
    }

    logger.info("[llm_client] OpenRouter → model=%s prompt_len=%d", model, len(prompt))

    with httpx.Client(timeout=90.0) as client:
        res = client.post(url, headers=headers, json=payload)
        res.raise_for_status()
        data = res.json()

    if "error" in data:
        err_detail = data["error"]
        if isinstance(err_detail, dict):
            err_msg = err_detail.get("message", str(err_detail))
        else:
            err_msg = str(err_detail)
        raise RuntimeError(f"OpenRouter API error: {err_msg}")

    if "choices" not in data or not data["choices"]:
        raise RuntimeError(f"OpenRouter returned response without choices: {data}")

    content = data["choices"][0]["message"]["content"]
    logger.info("[llm_client] OpenRouter reply len=%d", len(content))
    return content


def _generate_via_openrouter_stream(prompt: str, model: str) -> Generator[str, None, None]:
    """Call OpenRouter's OpenAI-compatible /chat/completions endpoint with streaming."""
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": SITE_URL,
        "X-Title": SITE_NAME,
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": True,
    }

    logger.info("[llm_client] OpenRouter stream → model=%s prompt_len=%d", model, len(prompt))

    with httpx.Client(timeout=90.0) as client:
        with client.stream("POST", url, headers=headers, json=payload) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                if not line:
                    continue
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        data = json.loads(data_str)
                        if "choices" in data and data["choices"]:
                            delta = data["choices"][0].get("delta", {})
                            chunk = delta.get("content", "")
                            if chunk:
                                yield chunk
                    except Exception as e:
                        logger.warning("[llm_client] Failed to parse OpenRouter SSE chunk: %s", e)


# ---------------------------------------------------------------------------
# Internal: Google Gemini (fallback)
# ---------------------------------------------------------------------------

def _generate_via_gemini(prompt: str) -> str:
    """Call Google Gemini via the google-genai SDK."""
    client, model = _get_gemini()
    logger.info("[llm_client] Gemini → model=%s prompt_len=%d", model, len(prompt))
    response = client.models.generate_content(model=model, contents=prompt)
    return response.text


def _generate_via_gemini_stream(prompt: str) -> Generator[str, None, None]:
    """Call Google Gemini stream via the google-genai SDK."""
    client, model = _get_gemini()
    logger.info("[llm_client] Gemini stream → model=%s prompt_len=%d", model, len(prompt))
    response = client.models.generate_content_stream(model=model, contents=prompt)
    for chunk in response:
        if chunk.text:
            yield chunk.text
