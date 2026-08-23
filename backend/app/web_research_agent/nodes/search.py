"""
nodes/search.py
===============
Node 2: Execute DuckDuckGo searches for each sub-query.
"""

import logging
from typing import List

from app.core.llm_client import generate_text
from app.web_research_agent.state import AgentState, SearchResult
from app.web_research_agent.tools import web_search

logger = logging.getLogger(__name__)


def search_node(state: AgentState) -> dict:
    """
    Execute DuckDuckGo searches for each sub-query and collect results.

    Input fields read:  sub_queries, iteration, analysis (on loop)
    Output fields set:  search_results, sources, iteration, status
    """
    iteration = state["iteration"] + 1
    logger.info("[search] Iteration %d", iteration)

    queries_to_run: List[str]
    if iteration > 1 and state["analysis"]:
        refine_prompt = f"""\
A research agent has been studying this topic: {state["query"]}

Current analysis gaps:
{state["analysis"]}

Write 2 focused search queries to fill in the missing information.
Return ONLY the queries, one per line, no numbering.
"""
        try:
            resp = generate_text(refine_prompt)
            queries_to_run = [
                q.strip() for q in resp.strip().splitlines()
                if q.strip()
            ][:2]
        except Exception:
            queries_to_run = state["sub_queries"]
    else:
        queries_to_run = state["sub_queries"]

    all_results: List[SearchResult] = list(state["search_results"])
    all_sources: List[str] = list(state["sources"])
    seen_urls = set(all_sources)

    for query in queries_to_run:
        results = web_search(query, max_results=5)
        for r in results:
            if r.url and r.url not in seen_urls:
                all_results.append(r)
                all_sources.append(r.url)
                seen_urls.add(r.url)

    logger.info("[search] Total results so far: %d", len(all_results))
    return {
        "search_results": all_results,
        "sources": all_sources,
        "iteration": iteration,
        "status": "search",
    }
