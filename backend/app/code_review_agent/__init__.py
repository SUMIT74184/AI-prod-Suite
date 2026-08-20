"""
code_review_agent
==================
LangGraph-based multi-node Code Review Agent.

Provides a structured, streaming code analysis pipeline with specialized
nodes for bug detection, security analysis, complexity analysis,
and unit test generation.

Usage:
    from app.code_review_agent.runner import run_review, stream_review

    # Blocking
    result = run_review("def add(a, b): return a + b")

    # Streaming (for SSE)
    for update in stream_review("def add(a, b): return a + b"):
        print(update)
"""

from app.code_review_agent.runner import run_review, stream_review

__all__ = ["run_review", "stream_review"]
