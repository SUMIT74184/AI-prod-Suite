# web_research_agent package
#
# A LangGraph-powered web research agent with 5 nodes:
#   plan → search → read → analyze → write_report
#
# Public API (via runner.py):
#   run_agent(query)     → AgentState  (blocking)
#   stream_agent(query)  → Generator   (yields node updates for SSE)
