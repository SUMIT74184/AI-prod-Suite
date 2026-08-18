"""
config.py
=========
Centralized configuration for the AI Productivity Suite backend.

Reads from environment variables (loaded from .env in the backend root).
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Load .env from the backend root (one level above this file)
# ---------------------------------------------------------------------------
BACKEND_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_ROOT / ".env")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
DATA_DIR = BACKEND_ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)

DATABASE_PATH = os.getenv("DATABASE_PATH", str(DATA_DIR / "chat_history.db"))
CHROMA_DATA_DIR = str(DATA_DIR / "chroma_data")

# ---------------------------------------------------------------------------
# LLM Providers
# ---------------------------------------------------------------------------
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-exp:free")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

# ---------------------------------------------------------------------------
# Server
# ---------------------------------------------------------------------------
PORT = int(os.getenv("PORT", "8000"))
SITE_URL = os.getenv("SITE_URL", "http://localhost:3000")
SITE_NAME = os.getenv("SITE_NAME", "AI Productivity Suite")
