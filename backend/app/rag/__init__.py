# rag package — Retrieval-Augmented Generation pipeline.
#
# Sub-modules:
#   embedder  — turns text into vector embeddings via Gemini
#   store     — ChromaDB read/write operations
#   ingester  — parses files, YouTube transcripts, and web URLs then stores them
#   retriever — queries the vector store and formats results
