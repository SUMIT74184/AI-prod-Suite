"""
nodes/read.py
=============
Node 3: Fetch and extract text from top search result URLs.
"""

import logging
from typing import List

from app.web_research_agent.state import AgentState, PageContent
from app.web_research_agent.tools import fetch_page_content

logger = logging.getLogger(__name__)

PAGES_TO_FETCH = 3


def read_node(state: AgentState) -> dict:
    """
    Fetch and extract text from the top search result URLs.

    Input fields read:  search_results, page_contents
    Output fields set:  page_contents, status
    """
    logger.info("[read] Fetching page content")

    already_fetched = {p.url for p in state["page_contents"]}

    to_fetch = [
        r for r in state["search_results"]
        if r.url and r.url not in already_fetched
    ][:PAGES_TO_FETCH]

    new_pages: List[PageContent] = []
    for result in to_fetch:
        page = fetch_page_content(result.url)
        if page.word_count > 50:
            new_pages.append(page)

    all_pages = list(state["page_contents"]) + new_pages
    logger.info(
        "[read] Fetched %d new pages (total: %d)",
        len(new_pages),
        len(all_pages),
    )

    return {"page_contents": all_pages, "status": "read"}
