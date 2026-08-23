"""
streaming/insights.py
=====================
Helper functions to extract structured insight data from node outputs.
Used by the formatter to enrich SSE events with granular data.
"""

from typing import List, Dict, Any
from urllib.parse import urlparse


def extract_top_results(search_results: list, limit: int = 5) -> List[Dict[str, str]]:
    """Extract preview data from search results for the frontend."""
    previews = []
    for r in search_results[-limit:]:  # Most recent results
        previews.append({
            "title": getattr(r, "title", ""),
            "url": getattr(r, "url", ""),
            "snippet": getattr(r, "snippet", "")[:120],
        })
    return previews


def extract_new_domains(sources: List[str]) -> List[str]:
    """Extract unique domain names from source URLs."""
    domains = set()
    for url in sources:
        try:
            domain = urlparse(url).netloc.replace("www.", "")
            if domain:
                domains.add(domain)
        except Exception:
            pass
    return sorted(domains)


def extract_page_previews(page_contents: list) -> List[Dict[str, Any]]:
    """Extract preview data from fetched pages."""
    previews = []
    for p in page_contents:
        previews.append({
            "title": getattr(p, "title", ""),
            "url": getattr(p, "url", ""),
            "word_count": getattr(p, "word_count", 0),
        })
    return previews


def compute_total_words(page_contents: list) -> int:
    """Sum up total words collected across all pages."""
    return sum(getattr(p, "word_count", 0) for p in page_contents)


def parse_analysis_parts(analysis_text: str) -> Dict[str, str]:
    """Parse SYNTHESIS/GAPS/DECISION from analysis output."""
    parts = {"synthesis": "", "gaps": "", "decision": ""}

    if "SYNTHESIS:" in analysis_text:
        after = analysis_text.split("SYNTHESIS:", 1)[1]
        parts["synthesis"] = after.split("GAPS:")[0].strip()[:300] if "GAPS:" in after else after.strip()[:300]

    if "GAPS:" in analysis_text:
        after = analysis_text.split("GAPS:", 1)[1]
        parts["gaps"] = after.split("DECISION:")[0].strip()[:200] if "DECISION:" in after else after.strip()[:200]

    if "DECISION:" in analysis_text:
        parts["decision"] = analysis_text.split("DECISION:", 1)[1].strip()[:50]

    return parts


def detect_report_sections(report: str) -> List[str]:
    """Extract markdown section headers from the report."""
    sections = []
    for line in report.splitlines():
        line = line.strip()
        if line.startswith("## "):
            sections.append(line[3:].strip())
        elif line.startswith("# "):
            sections.append(line[2:].strip())
    return sections
