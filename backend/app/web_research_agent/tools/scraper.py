"""
tools/scraper.py
================
HTTP page fetcher + HTML→text extractor.
"""

import logging
import re

import httpx
from bs4 import BeautifulSoup

from app.web_research_agent.state import PageContent

logger = logging.getLogger(__name__)

MAX_PAGE_CHARS = 4000
PAGE_FETCH_TIMEOUT = 15
USER_AGENT = (
    "Mozilla/5.0 (compatible; ResearchAgent/1.0; "
    "+https://github.com/your-repo)"
)


def fetch_page_content(url: str) -> PageContent:
    """
    Download a web page and extract its readable text content.

    Args:
        url: The full URL to fetch.

    Returns:
        PageContent dataclass. On error, returns empty text with word_count=0.
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

        title = soup.title.string.strip() if soup.title else url

        for tag in soup(["script", "style", "nav", "header",
                          "footer", "aside", "form", "iframe"]):
            tag.decompose()

        text = soup.get_text(separator="\n", strip=True)
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = text[:MAX_PAGE_CHARS]

        word_count = len(text.split())
        logger.info("Fetched '%s' — %d words", url, word_count)

        return PageContent(url=url, title=title, text=text, word_count=word_count)

    except Exception as exc:
        logger.warning("Failed to fetch '%s': %s", url, exc)
        return PageContent(url=url, title=url, text="", word_count=0)
