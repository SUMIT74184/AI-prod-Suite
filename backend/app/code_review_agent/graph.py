"""
code_review_agent/graph.py
============================
Builds and compiles the LangGraph StateGraph for the Production Code Review Agent.

Graph structure:
    START -> context_builder
    
    If context_builder needs tools -> pending_tool_calls -> (interrupt)
    If context_builder is done -> agent_bug
    
    agent_bug -> agent_security -> agent_performance -> agent_architecture -> agent_quality
    
    agent_quality -> validate_findings -> deduplicate_findings -> aggregate_report
    
    aggregate_report -> generate_fixes -> generate_tests -> finalize_review -> END
"""

import logging
from langgraph.graph import StateGraph, END

from app.code_review_agent.state import ReviewState
from app.code_review_agent.context_builder import context_builder_node
from app.code_review_agent.specialist_agents import (
    agent_bug_node,
    agent_security_node,
    agent_performance_node,
    agent_architecture_node,
    agent_quality_node
)
from app.code_review_agent.post_processor import (
    validate_findings_node,
    deduplicate_findings_node,
    aggregate_report_node,
    generate_fixes_node,
    generate_tests_node,
    finalize_review_node
)

logger = logging.getLogger(__name__)

def should_continue_from_context_builder(state: ReviewState) -> str:
    """Conditional edge router from context builder."""
    if state.get("pending_tool_calls"):
        # We need the CLI to run tools, so we end the graph here.
        # The orchestrator will return a 202 to the CLI.
        # When the CLI submits results, we resume from context_builder.
        return "halt_for_tools"
    return "continue"

from typing import Any, cast

def build_graph() -> StateGraph:
    """Construct the StateGraph with all nodes and edges."""
    workflow = StateGraph(cast(Any, ReviewState))

    # 1. Context Builder
    workflow.add_node("context_builder", context_builder_node)
    
    # 2. Specialist Agents
    workflow.add_node("agent_bug", agent_bug_node)
    workflow.add_node("agent_security", agent_security_node)
    workflow.add_node("agent_performance", agent_performance_node)
    workflow.add_node("agent_architecture", agent_architecture_node)
    workflow.add_node("agent_quality", agent_quality_node)
    
    # 3. Post-Processing
    workflow.add_node("validate_findings", validate_findings_node)
    workflow.add_node("deduplicate_findings", deduplicate_findings_node)
    workflow.add_node("aggregate_report", aggregate_report_node)
    workflow.add_node("generate_fixes", generate_fixes_node)
    workflow.add_node("generate_tests", generate_tests_node)
    workflow.add_node("finalize_review", finalize_review_node)

    # --- Edges ---
    workflow.set_entry_point("context_builder")

    workflow.add_conditional_edges(
        "context_builder",
        should_continue_from_context_builder,
        {
            "halt_for_tools": END, 
            "continue": "agent_bug"
        }
    )

    # Sequential Agents to avoid 20 RPM limit
    workflow.add_edge("agent_bug", "agent_security")
    workflow.add_edge("agent_security", "agent_performance")
    workflow.add_edge("agent_performance", "agent_architecture")
    workflow.add_edge("agent_architecture", "agent_quality")
    
    # Fan-in to Post-Processing
    workflow.add_edge("agent_quality", "validate_findings")
    workflow.add_edge("validate_findings", "deduplicate_findings")
    workflow.add_edge("deduplicate_findings", "aggregate_report")
    workflow.add_edge("aggregate_report", "generate_fixes")
    workflow.add_edge("generate_fixes", "generate_tests")
    workflow.add_edge("generate_tests", "finalize_review")
    workflow.add_edge("finalize_review", END)

    return workflow

# Compile once
_workflow = build_graph()
compiled_graph = _workflow.compile()

logger.info("Production Code Review Agent graph compiled successfully.")
