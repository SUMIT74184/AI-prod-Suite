"""
code_review_agent/runner.py
=============================
Public API for the Code Review Agent.
"""

import logging
from typing import Generator, Dict, Any

from app.code_review_agent.graph import compiled_graph
from app.code_review_agent.state import ReviewState, initial_state

logger = logging.getLogger(__name__)

# Temporary in-memory state store to simulate a persistent checkpointer.
# In a real app, LangGraph MemorySaver or Redis would be used here.
_session_store: Dict[str, Any] = {}

def run_review(git_diff: str, repo_name: str = "unknown") -> ReviewState:
    """
    Run the code review agent. If it halts for tools, it will return the state.
    """
    logger.info("Starting production code review agent for %s", repo_name)
    state = initial_state(git_diff, repo_name)
    
    try:
        final_state = compiled_graph.invoke(state)
        # Store state to resume later if tools are pending
        if final_state.get("pending_tool_calls"):
            _session_store["mock-session-id"] = final_state
        return final_state
    except Exception as exc:
        logger.error("Code review agent failed: %s", exc)
        state["error"] = str(exc)
        return state

def handle_tool_response(session_id: str, tool_results: Dict[str, Any]) -> ReviewState:
    """
    Resumes the graph after CLI submits tool results.
    """
    logger.info("Resuming code review agent for session %s", session_id)
    if session_id not in _session_store:
        raise ValueError("Session not found or expired.")
        
    state = _session_store[session_id]
    state["tool_results"] = tool_results
    
    try:
        final_state = compiled_graph.invoke(state)
        if final_state.get("pending_tool_calls"):
            _session_store[session_id] = final_state
        else:
            # Clean up memory when done
            del _session_store[session_id]
        return final_state
    except Exception as exc:
        logger.error("Code review agent failed on resume: %s", exc)
        state["error"] = str(exc)
        return state


def stream_review(git_diff: str, repo_name: str = "unknown") -> Generator[Dict[str, Any], None, None]:
    """
    Run the production code review agent and yield a progress update after each node.
    Used for Web UI streaming (Server-Sent Events).
    """
    logger.info("Streaming production code review agent for %s", repo_name)
    state = initial_state(git_diff, repo_name)
    final_state: Dict[str, Any] = dict(state)

    try:
        for event in compiled_graph.stream(state):
            for node_name, node_output in event.items():
                if node_name.startswith("__"):
                    continue

                # Merge node output into tracked state
                final_state.update(node_output)

                yield {
                    "status": node_name,
                    "message": f"Running {node_name}...",
                    "data": {
                        "raw_findings": final_state.get("raw_findings", []),
                        "validated_findings": final_state.get("validated_findings", []),
                        "deduplicated_findings": final_state.get("deduplicated_findings", []),
                        "health_score": final_state.get("health_score", 100),
                        "explanation": final_state.get("explanation", ""),
                        "refactoring": final_state.get("refactoring", []),
                        "generated_tests": final_state.get("generated_tests", ""),
                        "generated_fixes": final_state.get("generated_fixes", [])
                    }
                }

        # Final complete event
        yield {
            "status": "complete",
            "message": "Code review complete!",
            "data": {
                "findings": final_state.get("deduplicated_findings", final_state.get("raw_findings", [])),
                "fixes": final_state.get("generated_fixes", []),
                "health_score": final_state.get("health_score", 100),
                "explanation": final_state.get("explanation", ""),
                "refactoring": final_state.get("refactoring", []),
                "generated_tests": final_state.get("generated_tests", ""),
                "error": final_state.get("error")
            }
        }
    except Exception as exc:
        logger.error("Stream review agent failed: %s", exc)
        yield {
            "status": "error",
            "message": f"Code review failed: {exc}",
            "data": {}
        }

