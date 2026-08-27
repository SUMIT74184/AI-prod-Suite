"""
code_review_agent/state.py
============================
Defines ReviewState — the typed dictionary that flows through every
node in the LangGraph code review graph.

Updated for Production-Level Architecture.
"""

from typing import TypedDict, List, Optional, Any, Dict
from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# Sub-types
# ---------------------------------------------------------------------------

@dataclass
class Finding:
    """A single issue found in the code by any specialist agent."""
    id: str             # Unique ID for deduplication
    agent: str          # Which agent found this (e.g. "bug", "security")
    description: str
    severity: str       # "critical", "high", "medium", "low"
    line_ref: str       
    category: str
    confidence: float   # Added for Validator to drop low-confidence findings

@dataclass
class ToolCall:
    """Represents a request for the CLI to execute a tool (secure protocol)."""
    id: str
    tool_name: str
    arguments: Dict[str, Any]

# ---------------------------------------------------------------------------
# ReviewState
# ---------------------------------------------------------------------------

class ReviewState(TypedDict):
    """
    The complete state of the Code Review Agent at any point in the graph.
    """

    # --- Input ---
    repo_name: str
    git_diff: str                          # The raw diff to review
    context_files: Dict[str, str]          # Files read from the repo to build context

    # --- Tooling (Interactive Protocol) ---
    pending_tool_calls: List[ToolCall]     # Tools the CLI needs to run
    tool_results: Dict[str, Any]           # Results returned by the CLI

    # --- Raw Agent Findings ---
    raw_findings: List[dict]               # All findings from all agents

    # --- Post-Processing ---
    validated_findings: List[dict]         # Filtered by Finding Validator
    deduplicated_findings: List[dict]      # Final list after Deduplication

    # --- Synthesis & Generation ---
    explanation: str                       
    health_score: int                      
    refactoring: List[str]                 
    generated_tests: str
    generated_fixes: List[dict]            # Inline patches to fix findings

    # --- Metadata ---
    status: str
    error: Optional[str]


# ---------------------------------------------------------------------------
# Initial state factory
# ---------------------------------------------------------------------------

def initial_state(git_diff: str, repo_name: str = "unknown") -> ReviewState:
    return ReviewState(
        repo_name=repo_name,
        git_diff=git_diff,
        context_files={},
        pending_tool_calls=[],
        tool_results={},
        raw_findings=[],
        validated_findings=[],
        deduplicated_findings=[],
        explanation="",
        health_score=100,
        refactoring=[],
        generated_tests="",
        generated_fixes=[],
        status="starting",
        error=None,
    )
