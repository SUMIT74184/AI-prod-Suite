# AI Productivity Suite

A modern, high-performance AI productivity platform with 5 specialized AI-powered modules. Built with a stunning xAI-inspired dark interface, featuring a Next.js frontend and a Python/FastAPI backend.

## 📁 Project Structure

```
ai-productivity-suite/
├── frontend/           ← Next.js 16 (React 19) application
│   ├── app/            ← App Router: pages, layouts, API routes
│   ├── components/     ← React components (ui/, layout/, shared/, workflow/)
│   ├── lib/            ← Utilities, auth context, hooks
│   └── public/         ← Static assets
│
├── backend/            ← Python/FastAPI application
│   ├── app/            ← Application package
│   │   ├── core/       ← LLM clients, prompts, database
│   │   ├── routers/    ← API route handlers
│   │   ├── services/   ← Business logic (code reviewer, web researcher)
│   │   ├── generators/ ← Content generators (summary, notes, flashcards, mindmap)
│   │   ├── rag/        ← RAG pipeline (embedder, ingester, retriever, store)
│   │   ├── web_research_agent/  ← LangGraph web research agent
│   │   └── prompt_playground/   ← Prompt Playground feature
│   └── data/           ← Runtime data (SQLite, ChromaDB) — gitignored
│
├── DESIGN.md           ← Design system documentation
└── README.md
```

## 🚀 Quick Start

### 1. Frontend Setup
```bash
cd frontend
pnpm install
cp .env.example .env.local   # Add your Clerk keys
pnpm dev                      # Starts on http://localhost:3000
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env          # Add your API keys
uvicorn app.main:app --reload --port 8000
```

## 🧩 Modules

1. **AI Research Assistant** — RAG-powered document analysis with chat, summary, notes, flashcards, and mind maps
2. **AI Code Reviewer** — Automated code analysis with bug detection and optimization suggestions
3. **Prompt Playground** — Multi-provider prompt testing sandbox with version control and metrics
4. **Web Research Agent** — LangGraph-based autonomous web research with streaming reports
5. **Workflow Automation** — Visual drag-and-drop workflow builder with node catalog

## 💻 AI Code Reviewer CLI

```bash
cd frontend
npm link              # Link globally
ai-reviewer path/to/file.js
```

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript 5.7, Tailwind CSS 4 |
| Backend | Python, FastAPI, LangGraph, ChromaDB |
| LLM Providers | OpenRouter (free models), Google Gemini |
| Auth | Clerk (`@clerk/nextjs`) |
| Design | xAI-inspired dark theme (Inter + Geist Mono) |
