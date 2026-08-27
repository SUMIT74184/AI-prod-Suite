"""
routers/review_orchestrator.py
==============================
Handles API endpoints for the Production Code Review Agent.
Supports CLI interactive protocols and Webhooks.
"""

import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from app.code_review_agent.runner import run_review, stream_review, handle_tool_response

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/review", tags=["Review Orchestrator"])

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class CLIReviewRequest(BaseModel):
    repo_name: str
    git_diff: str

class ToolResult(BaseModel):
    tool_call_id: str
    result: Any

class ToolResponseRequest(BaseModel):
    session_id: str
    results: List[ToolResult]

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/cli")
def start_cli_review(req: CLIReviewRequest):
    """
    Start a review job from the CLI.
    If the graph halts to request a tool call (e.g. read_file), 
    this returns 202 Accepted with pending tool calls.
    """
    logger.info("Starting CLI review for repo: %s", req.repo_name)
    try:
        # We start the review. 
        # In a real stateful implementation, we'd use LangGraph's checkpointer
        # with a thread_id, but here we simulate the interface.
        session_id = "mock-session-id" # In production, generate UUID
        
        # run_review is a wrapper that will halt if tools are needed
        state = run_review(req.git_diff, req.repo_name)
        
        if state.get("pending_tool_calls"):
            return {
                "status": "pending_tools",
                "session_id": session_id,
                "tool_calls": state["pending_tool_calls"]
            }
        
        return {
            "status": "complete",
            "findings": state.get("deduplicated_findings", []),
            "fixes": state.get("generated_fixes", []),
            "health_score": state.get("health_score", 100)
        }
    except Exception as e:
        logger.error("CLI review failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tool_result")
def submit_tool_result(req: ToolResponseRequest):
    """
    Submit the results of tools executed securely on the CLI's local machine.
    This resumes the LangGraph pipeline.
    """
    logger.info("Received tool results for session: %s", req.session_id)
    try:
        # Resume the graph with the tool results
        # format: { "tool_id_1": "result text" }
        tool_results_dict = {tr.tool_call_id: tr.result for tr in req.results}
        state = handle_tool_response(req.session_id, tool_results_dict)
        
        if state.get("pending_tool_calls"):
            return {
                "status": "pending_tools",
                "session_id": req.session_id,
                "tool_calls": state["pending_tool_calls"]
            }
            
        return {
            "status": "complete",
            "findings": state.get("deduplicated_findings", []),
            "fixes": state.get("generated_fixes", []),
            "health_score": state.get("health_score", 100)
        }
    except Exception as e:
        logger.error("Tool result submission failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
