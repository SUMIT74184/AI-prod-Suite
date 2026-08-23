"""
nodes/plan.py
=============
Node 1: Break the user's query into 3-5 focused sub-queries.
"""

import logging

from app.core.llm_client import generate_text
from app.web_research_agent.state import AgentState

logger = logging.getLogger(__name__)


def plan_node(state: AgentState) -> dict:
    """
    Break the user's query into 3-5 focused sub-queries.

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

        sub_queries = []
        for line in raw.splitlines():
            line = line.strip()
            if not line:
                continue
            if line[0].isdigit() and "." in line[:3]:
                line = line.split(".", 1)[1].strip()
            elif line.startswith("-"):
                line = line[1:].strip()
            if line:
                sub_queries.append(line)

        if not sub_queries:
            sub_queries = [state["query"]]

        logger.info("[plan] Generated %d sub-queries", len(sub_queries))
        return {"sub_queries": sub_queries, "status": "plan"}

    except Exception as exc:
        logger.error("[plan] Failed: %s", exc)
        return {
            "sub_queries": [state["query"]],
            "status": "plan",
            "error": f"Plan node error: {exc}",
        }
