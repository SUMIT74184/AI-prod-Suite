"""
core/gemini_client.py
=====================
Single point of construction for the Google Gemini client.

Every module in this project should import 'gemini_client' from here
instead of reading the environment variable themselves. This ensures:
  - The API key is read exactly once at startup.
  - A clear error is raised immediately if the key is missing.
  - Mocking in tests is trivial (patch this one module).
"""

import os
from google import genai
from dotenv import load_dotenv

# Load .env.local from the project root (one level above backend/)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env.local"))

# ---------------------------------------------------------------------------
# Gemini client — raises RuntimeError at import time if key is absent
# ---------------------------------------------------------------------------

_api_key = os.environ.get("GEMINI_API_KEY", "").strip()

if not _api_key:
    raise RuntimeError(
        "GEMINI_API_KEY is not set. "
        "Add it to your .env.local file: GEMINI_API_KEY=your_key_here"
    )

# This is the single shared client instance used across the entire backend.
gemini_client = genai.Client(api_key=_api_key)

# ---------------------------------------------------------------------------
# Model names — change here to upgrade all usages at once
# ---------------------------------------------------------------------------

GENERATION_MODEL = "gemini-2.5-flash"   # Used for text generation
EMBEDDING_MODEL  = "text-embedding-004" # Used for embeddings (dim=768)
EMBEDDING_DIM    = 768
