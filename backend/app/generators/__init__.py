# generators package — structured output generators for the Research Assistant.
#
# Each generator is a pure function:
#   Input  : list of retrieved RAG chunks (dicts with 'text' and 'source')
#   Output : a formatted string or structured dict
#
# Sub-modules:
#   summary    — comprehensive document summary
#   notes      — structured study notes with headings
#   flashcards — Q&A cards for key concepts
#   mindmap    — hierarchical JSON tree of topics
