"""
code_review_agent/context_builder.py
======================================
Analyzes the git diff and determines if additional repository context 
is required (e.g., full file contents, symbol definitions).
If context is needed, it issues ToolCalls to the CLI.
"""

import json
import logging
from app.core.llm_client import generate_text
from app.code_review_agent.state import ReviewState
from app.code_review_agent.tools import request_read_file

logger = logging.getLogger(__name__)

def context_builder_node(state: ReviewState) -> dict:
    """
    Looks at the diff and decided if we have enough context.
    If we have pending tool calls that just returned, we process them.
    If we need more context, we issue tool calls.
    """
    logger.info("[context_builder] Checking context for diff...")

    # If the CLI just returned tool results, we ingest them into context_files
    if state.get("tool_results"):
        new_context = dict(state.get("context_files", {}))
        for tool_id, result in state["tool_results"].items():
            # For simplicity, we assume the result is the file content
            # In reality, we'd look up the original pending_tool_calls to know the filepath
            new_context[f"file_{tool_id}"] = str(result)
        
        # Clear tool_results and pending_tool_calls once consumed
        return {
            "context_files": new_context,
            "tool_results": {},
            "pending_tool_calls": [],
            "status": "context_built"
        }

    # If this is the first time running, we ask the LLM if we need to read full files
    prompt = f"""\
You are an expert code reviewer. You are reviewing a git diff.
To do a thorough job, do you need to see the full contents of any files mentioned in the diff?

Diff:
```
{state['git_diff'][:2000]} # Truncated for safety
```

If you have enough context to review just the diff, return {{"needs_files": []}}.
If you need to read the full contents of files, return a JSON object: {{"needs_files": ["path/to/file1.py", "path/to/file2.py"]}}.
Return ONLY valid JSON.
"""
    try:
        raw = generate_text(prompt)
        raw = raw.strip()
        if raw.startswith("```json"): raw = raw[7:]
        if raw.startswith("```"): raw = raw[3:]
        if raw.endswith("```"): raw = raw[:-3]
        
        parsed = json.loads(raw.strip())
        needs_files = parsed.get("needs_files", [])
        
        pending = []
        import uuid
        from app.code_review_agent.state import ToolCall
        
        for filepath in needs_files:
            if filepath not in state.get("context_files", {}):
                pending.append(ToolCall(
                    id=str(uuid.uuid4()),
                    tool_name="read_file",
                    arguments={"filepath": filepath}
                ))
        
        if pending:
            logger.info("[context_builder] Requesting %d files from CLI", len(pending))
            return {"pending_tool_calls": pending, "status": "waiting_for_tools"}
            
        return {"status": "context_built"}
        
    except Exception as e:
        logger.error("[context_builder] LLM parsing failed: %s", e)
        # On failure, proceed without extra context
        return {"status": "context_built"}
