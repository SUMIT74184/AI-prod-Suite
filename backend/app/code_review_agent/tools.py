"""
code_review_agent/tools.py
============================
Defines the tool interfaces for the Context Builder.
Because the backend does not have access to the user's local filesystem,
these functions don't execute the tools directly. Instead, they append
a ToolCall to the state, which halts the graph and asks the CLI to run it.
"""

import uuid
from typing import Dict, Any
from app.code_review_agent.state import ToolCall, ReviewState

def request_read_file(state: ReviewState, filepath: str) -> dict:
    """
    Requests the CLI to read a file from the repository.
    """
    call = ToolCall(
        id=str(uuid.uuid4()),
        tool_name="read_file",
        arguments={"filepath": filepath}
    )
    return {"pending_tool_calls": state.get("pending_tool_calls", []) + [call]}

def request_search_code(state: ReviewState, query: str) -> dict:
    """
    Requests the CLI to grep/search the repository.
    """
    call = ToolCall(
        id=str(uuid.uuid4()),
        tool_name="search_code",
        arguments={"query": query}
    )
    return {"pending_tool_calls": state.get("pending_tool_calls", []) + [call]}

def request_find_symbol(state: ReviewState, symbol: str) -> dict:
    """
    Requests the CLI to find where a symbol (class/function) is defined.
    """
    call = ToolCall(
        id=str(uuid.uuid4()),
        tool_name="find_symbol",
        arguments={"symbol": symbol}
    )
    return {"pending_tool_calls": state.get("pending_tool_calls", []) + [call]}
