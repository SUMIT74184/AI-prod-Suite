"""
streaming/formatter.py
======================
Enhanced SSE event formatter that produces rich insight payloads
for each LangGraph node completion.

Each event includes:
  - status:  node name (for step tracking)
  - message: human-readable progress text
  - data:    rich insight payload with granular details
"""

from typing import Dict, Any

from app.web_research_agent.streaming.insights import (
    extract_top_results,
    extract_new_domains,
    extract_page_previews,
    compute_total_words,
    parse_analysis_parts,
    detect_report_sections,
)


# Human-readable messages for each node
_NODE_MESSAGES = {
    "plan":         "Planning research strategy…",
    "search":       "Searching the web…",
    "read":         "Reading and extracting content…",
    "analyze":      "Analyzing gathered information…",
    "write_report": "Writing the research report…",
}


def format_stream_event(node_name: str, node_output: dict) -> Dict[str, Any]:
    """
    Convert a raw LangGraph stream event into an enriched frontend-friendly dict.

    Args:
        node_name:   The name of the node that just completed.
        node_output: The partial state dict returned by that node.

    Returns:
        A dict with "status", "message", and "data" keys containing
        rich insight data for the frontend to display.
    """
    message = _NODE_MESSAGES.get(node_name, f"Running {node_name}…")
    data: Dict[str, Any] = {}

    if node_name == "plan":
        sub_queries = node_output.get("sub_queries", [])
        data["sub_queries"] = sub_queries
        data["query_count"] = len(sub_queries)
        data["research_angles"] = ", ".join(sub_queries[:3]) + ("…" if len(sub_queries) > 3 else "")

    elif node_name == "search":
        results = node_output.get("search_results", [])
        sources = node_output.get("sources", [])
        data["result_count"] = len(results)
        data["iteration"] = node_output.get("iteration", 1)
        data["top_results"] = extract_top_results(results, limit=5)
        data["new_domains"] = extract_new_domains(sources)
        data["source_count"] = len(sources)

    elif node_name == "read":
        pages = node_output.get("page_contents", [])
        data["pages_fetched"] = len(pages)
        data["sources"] = [getattr(p, "url", "") for p in pages]
        data["page_previews"] = extract_page_previews(pages)
        data["total_words"] = compute_total_words(pages)

    elif node_name == "analyze":
        analysis = node_output.get("analysis", "")
        data["needs_more"] = node_output.get("needs_more", False)
        data["analysis_preview"] = analysis[:200] + "…" if len(analysis) > 200 else analysis
        # Parse structured parts from the analysis
        parts = parse_analysis_parts(analysis)
        data["synthesis"] = parts["synthesis"]
        data["gaps"] = parts["gaps"]
        data["confidence"] = "low" if node_output.get("needs_more") else "high"

    elif node_name == "write_report":
        report = node_output.get("report", "")
        data["report_length"] = len(report)
        data["sections"] = detect_report_sections(report)
        data["report_preview"] = report[:400] + "…" if len(report) > 400 else report

    return {
        "status": node_name,
        "message": message,
        "data": data,
    }
