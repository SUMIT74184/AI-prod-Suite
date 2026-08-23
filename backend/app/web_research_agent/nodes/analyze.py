"""
nodes/analyze.py
================
Node 4: Synthesize gathered information and decide if more research needed.
"""

import logging

from app.core.llm_client import generate_text
from app.web_research_agent.state import AgentState

logger = logging.getLogger(__name__)

MAX_ITERATIONS = 2


def analyze_node(state: AgentState) -> dict:
    """
    Gemini synthesizes the gathered information and decides if more
    research is needed.

    Input fields read:  query, page_contents, analysis, iteration
    Output fields set:  analysis, needs_more, status
    """
    logger.info("[analyze] Synthesizing findings (iteration %d)", state["iteration"])

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
