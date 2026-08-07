"""
web_research_agent/tools.py
============================
Pure tool functions used by the graph nodes.

These are NOT LangChain tools (no @tool decorator needed here because
we call them directly from node functions). Keeping them in a separate
file means:
    - Easy to test in isolation (just call the function).
    - Easy to swap implementations (e.g., replace DuckDuckGo with another
      search engine without touching nodes.py).
    - Clear boundary: tools do I/O, nodes do logic.

Public API:
    web_search(query, max_results) → List[SearchResult]
    fetch_page_content(url)        → PageContent
"""

import logging
import re
from typing import List

import httpx
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS

from web_research_agent.state import SearchResult, PageContent

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Max characters of text to extract per page.
# Keeps token usage reasonable when we pass content to Gemini.
MAX_PAGE_CHARS = 4000

# HTTP timeout for page fetches (seconds)
PAGE_FETCH_TIMEOUT = 15

# User-agent sent with page fetches
USER_AGENT = (
    "Mozilla/5.0 (compatible; ResearchAgent/1.0; "
    "+https://github.com/your-repo)"
)


# ---------------------------------------------------------------------------
# Tool: Web Search
# ---------------------------------------------------------------------------

def web_search(query: str, max_results: int = 6) -> List[SearchResult]:
    """
    Search the web using DuckDuckGo and return structured results.

    Args:
        query:       The search query string.
        max_results: Maximum number of results to fetch (default 6).

    Returns:
        List of SearchResult dataclasses with title, url, and snippet.
        Returns an empty list on error (caller decides how to handle).
    """
    logger.info("Searching DuckDuckGo: '%s' (max=%d)", query, max_results)

    try:
        with DDGS() as ddgs:
            raw_results = list(ddgs.text(query, max_results=max_results))

        results = [
            SearchResult(
                title=r.get("title", "No title"),
                url=r.get("href", ""),
                snippet=r.get("body", ""),
            )
            for r in raw_results
            if r.get("href")   # Skip results with no URL
        ]

        logger.info("Got %d results for query: '%s'", len(results), query)
        return results

    except Exception as exc:
        logger.error("DuckDuckGo search failed for '%s': %s", query, exc)
        return []


# ---------------------------------------------------------------------------
# Tool: Fetch Page Content
# ---------------------------------------------------------------------------

def fetch_page_content(url: str) -> PageContent:
    """
    Download a web page and extract its readable text content.

    Steps:
        1. GET the URL with a browser-like user agent.
        2. Parse HTML with BeautifulSoup.
        3. Remove non-content tags (nav, script, style, footer, etc.).
        4. Extract and clean visible text.
        5. Truncate to MAX_PAGE_CHARS to stay within token budgets.

    Args:
        url: The full URL to fetch (must start with http/https).

    Returns:
        PageContent dataclass. On error, returns a PageContent with
        empty text and word_count=0 so the node can skip it gracefully.
    """
    logger.info("Fetching page: %s", url)

    try:
        response = httpx.get(
            url,
            headers={"User-Agent": USER_AGENT},
            follow_redirects=True,
            timeout=PAGE_FETCH_TIMEOUT,
        )
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "lxml")

        # Extract page title
        title = soup.title.string.strip() if soup.title else url

        # Remove non-content elements
        for tag in soup(["script", "style", "nav", "header",
                          "footer", "aside", "form", "iframe"]):
            tag.decompose()

        # Extract and clean text
        text = soup.get_text(separator="\n", strip=True)

        # Collapse 3+ consecutive blank lines into 2
        text = re.sub(r"\n{3,}", "\n\n", text)

        # Truncate
        text = text[:MAX_PAGE_CHARS]

        word_count = len(text.split())
        logger.info("Fetched '%s' — %d words", url, word_count)

        return PageContent(url=url, title=title, text=text, word_count=word_count)

    except Exception as exc:
        logger.warning("Failed to fetch '%s': %s", url, exc)
        return PageContent(url=url, title=url, text="", word_count=0)
