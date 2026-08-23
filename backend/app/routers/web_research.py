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
import asyncio
from concurrent.futures import ThreadPoolExecutor
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
async def stream_web_research(
    query: str,
    session_id: Optional[str] = None,
    user_id: str = "demo-user",
    module: str = "web-research-agent"
) -> StreamingResponse:
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
        session_id: Optional UUID to save the conversation history
        user_id: User identifier for DB saving
        module: Module name for DB saving

    Note: The final report is NOT included in stream events (too large).
    After status="complete", the frontend should call POST /run to get
    the full report, OR we store it server-side (future enhancement).
    """
    logger.info("SSE stream requested for query: '%s', session_id: %s", query, session_id)

    async def event_generator():
        q = asyncio.Queue()
        loop = asyncio.get_running_loop()
        
        # We need a place to store the final result in the closure
        final_result_data = {}

        def worker():
            try:
                for update in stream_agent(query):
                    # Keep track of the final data payload if it's the "complete" step
                    if update.get("status") == "complete" and "data" in update:
                        final_result_data.update(update["data"])
                    asyncio.run_coroutine_threadsafe(q.put(update), loop)
                asyncio.run_coroutine_threadsafe(q.put(None), loop)
            except Exception as exc:
                asyncio.run_coroutine_threadsafe(q.put(exc), loop)

        executor = ThreadPoolExecutor(max_workers=1)
        # We don't await the worker, we let it run in the background
        loop.run_in_executor(executor, worker)

        # Yield an initial ping so the client receives HTTP headers immediately
        yield ": ping\n\n"

        while True:
            try:
                # Wait for the next item, but timeout every 15 seconds to send a ping
                item = await asyncio.wait_for(q.get(), timeout=15.0)
                
                if item is None:
                    # Stream finished successfully, save to DB
                    if session_id and final_result_data:
                        try:
                            from app.core.database import get_session, create_session, add_message
                            db_session = get_session(session_id)
                            if not db_session:
                                title = query[:40] + ("..." if len(query) > 40 else "")
                                create_session(session_id, user_id, title, module)
                            
                            add_message(session_id, "user", query)
                            # Serialize the final data (report, sources, sub_queries, iteration) as JSON
                            # so the frontend can reconstruct the state
                            add_message(session_id, "assistant", json.dumps(final_result_data))
                        except Exception as exc:
                            logger.error("Failed to persist web research to DB: %s", exc)
                    break
                
                if isinstance(item, Exception):
                    error_event = json.dumps({
                        "status": "error",
                        "message": str(item),
                        "data": {},
                    })
                    yield f"data: {error_event}\n\n"
                    break

                # SSE format: "data: <json>\n\n"
                json_str = json.dumps(item)
                yield f"data: {json_str}\n\n"
            
            except asyncio.TimeoutError:
                # Send a comment (ping) to keep the Next.js proxy / browser socket alive
                yield ": ping\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",   # Disable nginx buffering for SSE
        },
    )
