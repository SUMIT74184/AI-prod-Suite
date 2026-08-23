# web_research_agent package
#
# A LangGraph-powered web research agent with 5 nodes:
#   plan → search → read → analyze → write_report
#
# Structure:
#   nodes/      — Individual node functions (plan, search, read, analyze, write_report)
#   tools/      — External I/O adapters (search engine, web scraper)
#   streaming/  — SSE event formatting with rich insights
#   state.py    — AgentState TypedDict
#   graph.py    — StateGraph builder
#   runner.py   — Public API (run_agent, stream_agent)
#
# Public API:
#   run_agent(query)     → AgentState  (blocking)
#   stream_agent(query)  → Generator   (yields enriched node updates for SSE)

from app.web_research_agent.runner import run_agent, stream_agent

__all__ = ["run_agent", "stream_agent"]
