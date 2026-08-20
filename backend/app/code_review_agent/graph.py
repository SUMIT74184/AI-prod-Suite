"""
code_review_agent/graph.py
============================
Builds and compiles the LangGraph StateGraph for the Code Review Agent.

This file is the "blueprint" of the agent — it connects nodes with
edges and defines which node runs after which.

Graph structure:
    START
      │
      ▼
    [parse_code]        — Detect language, extract structure
      │
      ▼
    [detect_bugs]       — Find bugs with severity
      │
      ▼
    [check_security]    — Find vulnerabilities with severity
      │
      ▼
    [analyze_complexity]— Big-O + code smells
      │
      ▼
    [synthesize_report] — Merge findings → health score + explanation
      │
      ▼
    [generate_tests]    — Write unit test code
      │
      ▼
    [finalize_review]   — Final assembly
      │
      ▼
    END

Usage:
    from app.code_review_agent.graph import compiled_graph
    result = compiled_graph.invoke(initial_state("code here"))
"""

import logging
from langgraph.graph import StateGraph, END

from app.code_review_agent.state import ReviewState
from app.code_review_agent.nodes import (
    parse_code_node,
    detect_bugs_node,
    check_security_node,
    analyze_complexity_node,
    synthesize_report_node,
    generate_tests_node,
    finalize_review_node,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Build the graph
# ---------------------------------------------------------------------------

def build_graph() -> StateGraph:
    """
    Construct the StateGraph with all nodes and edges.

    The pipeline is linear:
        parse → bugs → security → complexity → synthesize → tests → finalize

    Each analysis pass builds on the context from the parse node.
    The synthesize node combines all findings into a health score.
    The test node uses bug findings to write targeted test cases.

    Returns a compiled graph ready to invoke or stream.
    """
    # Initialize the graph with our state schema
    workflow = StateGraph(ReviewState)

    # -----------------------------------------------------------------------
    # Register nodes
    # Each node is a function: ReviewState → dict (partial state update)
    # -----------------------------------------------------------------------
    workflow.add_node("parse_code", parse_code_node)
    workflow.add_node("detect_bugs", detect_bugs_node)
    workflow.add_node("check_security", check_security_node)
    workflow.add_node("analyze_complexity", analyze_complexity_node)
    workflow.add_node("synthesize_report", synthesize_report_node)
    workflow.add_node("generate_tests", generate_tests_node)
    workflow.add_node("finalize_review", finalize_review_node)

    # -----------------------------------------------------------------------
    # Define edges (the arrows between nodes)
    # -----------------------------------------------------------------------

    # Entry point: always starts at parse_code
    workflow.set_entry_point("parse_code")

    # Linear pipeline:
    # parse → bugs → security → complexity → synthesize → tests → finalize
    workflow.add_edge("parse_code", "detect_bugs")
    workflow.add_edge("detect_bugs", "check_security")
    workflow.add_edge("check_security", "analyze_complexity")
    workflow.add_edge("analyze_complexity", "synthesize_report")
    workflow.add_edge("synthesize_report", "generate_tests")
    workflow.add_edge("generate_tests", "finalize_review")

    # finalize_review is the terminal node
    workflow.add_edge("finalize_review", END)

    return workflow


# ---------------------------------------------------------------------------
# Compile once at module load — reused across all requests
# ---------------------------------------------------------------------------

# Compiling the graph validates all edges and node signatures.
# Doing this at module load time means any configuration errors are caught
# immediately on startup, not on the first user request.
_workflow = build_graph()
compiled_graph = _workflow.compile()

logger.info("Code Review Agent graph compiled successfully.")
