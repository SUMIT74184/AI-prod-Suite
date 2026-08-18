"""
core/gemini_client.py
=====================
Single point of construction for the Google Gemini client.

Every module in this project should import 'gemini_client' from here
instead of reading the environment variable themselves. This ensures:
  - The API key is read exactly once at startup.
  - A clear error is raised immediately if the key is missing.
  - Mocking in tests is trivial (patch this one module).

NOTE: If OPENROUTER_API_KEY is configured, GEMINI_API_KEY is optional.
Callers should prefer importing generate_text from core.llm_client instead,
which transparently routes to OpenRouter or Gemini based on configuration.
"""

import os
from dotenv import load_dotenv

# Load .env.local from the project root (one level above backend/)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env.local"))

# ---------------------------------------------------------------------------
# Gemini client — only fails if BOTH Gemini and OpenRouter keys are absent
# ---------------------------------------------------------------------------

_api_key = os.environ.get("GEMINI_API_KEY", "").strip()
_openrouter_key = os.environ.get("OPENROUTER_API_KEY", "").strip()

if not _api_key and not _openrouter_key:
    raise RuntimeError(
        "No LLM API key found. Set either:\n"
        "  GEMINI_API_KEY=your_key_here   (in .env.local)\n"
        "  OPENROUTER_API_KEY=your_key_here  (in .env.local)\n"
        "Get a free OpenRouter key at: https://openrouter.ai"
    )

# ---------------------------------------------------------------------------
# Lazy Gemini client — only initialised if GEMINI_API_KEY is present
# ---------------------------------------------------------------------------

gemini_client = None
GENERATION_MODEL = "gemini-2.5-flash"   # Used for text generation
EMBEDDING_MODEL  = "text-embedding-004" # Used for embeddings (dim=768)
EMBEDDING_DIM    = 768

if _api_key:
    from google import genai as _genai
    gemini_client = _genai.Client(api_key=_api_key)
