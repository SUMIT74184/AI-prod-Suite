"""
web_research_agent/runner.py
=============================
Public API for the Web Research Agent.

This is the only file that callers outside the package should import.
It exposes two functions:

    run_agent(query)     → AgentState   (blocking — waits for full completion)
    stream_agent(query)  → Generator    (yields dicts after each node completes)

Usage:
    from app.web_research_agent.runner import run_agent, stream_agent

    # Blocking
    result = run_agent("Explain transformer architecture")
    print(result["report"])

    # Streaming (for FastAPI SSE endpoint)
    for update in stream_agent("Explain transformer architecture"):
        print(update)  # {"status": "plan", "message": "...", "data": {...}}
"""

import logging
from typing import Generator, Dict, Any

from app.web_research_agent.graph import compiled_graph
from app.web_research_agent.state import AgentState, initial_state
from app.web_research_agent.streaming import format_stream_event

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Blocking runner
# ---------------------------------------------------------------------------

def run_agent(query: str) -> AgentState:
    """
    Run the full research agent graph and return the final state.

    Args:
        query: The research topic or question to investigate.

    Returns:
        The final AgentState dict.
    """
    logger.info("Starting research agent for query: '%s'", query)
    state = initial_state(query)

    try:
        final_state = compiled_graph.invoke(state)
        logger.info(
            "Agent completed. Report length: %d chars, Sources: %d",
            len(final_state.get("report", "")),
            len(final_state.get("sources", [])),
        )
        return final_state
    except Exception as exc:
        logger.error("Agent failed: %s", exc)
        return {
            **state,
            "report": f"# Research Failed\n\nThe agent encountered an error: {exc}",
            "status": "error",
            "error": str(exc),
        }


# ---------------------------------------------------------------------------
# Streaming runner — uses enriched formatter from streaming/ package
# ---------------------------------------------------------------------------

def stream_agent(query: str) -> Generator[Dict[str, Any], None, None]:
    """
    Run the research agent and yield enriched progress updates after each node.

    Each node completion emits a rich insight event with granular data
    (search result previews, page titles, analysis excerpts, etc.)
    so the frontend can display real-time activity.

    Args:
        query: The research topic.

    Yields:
        Progress dicts for each node, then the final complete event.
    """
    logger.info("Streaming research agent for query: '%s'", query)
    state = initial_state(query)
    final_state: Dict[str, Any] = dict(state)

    try:
        for event in compiled_graph.stream(state):
            for node_name, node_output in event.items():
                if node_name.startswith("__"):
                    continue

                # Merge node output into our tracked final_state
                final_state.update(node_output)

                # Use the enriched formatter from streaming/ package
                update = format_stream_event(node_name, node_output)
                logger.debug("Stream event: %s", update)
                yield update

        # After the stream ends, emit the final "complete" event
        # with the full result so the frontend doesn't need a second call
        yield {
            "status": "complete",
            "message": "Research complete!",
            "data": {
                "report":      final_state.get("report", ""),
                "sources":     final_state.get("sources", []),
                "sub_queries": final_state.get("sub_queries", []),
                "iteration":   final_state.get("iteration", 0),
                "error":       final_state.get("error"),
            },
        }

    except Exception as exc:
        logger.error("Stream agent failed: %s", exc)
        yield {
            "status": "error",
            "message": f"Agent failed: {exc}",
            "data": {},
        }
