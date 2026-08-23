"""
tools/search_engine.py
======================
DuckDuckGo search wrapper.
"""

import logging
from typing import List

from duckduckgo_search import DDGS

from app.web_research_agent.state import SearchResult

logger = logging.getLogger(__name__)


def web_search(query: str, max_results: int = 6) -> List[SearchResult]:
    """
    Search the web using DuckDuckGo and return structured results.

    Args:
        query:       The search query string.
        max_results: Maximum number of results to fetch (default 6).

    Returns:
        List of SearchResult dataclasses with title, url, and snippet.
        Returns an empty list on error.
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
            if r.get("href")
        ]

        logger.info("Got %d results for query: '%s'", len(results), query)
        return results

    except Exception as exc:
        logger.error("DuckDuckGo search failed for '%s': %s", query, exc)
        return []
