"""
web_research_agent/state.py
============================
Defines AgentState — the single typed dictionary that flows through
every node in the LangGraph graph.

Why a TypedDict?
    LangGraph merges state updates from each node by key. Using TypedDict
    makes every field explicit: you always know exactly what the agent
    knows at any point in the graph, and Python type checkers can catch
    typos in field names.

Field ownership (which node writes which field):
    query         → set by the caller (runner.py), never changed
    sub_queries   → written by: plan
    search_results→ written by: search (appended on each iteration)
    page_contents → written by: read  (appended on each iteration)
    analysis      → written by: analyze
    needs_more    → written by: analyze (routing decision)
    iteration     → incremented by: analyze
    report        → written by: write_report
    sources       → written by: search + read (union of URLs found)
    status        → written by: every node (for SSE streaming)
    error         → written by: any node on exception
"""

from typing import TypedDict, List, Optional
from dataclasses import dataclass


# ---------------------------------------------------------------------------
# Sub-types — small dataclasses to keep state fields structured
# ---------------------------------------------------------------------------

@dataclass
class SearchResult:
    """One result returned by DuckDuckGo."""
    title: str
    url: str
    snippet: str    # Short summary from search engine


@dataclass
class PageContent:
    """Text extracted from a fetched web page."""
    url: str
    title: str
    text: str       # Cleaned body text (no HTML tags)
    word_count: int


# ---------------------------------------------------------------------------
# AgentState
# ---------------------------------------------------------------------------

class AgentState(TypedDict):
    """
    The complete state of the Web Research Agent at any point in the graph.

    This dict is passed into each node and the node returns a (partial)
    dict with updated fields. LangGraph merges the returned dict back
    into the state automatically.
    """

    # --- Input ---
    query: str                          # The original user research query

    # --- Planning node output ---
    sub_queries: List[str]              # 3-5 focused sub-questions to search

    # --- Search node output ---
    search_results: List[SearchResult]  # All raw results collected so far

    # --- Read node output ---
    page_contents: List[PageContent]    # Scraped text from top URLs

    # --- Analyze node output ---
    analysis: str                       # Gemini's synthesis of current findings
    needs_more: bool                    # True → loop back to search node

    # --- Loop control ---
    iteration: int                      # Search iteration count (max 2)

    # --- Final output ---
    report: str                         # Final Markdown research report
    sources: List[str]                  # Deduplicated list of source URLs

    # --- Streaming metadata ---
    status: str                         # Current node name (for SSE)
    error: Optional[str]                # Error message if a node fails


# ---------------------------------------------------------------------------
# Initial state factory
# ---------------------------------------------------------------------------

def initial_state(query: str) -> AgentState:
    """
    Build a fresh AgentState for a new research job.

    Called by runner.py before invoking the graph. Every field is
    initialised to a safe empty value so nodes never see KeyError.
    """
    return AgentState(
        query=query,
        sub_queries=[],
        search_results=[],
        page_contents=[],
        analysis="",
        needs_more=False,
        iteration=0,
        report="",
        sources=[],
        status="starting",
        error=None,
    )
