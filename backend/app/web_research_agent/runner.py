"""
web_research_agent/runner.py
=============================
Public API for the Web Research Agent.

This is the only file that callers outside the package should import.
It exposes two functions:

    run_agent(query)     → AgentState   (blocking — waits for full completion)
    stream_agent(query)  → Generator    (yields dicts after each node completes)

Why two functions?
    - run_agent() is simple: fire-and-forget, wait, get the full result.
      Good for programmatic use and tests.
    - stream_agent() is for SSE (Server-Sent Events): the frontend can
      display real-time step progress as each node finishes.

Usage example:
    from app.web_research_agent.runner import run_agent, stream_agent

    # Blocking
    result = run_agent("Explain transformer architecture")
    print(result["report"])

    # Streaming (for FastAPI SSE endpoint)
    for update in stream_agent("Explain transformer architecture"):
        print(update)  # {"status": "plan", "data": {"sub_queries": [...]}}
"""

import logging
from typing import Generator, Dict, Any

from app.web_research_agent.graph import compiled_graph
from app.web_research_agent.state import AgentState, initial_state

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Blocking runner
# ---------------------------------------------------------------------------

def run_agent(query: str) -> AgentState:
    """
    Run the full research agent graph and return the final state.

    The graph runs synchronously: plan → search → read → analyze →
    (possibly loop) → write_report. The function blocks until the
    entire graph has finished.

    Args:
        query: The research topic or question to investigate.

    Returns:
        The final AgentState dict containing:
            - report:       The Markdown research report
            - sources:      List of URLs used
            - sub_queries:  Sub-questions that were searched
            - analysis:     Gemini's synthesis of findings
            - iteration:    How many search loops were performed
            - error:        Error message if any node failed, else None
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
        # Return a safe error state so the API can still respond
        return {
            **state,
            "report": f"# Research Failed\n\nThe agent encountered an error: {exc}",
            "status": "error",
            "error": str(exc),
        }


# ---------------------------------------------------------------------------
# Streaming runner
# ---------------------------------------------------------------------------

def stream_agent(query: str) -> Generator[Dict[str, Any], None, None]:
    """
    Run the research agent and yield a progress update after each node.

    KEY DESIGN: The agent runs EXACTLY ONCE here. Each node completion
    emits a progress event. After the graph finishes, the final "complete"
    event includes the full report, sources, and sub_queries.

    This means the frontend ONLY needs to call /stream — it does NOT
    need a second call to /run to get the report.

    SSE event format per node:
        {"status": "plan", "message": "...", "data": {...}}

    Final event:
        {
          "status": "complete",
          "message": "Research complete!",
          "data": {
            "report":      "# Full Markdown Report...",
            "sources":     ["https://..."],
            "sub_queries": ["query 1", ...],
            "iteration":   1
          }
        }

    Args:
        query: The research topic.

    Yields:
        Progress dicts for each node, then the final complete event.
    """
    logger.info("Streaming research agent for query: '%s'", query)
    state = initial_state(query)
    final_state: Dict[str, Any] = dict(state)   # will be updated as nodes run

    try:
        for event in compiled_graph.stream(state):
            for node_name, node_output in event.items():
                if node_name.startswith("__"):
                    continue

                # Merge node output into our tracked final_state
                final_state.update(node_output)

                update = _format_stream_event(node_name, node_output)
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


# ---------------------------------------------------------------------------
# Stream event formatter
# ---------------------------------------------------------------------------

def _format_stream_event(node_name: str, node_output: dict) -> Dict[str, Any]:
    """
    Convert a raw LangGraph stream event into a clean frontend-friendly dict.

    Args:
        node_name:   The name of the node that just completed.
        node_output: The partial state dict returned by that node.

    Returns:
        A dict with "status", "message", and "data" keys.
    """
    # Human-readable messages for each node
    messages = {
        "plan":         "Planning research strategy…",
        "search":       "Searching the web…",
        "read":         "Reading and extracting content…",
        "analyze":      "Analyzing gathered information…",
        "write_report": "Writing the research report…",
    }

    message = messages.get(node_name, f"Running {node_name}…")

    # Extract meaningful data to send to the frontend
    data: Dict[str, Any] = {}

    if node_name == "plan":
        data["sub_queries"] = node_output.get("sub_queries", [])

    elif node_name == "search":
        results = node_output.get("search_results", [])
        data["result_count"] = len(results)
        data["iteration"] = node_output.get("iteration", 1)

    elif node_name == "read":
        pages = node_output.get("page_contents", [])
        data["pages_fetched"] = len(pages)
        data["sources"] = [p.url for p in pages]

    elif node_name == "analyze":
        data["needs_more"] = node_output.get("needs_more", False)
        # Send a short preview of the analysis (not the whole thing)
        analysis = node_output.get("analysis", "")
        data["analysis_preview"] = analysis[:200] + "…" if len(analysis) > 200 else analysis

    elif node_name == "write_report":
        report = node_output.get("report", "")
        data["report_length"] = len(report)
        # Do NOT send the full report in the stream — it comes in the final
        # blocking response. Sending it here would double the data transfer.

    return {
        "status": node_name,
        "message": message,
        "data": data,
    }
