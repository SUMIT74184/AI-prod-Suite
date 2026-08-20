"""
code_review_agent/state.py
============================
Defines ReviewState — the typed dictionary that flows through every
node in the LangGraph code review graph.

Field ownership (which node writes which field):
    code             → set by the caller (runner.py), never changed
    language         → written by: parse_code
    structure        → written by: parse_code
    line_count       → written by: parse_code
    bugs             → written by: detect_bugs
    security         → written by: check_security
    complexity       → written by: analyze_complexity
    explanation      → written by: synthesize_report
    health_score     → written by: synthesize_report
    refactoring      → written by: synthesize_report (lightweight suggestions)
    unit_tests       → written by: generate_tests
    status           → written by: every node (for SSE streaming)
    error            → written by: any node on exception
"""

from typing import TypedDict, List, Optional
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# Sub-types — structured data for findings
# ---------------------------------------------------------------------------

@dataclass
class BugFinding:
    """A single bug or potential issue found in the code."""
    description: str
    severity: str       # "critical", "high", "medium", "low"
    line_ref: str       # Line number or range reference (e.g. "L12", "L5-L10")
    category: str       # e.g. "logic_error", "edge_case", "type_error"


@dataclass
class SecurityFinding:
    """A single security vulnerability found in the code."""
    description: str
    severity: str       # "critical", "high", "medium", "low"
    category: str       # e.g. "injection", "xss", "auth", "crypto"
    line_ref: str       # Line number or range reference


@dataclass
class CodeStructure:
    """Parsed structural information about the code."""
    functions: List[str] = field(default_factory=list)
    classes: List[str] = field(default_factory=list)
    imports: List[str] = field(default_factory=list)
    summary: str = ""


# ---------------------------------------------------------------------------
# ReviewState
# ---------------------------------------------------------------------------

class ReviewState(TypedDict):
    """
    The complete state of the Code Review Agent at any point in the graph.

    Nodes return partial dicts — LangGraph merges them back automatically.
    """

    # --- Input ---
    code: str                              # The raw source code to review

    # --- Parse node output ---
    language: str                          # Detected programming language
    structure: dict                        # Parsed code structure (as dict for serialization)
    line_count: int                        # Number of lines in the code

    # --- Bug detection output ---
    bugs: List[dict]                       # List of BugFinding dicts

    # --- Security check output ---
    security: List[dict]                   # List of SecurityFinding dicts

    # --- Complexity analysis output ---
    complexity: str                        # Complexity analysis text

    # --- Synthesis output ---
    explanation: str                       # High-level explanation of what the code does
    health_score: int                      # 0-100 health score
    refactoring: List[str]                 # Refactoring suggestions

    # --- Test generation output ---
    unit_tests: str                        # Generated unit test code

    # --- Streaming metadata ---
    status: str                            # Current node name (for SSE)
    error: Optional[str]                   # Error message if a node fails


# ---------------------------------------------------------------------------
# Initial state factory
# ---------------------------------------------------------------------------

def initial_state(code: str) -> ReviewState:
    """
    Build a fresh ReviewState for a new code review job.

    Called by runner.py before invoking the graph. Every field is
    initialised to a safe empty value so nodes never see KeyError.
    """
    return ReviewState(
        code=code,
        language="unknown",
        structure={},
        line_count=0,
        bugs=[],
        security=[],
        complexity="",
        explanation="",
        health_score=100,
        refactoring=[],
        unit_tests="",
        status="starting",
        error=None,
    )
