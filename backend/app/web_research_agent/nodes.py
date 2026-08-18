"""
web_research_agent/nodes.py
============================
The five graph nodes of the Web Research Agent.

Each node is a pure function:
    Input:  AgentState (the full current state)
    Output: dict with ONLY the fields this node changes

LangGraph merges the returned dict back into the state automatically,
so nodes only return what they modified — not the whole state.

Node execution order (defined in graph.py):
    plan → search → read → analyze → write_report
                              ↑           |
                              └─ need_more┘

Nodes:
    plan_node         — Gemini plans sub-queries from the original query
    search_node       — Runs DuckDuckGo for each sub-query
    read_node         — Fetches + extracts text from top URLs
    analyze_node      — Gemini decides if findings are sufficient
    write_report_node — Gemini writes the final Markdown report
"""

import logging
from typing import List

from app.core.llm_client import generate_text
from app.web_research_agent.state import AgentState, SearchResult, PageContent
from app.web_research_agent.tools import web_search, fetch_page_content

logger = logging.getLogger(__name__)

# Maximum number of search-analyze loops before forcing the write step
MAX_ITERATIONS = 2

# How many pages to fetch per iteration (top-N from search results)
PAGES_TO_FETCH = 3


# ---------------------------------------------------------------------------
# Node 1: plan
# ---------------------------------------------------------------------------

def plan_node(state: AgentState) -> dict:
    """
    Break the user's query into 3-5 focused sub-queries.

    Why?
        A broad query like "LangGraph for production" benefits from
        targeted searches: "LangGraph overview", "LangGraph vs CrewAI",
        "LangGraph state management", etc. The plan node generates
        these sub-queries so the search node can be more precise.

    Input fields read:  query
    Output fields set:  sub_queries, status
    """
    logger.info("[plan] Planning sub-queries for: '%s'", state["query"])

    prompt = f"""\
You are a research planner. A user wants to research the following topic:

Topic: {state["query"]}

Break this into 3 to 5 specific, focused search queries that together
will cover the topic comprehensively. Each query should target a
different angle (e.g., overview, comparisons, recent developments,
use cases, limitations).

Return ONLY a numbered list, one query per line. No explanations.

Example output:
1. What is LangGraph and how does it work
2. LangGraph vs LangChain comparison 2024
3. LangGraph production use cases and examples
"""

    try:
        raw = generate_text(prompt).strip()

        # Parse "1. query text" → ["query text", ...]
        sub_queries = []
        for line in raw.splitlines():
            line = line.strip()
            if not line:
                continue
            # Remove leading "1. " or "- " or similar
            if line[0].isdigit() and "." in line[:3]:
                line = line.split(".", 1)[1].strip()
            elif line.startswith("-"):
                line = line[1:].strip()
            if line:
                sub_queries.append(line)

        # Fallback: if parsing failed, just use the original query
        if not sub_queries:
            sub_queries = [state["query"]]

        logger.info("[plan] Generated %d sub-queries", len(sub_queries))
        return {"sub_queries": sub_queries, "status": "plan"}

    except Exception as exc:
        logger.error("[plan] Failed: %s", exc)
        # Fallback to original query so the agent can still continue
        return {
            "sub_queries": [state["query"]],
            "status": "plan",
            "error": f"Plan node error: {exc}",
        }


# ---------------------------------------------------------------------------
# Node 2: search
# ---------------------------------------------------------------------------

def search_node(state: AgentState) -> dict:
    """
    Execute DuckDuckGo searches for each sub-query and collect results.

    On the first iteration: uses sub_queries from the plan node.
    On subsequent iterations: uses a refined query built from the analysis.

    Input fields read:  sub_queries, iteration, analysis (on loop)
    Output fields set:  search_results, sources, iteration, status
    """
    iteration = state["iteration"] + 1
    logger.info("[search] Iteration %d", iteration)

    # On second+ iterations, generate a refined query based on analysis gaps
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

    # Run all searches and collect results
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


# ---------------------------------------------------------------------------
# Node 3: read
# ---------------------------------------------------------------------------

def read_node(state: AgentState) -> dict:
    """
    Fetch and extract text from the top search result URLs.

    We only fetch PAGES_TO_FETCH pages per call to keep latency reasonable.
    Already-fetched pages (by URL) are skipped to avoid duplicate work
    on loop iterations.

    Input fields read:  search_results, page_contents
    Output fields set:  page_contents, status
    """
    logger.info("[read] Fetching page content")

    # Build set of URLs we've already fetched
    already_fetched = {p.url for p in state["page_contents"]}

    # Pick top results we haven't fetched yet
    to_fetch = [
        r for r in state["search_results"]
        if r.url and r.url not in already_fetched
    ][:PAGES_TO_FETCH]

    new_pages: List[PageContent] = []
    for result in to_fetch:
        page = fetch_page_content(result.url)
        if page.word_count > 50:  # Skip pages with almost no text
            new_pages.append(page)

    all_pages = list(state["page_contents"]) + new_pages
    logger.info(
        "[read] Fetched %d new pages (total: %d)",
        len(new_pages),
        len(all_pages),
    )

    return {"page_contents": all_pages, "status": "read"}


