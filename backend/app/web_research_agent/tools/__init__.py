# tools package — External I/O adapters (search engine, web scraper)
from app.web_research_agent.tools.search_engine import web_search
from app.web_research_agent.tools.scraper import fetch_page_content

__all__ = ["web_search", "fetch_page_content"]
