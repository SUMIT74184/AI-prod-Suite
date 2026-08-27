"""
routers/code_review.py
========================
FastAPI router for the LangGraph Code Review Agent.

Endpoints:
    POST /api/py/code-review/run
        Body:    { "code": "..." }
        Returns: Full review result (blocking)

    GET  /api/py/code-review/stream?code=...
        Returns: Server-Sent Events (SSE) stream
        Each event: data: {"status": "...", "message": "...", "data": {...}}

The SSE endpoint allows the frontend to display real-time progress:
each node completion (parse, bugs, security, complexity, synthesis,
tests, finalize) is pushed to the browser as it happens.
"""

import json
import logging
from typing import Optional, List

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.code_review_agent.runner import run_review, stream_review
from app.services.git_fetcher import GitFetcher

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/py/code-review", tags=["Code Review Agent"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class CodeReviewRequest(BaseModel):
    code: str


class BugItem(BaseModel):
    description: str
    severity: str
    line_ref: str
    category: str


class SecurityItem(BaseModel):
    description: str
    severity: str
    category: str
    line_ref: str


class CodeReviewResponse(BaseModel):
    bugs: List[BugItem]
    security: List[SecurityItem]
    complexity: str
    explanation: str
    health_score: int
    refactoring: List[str]
    unit_tests: str
    language: str
    line_count: int
    structure: dict
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoint 1: Blocking run
# ---------------------------------------------------------------------------

@router.post("/run", response_model=CodeReviewResponse)
def run_code_review(request: CodeReviewRequest) -> CodeReviewResponse:
    """
    Run the full Code Review Agent and return the complete result.

    This is a blocking endpoint — it waits for all 7 analysis nodes
    to complete before returning. Typical response time: 30-90 seconds
    depending on code size and LLM provider.

    Use the /stream endpoint if you want real-time progress updates.
    """
    logger.info("Code review requested (%d chars)", len(request.code))

    final_state = run_review(request.code, repo_name="web-ui-snippet")

    # Map unified findings back to legacy response shape
    all_findings = final_state.get("deduplicated_findings", final_state.get("raw_findings", []))
    bugs = [f for f in all_findings if f.get("agent") in ("bug",)]
    security = [f for f in all_findings if f.get("agent") in ("security",)]

    return CodeReviewResponse(
        bugs=[BugItem(**{k: b.get(k, "") for k in ("description", "severity", "line_ref", "category")}) for b in bugs],
        security=[SecurityItem(**{k: s.get(k, "") for k in ("description", "severity", "category", "line_ref")}) for s in security],
        complexity="",
        explanation=final_state.get("explanation", ""),
        health_score=final_state.get("health_score", 100),
        refactoring=final_state.get("refactoring", []),
        unit_tests=final_state.get("generated_tests", ""),
        language="unknown",
        line_count=0,
        structure={},
        error=final_state.get("error"),
    )


# ---------------------------------------------------------------------------
# Endpoint 2: SSE streaming
# ---------------------------------------------------------------------------

@router.get("/stream")
def stream_code_review(code: str) -> StreamingResponse:
    """
    Run the Code Review Agent and stream progress updates via SSE.

    The frontend connects using EventSource or fetch with streaming.
    Each node completion emits one SSE event with partial results.

    Node sequence:
        parse_code → detect_bugs → check_security → analyze_complexity
        → synthesize_report → generate_tests → finalize_review → complete

    The final "complete" event includes the full review result so the
    frontend does NOT need a second /run call.

    Query parameter:
        code: The source code to review (URL-encoded string)
    """
    logger.info("SSE stream requested for code review (%d chars)", len(code))

    async def event_generator():
        import json
        import threading
        from queue import Queue, Empty
        import asyncio
        import time

        q = Queue()

        def worker():
            try:
                for update in stream_review(code, repo_name="web-ui-snippet"):
                    json_str = json.dumps(update)
                    q.put(f"data: {json_str}\n\n")
                q.put(None)
            except Exception as exc:
                error_event = json.dumps({
                    "status": "error",
                    "message": str(exc),
                    "data": {},
                })
                q.put(f"data: {error_event}\n\n")
                q.put(None)

        threading.Thread(target=worker, daemon=True).start()

        last_ping = time.time()
        while True:
            try:
                item = q.get_nowait()
                if item is None:
                    break
                yield item
                last_ping = time.time()
            except Empty:
                await asyncio.sleep(0.5)
                if time.time() - last_ping > 15:
                    ping_event = json.dumps({"status": "ping", "message": "Analyzing code... Please hold on."})
                    yield f"data: {ping_event}\n\n"
                    last_ping = time.time()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# Endpoint 3: SSE streaming for Repositories (GitHub / GitLab)
# ---------------------------------------------------------------------------

@router.get("/stream/repo")
def stream_repo_review(
    url: str = Query(..., description="The GitHub/GitLab repository URL"),
    token: Optional[str] = Query(None, description="Optional PAT for private repos")
) -> StreamingResponse:
    """
    Clones a repository, extracts source files, and streams the review progress.
    """
    logger.info("SSE stream requested for repository: %s", url)

    async def event_generator():
        import json
        import threading
        from queue import Queue, Empty
        import asyncio
        import time

        q = Queue()

        def worker():
            try:
                q.put(f"data: {json.dumps({'status': 'cloning', 'message': f'Cloning repository {url}...', 'data': {}})}\n\n")
                from app.services.git_fetcher import GitFetcher
                extracted_files = GitFetcher.clone_and_extract(url, token)
                
                if not extracted_files:
                    q.put(f"data: {json.dumps({'status': 'error', 'message': 'No supported source code files found in repository.', 'data': {}})}\n\n")
                    q.put(None)
                    return
                    
                q.put(f"data: {json.dumps({'status': 'preparing', 'message': f'Extracted {len(extracted_files)} files. Preparing for analysis...', 'data': {'file_count': len(extracted_files)}})}\n\n")
                
                code_context = f"# Repository Scan: {url}\n\n"
                for file in extracted_files:
                    code_context += f"--- FILE: {file['filepath']} ---\n{file['content']}\n\n"
                    
                for update in stream_review(code_context, repo_name=url):
                    q.put(f"data: {json.dumps(update)}\n\n")
                    
                q.put(None)
            except Exception as e:
                q.put(f"data: {json.dumps({'status': 'error', 'message': str(e), 'data': {}})}\n\n")
                q.put(None)

        threading.Thread(target=worker, daemon=True).start()

        last_ping = time.time()
        while True:
            try:
                item = q.get_nowait()
                if item is None:
                    break
                yield item
                last_ping = time.time()
            except Empty:
                await asyncio.sleep(0.5)
                if time.time() - last_ping > 15:
                    # Send a JSON ping event to keep connection alive and inform the user
                    ping_event = json.dumps({"status": "ping", "message": "Still analyzing massive codebase... Please hold on."})
                    yield f"data: {ping_event}\n\n"
                    last_ping = time.time()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
