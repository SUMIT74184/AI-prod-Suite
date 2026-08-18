"""
routers/web_research.py
========================
FastAPI router for the Web Research Agent.

Endpoints:
    POST /api/py/web-research/run
        Body:    { "query": "..." }
        Returns: { "report": "...", "sources": [...], "sub_queries": [...],
                   "analysis": "...", "iteration": int, "error": null }

    GET  /api/py/web-research/stream?query=...
        Returns: Server-Sent Events (SSE) stream
        Each event: data: {"status": "...", "message": "...", "data": {...}}

The SSE endpoint allows the frontend to display real-time progress:
each node completion is pushed to the browser as it happens.

Why SSE instead of WebSocket?
    SSE is unidirectional (server → client) and works over plain HTTP.
    It's simpler to implement and sufficient for this use case since
    the user only sends one query and listens for progress.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.web_research_agent.runner import run_agent, stream_agent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/py/web-research", tags=["Web Research Agent"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class WebResearchRequest(BaseModel):
    query: str


class WebResearchResponse(BaseModel):
    report: str
    sources: list
    sub_queries: list
    analysis: str
    iteration: int
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoint 1: Blocking run
# ---------------------------------------------------------------------------

@router.post("/run", response_model=WebResearchResponse)
def run_web_research(request: WebResearchRequest) -> WebResearchResponse:
    """
    Run the full Web Research Agent and return the complete result.

    This is a blocking endpoint — it waits for all 5 nodes to complete
    before returning. Typical response time: 20-60 seconds depending on
    the topic and number of loop iterations.

    Use the /stream endpoint if you want real-time progress updates.
    """
    logger.info("Web research requested: '%s'", request.query)

    final_state = run_agent(request.query)

    return WebResearchResponse(
        report=final_state.get("report", ""),
        sources=final_state.get("sources", []),
        sub_queries=final_state.get("sub_queries", []),
        analysis=final_state.get("analysis", ""),
        iteration=final_state.get("iteration", 0),
        error=final_state.get("error"),
    )


# ---------------------------------------------------------------------------
# Endpoint 2: SSE streaming
# ---------------------------------------------------------------------------

@router.get("/stream")
def stream_web_research(query: str) -> StreamingResponse:
    """
    Run the Web Research Agent and stream progress updates via SSE.

    The frontend connects to this endpoint using EventSource or fetch
    with { mode: 'stream' }. Each node completion emits one SSE event.

    SSE event format:
        data: {"status": "plan", "message": "Planning research...", "data": {...}}

    Node sequence:
        plan → search → read → analyze → (possibly search again) → write_report → complete

    Query parameter:
        query: The research topic (URL-encoded string)

    Note: The final report is NOT included in stream events (too large).
    After status="complete", the frontend should call POST /run to get
    the full report, OR we store it server-side (future enhancement).
    """
    logger.info("SSE stream requested for query: '%s'", query)

    def event_generator():
        """
        Generator that yields SSE-formatted strings.

        Runs the agent ONCE via stream_agent(), which itself calls
        compiled_graph.stream(). After all nodes complete, runner.py
        yields a final "complete" event that includes the full report,
        sources, and sub_queries — so the frontend does NOT need to
        make a second /run call.
        """
        try:
            for update in stream_agent(query):
                # SSE format: "data: <json>\n\n"
                json_str = json.dumps(update)
                yield f"data: {json_str}\n\n"
        except Exception as exc:
            error_event = json.dumps({
                "status": "error",
                "message": str(exc),
                "data": {},
            })
            yield f"data: {error_event}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # Disable nginx buffering for SSE
        },
    )
