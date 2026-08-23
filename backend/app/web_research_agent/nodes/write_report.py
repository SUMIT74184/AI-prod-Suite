"""
nodes/write_report.py
=====================
Node 5: Generate the final structured Markdown research report.
"""

import logging

from app.core.llm_client import generate_text
from app.web_research_agent.state import AgentState

logger = logging.getLogger(__name__)


def write_report_node(state: AgentState) -> dict:
    """
    Generate the final structured Markdown research report.

    Input fields read:  query, page_contents, analysis, sources, sub_queries
    Output fields set:  report, status
    """
    logger.info("[write_report] Writing final report")

    context_parts = []
    for i, page in enumerate(state["page_contents"], 1):
        if page.word_count > 0:
            context_parts.append(
                f"[Source {i}] {page.title}\nURL: {page.url}\n\n{page.text}"
            )
    context = "\n\n---\n\n".join(context_parts)

    sources_list = "\n".join(
        f"- {url}" for url in state["sources"] if url
    )

    prompt = f"""\
You are an expert research writer. Write a comprehensive, professional
research report on the following topic:

Topic: {state["query"]}

Research angles covered:
{chr(10).join(f'- {q}' for q in state["sub_queries"])}

Synthesis:
{state["analysis"]}

Source Material:
{context}

Write a detailed, well-structured report in Markdown. Include:

# [Descriptive Report Title]

## Executive Summary
(3-4 sentences covering the key takeaways)

## Background
(Context and foundational concepts)

## Key Findings
(Multiple subsections covering different angles. Cite sources inline
like [Source 1], [Source 2], etc.)

## Analysis & Insights
(Your synthesis: patterns, comparisons, implications)

## Conclusion
(Final thoughts and recommendations)

## Sources
{sources_list}

Rules:
- Write in an authoritative, clear, professional tone.
- Do NOT say "based on the provided sources" — write as an expert.
- Use proper Markdown formatting (headers, bullet points, bold key terms).
- Cite sources inline where relevant.
"""

    try:
        report = generate_text(prompt).strip()
        logger.info("[write_report] Report generated (%d chars)", len(report))
        return {"report": report, "status": "complete"}

    except Exception as exc:
        logger.error("[write_report] Failed: %s", exc)
        return {
            "report": f"# Error\n\nReport generation failed: {exc}",
            "status": "error",
            "error": str(exc),
        }