# ---------------------------------------------------------------------------
# Node 4: analyze
# ---------------------------------------------------------------------------

def analyze_node(state: AgentState) -> dict:
    """
    Gemini synthesizes the gathered information and decides if more
    research is needed.

    Decision logic:
        - If the information is comprehensive → needs_more = False
          (graph will route to write_report)
        - If there are significant gaps AND iteration < MAX_ITERATIONS
          → needs_more = True (graph loops back to search)
        - If iteration >= MAX_ITERATIONS → forces needs_more = False
          regardless of quality (prevents infinite loops)

    Input fields read:  query, page_contents, analysis, iteration
    Output fields set:  analysis, needs_more, status
    """
    logger.info("[analyze] Synthesizing findings (iteration %d)", state["iteration"])

    # Build context from all fetched pages
    context_parts = []
    for i, page in enumerate(state["page_contents"], 1):
        context_parts.append(
            f"--- Source {i}: {page.title} ({page.url}) ---\n{page.text}"
        )
    context = "\n\n".join(context_parts)

    prompt = f"""\
You are analyzing research gathered about: {state["query"]}

Here is the gathered information from web pages:

{context}

Tasks:
1. Write a brief synthesis (3-5 sentences) of what has been found so far.
2. Identify any significant gaps or missing information.
3. Decide: is the current information SUFFICIENT to write a comprehensive report?

Reply in this exact format:
SYNTHESIS:
<your synthesis here>

GAPS:
<gaps or "None" if sufficient>

DECISION: SUFFICIENT or NEED_MORE
"""

    try:
        raw = generate_text(prompt).strip()

        # Parse DECISION line
        needs_more = False
        if "DECISION: NEED_MORE" in raw and state["iteration"] < MAX_ITERATIONS:
            needs_more = True

        logger.info("[analyze] Decision: %s", "NEED_MORE" if needs_more else "SUFFICIENT")
        return {
            "analysis": raw,
            "needs_more": needs_more,
            "status": "analyze",
        }

    except Exception as exc:
        logger.error("[analyze] Failed: %s", exc)
        return {
            "analysis": "Analysis failed — proceeding to report generation.",
            "needs_more": False,
            "status": "analyze",
            "error": str(exc),
        }


# ---------------------------------------------------------------------------
# Node 5: write_report
# ---------------------------------------------------------------------------

def write_report_node(state: AgentState) -> dict:
    """
    Generate the final structured Markdown research report.

    Uses all gathered page content + the analysis synthesis to write
    a professional, well-cited report with clear sections.

    Input fields read:  query, page_contents, analysis, sources, sub_queries
    Output fields set:  report, status
    """
    logger.info("[write_report] Writing final report")

    # Build source context
    context_parts = []
    for i, page in enumerate(state["page_contents"], 1):
        if page.word_count > 0:
            context_parts.append(
                f"[Source {i}] {page.title}\nURL: {page.url}\n\n{page.text}"
            )
    context = "\n\n---\n\n".join(context_parts)

    # Format source list
    sources_list = "\n".join(
        f"- {url}" for url in state["sources"] if url
    )

    prompt = f"""\
You are an expert research writer. Write a comprehensive, professional
research report on the following topic:

Topic: {state["query"]}

Research angles covered:
{chr(10).join(f'- {q}' for q in state["sub_queries"])}

Synthesis:
{state["analysis"]}

Source Material:
{context}

Write a detailed, well-structured report in Markdown. Include:

# [Descriptive Report Title]

## Executive Summary
(3-4 sentences covering the key takeaways)

## Background
(Context and foundational concepts)

## Key Findings
(Multiple subsections covering different angles. Cite sources inline
like [Source 1], [Source 2], etc.)

## Analysis & Insights
(Your synthesis: patterns, comparisons, implications)

## Conclusion
(Final thoughts and recommendations)

## Sources
{sources_list}

Rules:
- Write in an authoritative, clear, professional tone.
- Do NOT say "based on the provided sources" — write as an expert.
- Use proper Markdown formatting (headers, bullet points, bold key terms).
- Cite sources inline where relevant.
"""

    try:
        report = generate_text(prompt).strip()
        logger.info("[write_report] Report generated (%d chars)", len(report))
        return {"report": report, "status": "complete"}

    except Exception as exc:
        logger.error("[write_report] Failed: %s", exc)
        return {
            "report": f"# Error\n\nReport generation failed: {exc}",
            "status": "error",
            "error": str(exc),
        }
