"""
code_review_agent/runner.py
=============================
Public API for the Code Review Agent.

This is the only file that callers outside the package should import.
It exposes two functions:

    run_review(code)     → ReviewState  (blocking — waits for full completion)
    stream_review(code)  → Generator    (yields dicts after each node completes)

Why two functions?
    - run_review() is simple: fire-and-forget, wait, get the full result.
      Good for programmatic use and tests.
    - stream_review() is for SSE (Server-Sent Events): the frontend can
      display real-time step progress as each node finishes.

Usage:
    from app.code_review_agent.runner import run_review, stream_review

    # Blocking
    result = run_review("def add(a, b): return a + b")
    print(result["bugs"])

    # Streaming (for FastAPI SSE endpoint)
    for update in stream_review("def add(a, b): return a + b"):
        print(update)  # {"status": "parse_code", "message": "...", "data": {...}}
"""

import logging
from typing import Generator, Dict, Any

from app.code_review_agent.graph import compiled_graph
from app.code_review_agent.state import ReviewState, initial_state

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Blocking runner
# ---------------------------------------------------------------------------

def run_review(code: str) -> ReviewState:
    """
    Run the full code review agent graph and return the final state.

    The graph runs synchronously through all 7 nodes. The function
    blocks until the entire graph has finished.

    Args:
        code: The source code to review.

    Returns:
        The final ReviewState dict containing all analysis results.
    """
    logger.info("Starting code review agent (%d chars)", len(code))
    state = initial_state(code)

    try:
        final_state = compiled_graph.invoke(state)
        logger.info(
            "Review completed. Health: %d/100, Bugs: %d, Security: %d",
            final_state.get("health_score", 0),
            len(final_state.get("bugs", [])),
            len(final_state.get("security", [])),
        )
        return final_state
    except Exception as exc:
        logger.error("Code review agent failed: %s", exc)
        return {
            **state,
            "explanation": f"Code review failed: {exc}",
            "status": "error",
            "error": str(exc),
        }


# ---------------------------------------------------------------------------
# Streaming runner
# ---------------------------------------------------------------------------

def stream_review(code: str) -> Generator[Dict[str, Any], None, None]:
    """
    Run the code review agent and yield a progress update after each node.

    The agent runs ONCE here. Each node completion emits a progress event.
    After the graph finishes, the final "complete" event includes the full
    review results — so the frontend does NOT need a second call.

    SSE event format per node:
        {"status": "detect_bugs", "message": "...", "data": {...}}

    Final event:
        {
          "status": "complete",
          "message": "Code review complete!",
          "data": {
            "bugs": [...],
            "security": [...],
            "complexity": "...",
            "explanation": "...",
            "health_score": 85,
            "refactoring": [...],
            "unit_tests": "...",
            "language": "python",
            "line_count": 42,
            "structure": {...}
          }
        }

    Args:
        code: The source code to review.

    Yields:
        Progress dicts for each node, then the final complete event.
    """
    logger.info("Streaming code review agent (%d chars)", len(code))
    state = initial_state(code)
    final_state: Dict[str, Any] = dict(state)

    try:
        for event in compiled_graph.stream(state):
            for node_name, node_output in event.items():
                if node_name.startswith("__"):
                    continue

                # Merge node output into our tracked final_state
                final_state.update(node_output)

                update = _format_stream_event(node_name, node_output, final_state)
                logger.debug("Stream event: %s", update.get("status"))
                yield update

        # After the stream ends, emit the final "complete" event
        # with the full result so the frontend doesn't need a second call
        yield {
            "status": "complete",
            "message": "Code review complete!",
            "data": {
                "bugs": final_state.get("bugs", []),
                "security": final_state.get("security", []),
                "complexity": final_state.get("complexity", ""),
                "explanation": final_state.get("explanation", ""),
                "health_score": final_state.get("health_score", 100),
                "refactoring": final_state.get("refactoring", []),
                "unit_tests": final_state.get("unit_tests", ""),
                "language": final_state.get("language", "unknown"),
                "line_count": final_state.get("line_count", 0),
                "structure": final_state.get("structure", {}),
                "error": final_state.get("error"),
            },
        }

    except Exception as exc:
        logger.error("Stream review agent failed: %s", exc)
        yield {
            "status": "error",
            "message": f"Code review failed: {exc}",
            "data": {},
        }


# ---------------------------------------------------------------------------
# Stream event formatter
# ---------------------------------------------------------------------------

def _format_stream_event(
    node_name: str,
    node_output: dict,
    accumulated_state: dict,
) -> Dict[str, Any]:
    """
    Convert a raw LangGraph stream event into a clean frontend-friendly dict.

    Args:
        node_name:         The name of the node that just completed.
        node_output:       The partial state dict returned by that node.
        accumulated_state: The full merged state so far.

    Returns:
        A dict with "status", "message", and "data" keys.
    """
    # Human-readable messages for each node
    messages = {
        "parse_code":          "Parsing code structure…",
        "detect_bugs":         "Scanning for bugs and errors…",
        "check_security":      "Running security analysis…",
        "analyze_complexity":  "Analyzing code complexity…",
        "synthesize_report":   "Synthesizing review findings…",
        "generate_tests":      "Generating unit tests…",
        "finalize_review":     "Finalizing review…",
    }

    message = messages.get(node_name, f"Running {node_name}…")

    # Extract meaningful data to send to the frontend per node
    data: Dict[str, Any] = {}

    if node_name == "parse_code":
        data["language"] = node_output.get("language", "unknown")
        data["line_count"] = node_output.get("line_count", 0)
        data["structure"] = node_output.get("structure", {})

    elif node_name == "detect_bugs":
        bugs = node_output.get("bugs", [])
        data["bug_count"] = len(bugs)
        data["bugs"] = bugs
        # Count by severity
        data["severity_breakdown"] = _count_severities(bugs)

    elif node_name == "check_security":
        sec = node_output.get("security", [])
        data["security_count"] = len(sec)
        data["security"] = sec
        data["severity_breakdown"] = _count_severities(sec)

    elif node_name == "analyze_complexity":
        complexity = node_output.get("complexity", "")
        data["complexity_preview"] = complexity[:300] + "…" if len(complexity) > 300 else complexity

    elif node_name == "synthesize_report":
        data["health_score"] = node_output.get("health_score", 100)
        data["explanation"] = node_output.get("explanation", "")
        data["refactoring"] = node_output.get("refactoring", [])

    elif node_name == "generate_tests":
        tests = node_output.get("unit_tests", "")
        data["tests_length"] = len(tests)

    elif node_name == "finalize_review":
        data["health_score"] = accumulated_state.get("health_score", 100)

    return {
        "status": node_name,
        "message": message,
        "data": data,
    }


def _count_severities(findings: list) -> dict:
    """Count findings by severity level."""
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for f in findings:
        sev = f.get("severity", "medium").lower()
        if sev in counts:
            counts[sev] += 1
    return counts
