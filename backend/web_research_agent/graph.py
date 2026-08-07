"""
web_research_agent/graph.py
============================
Builds and compiles the LangGraph StateGraph for the Web Research Agent.

This file is the "blueprint" of the agent — it connects nodes with
edges and defines which node runs after which, including the conditional
routing from the analyze node.

Graph structure:
    START
      │
      ▼
    [plan]          — Generate sub-queries
      │
      ▼
    [search]        ◄────────────────────┐
      │                                  │ needs_more=True
      ▼                                  │ (max 2 iterations)
    [read]                               │
      │                                  │
      ▼                                  │
    [analyze] ── "sufficient" ──► [write_report] ──► END
         └──────── "need_more" ──────────┘ (loops back to search)

Usage:
    from web_research_agent.graph import compiled_graph
    result = compiled_graph.invoke(initial_state("LangGraph tutorial"))
"""

import logging
from langgraph.graph import StateGraph, END

from web_research_agent.state import AgentState
from web_research_agent.nodes import (
    plan_node,
    search_node,
    read_node,
    analyze_node,
    write_report_node,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Routing function — called after analyze_node to decide the next node
# ---------------------------------------------------------------------------

def route_after_analyze(state: AgentState) -> str:
    """
    Conditional edge: after analyze_node, go to either:
        - "search"       if needs_more is True (loop for more info)
        - "write_report" if needs_more is False (sufficient info)

    This function is passed to add_conditional_edges() in graph.py.
    LangGraph calls it with the current state and uses the return value
    to pick the next node.

    Args:
        state: The current AgentState after analyze_node has run.

    Returns:
        "search" or "write_report"
    """
    if state.get("needs_more", False):
        logger.info("Routing: analyze → search (needs more info, iteration %d)", state["iteration"])
        return "search"

    logger.info("Routing: analyze → write_report (sufficient info)")
    return "write_report"


# ---------------------------------------------------------------------------
# Build the graph
# ---------------------------------------------------------------------------

def build_graph() -> StateGraph:
    """
    Construct the StateGraph with all nodes and edges.

    Returns a compiled graph ready to invoke or stream.

    Separation of build() and compile() makes it easy to inspect the
    graph structure (e.g., draw a diagram) before compiling.
    """
    # Initialize the graph with our state schema
    workflow = StateGraph(AgentState)

    # -----------------------------------------------------------------------
    # Register nodes
    # Each node is a function: AgentState → dict (partial state update)
    # -----------------------------------------------------------------------
    workflow.add_node("plan", plan_node)
    workflow.add_node("search", search_node)
    workflow.add_node("read", read_node)
    workflow.add_node("analyze", analyze_node)
    workflow.add_node("write_report", write_report_node)

    # -----------------------------------------------------------------------
    # Define edges (the arrows between nodes)
    # -----------------------------------------------------------------------

    # Entry point: the graph always starts at plan
    workflow.set_entry_point("plan")

    # Linear edges: plan → search → read → analyze
    workflow.add_edge("plan", "search")
    workflow.add_edge("search", "read")
    workflow.add_edge("read", "analyze")

    # Conditional edge: analyze → (search OR write_report)
    # route_after_analyze() decides which path based on needs_more
    workflow.add_conditional_edges(
        "analyze",
        route_after_analyze,
        {
            "search": "search",
            "write_report": "write_report",
        },
    )

    # write_report is the terminal node
    workflow.add_edge("write_report", END)

    return workflow


# ---------------------------------------------------------------------------
# Compile once at module load — reused across all requests
# ---------------------------------------------------------------------------

# Compiling the graph validates all edges and node signatures.
# Doing this at module load time means any configuration errors are caught
# immediately on startup, not on the first user request.
_workflow = build_graph()
compiled_graph = _workflow.compile()

logger.info("Web Research Agent graph compiled successfully.")
