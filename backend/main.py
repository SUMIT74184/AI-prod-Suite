from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from agents.web_researcher import run_research
from agents.research_assistant import generate_assistant_response, ChatMessage
from agents.code_reviewer import review_code
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI Productivity Suite Backend")

# Optional: Add CORS if you run frontend and backend on different ports without proxy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResearchRequest(BaseModel):
    query: str

class ResearchResponse(BaseModel):
    report: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    youtube_url: Optional[str] = ""

class ChatResponse(BaseModel):
    reply: str

class CodeReviewRequest(BaseModel):
    code: str

@app.get("/api/py/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/py/web-research", response_model=ResearchResponse)
def perform_web_research(request: ResearchRequest):
    """
    Endpoint that takes a query, searches the web, 
    and returns an AI-generated report.
    """
    report = run_research(request.query)
    return ResearchResponse(report=report)

@app.post("/api/py/chat", response_model=ChatResponse)
def perform_chat(request: ChatRequest):
    """
    Endpoint that takes chat history and an optional youtube URL,
    and returns an AI-generated response.
    """
    reply = generate_assistant_response(request.messages, request.youtube_url)
    return ChatResponse(reply=reply)

@app.post("/api/py/code-review")
def perform_code_review(request: CodeReviewRequest):
    """
    Endpoint that takes raw code and returns a structured review
    with bugs, security issues, improvements, explanation, etc.
    """
    result = review_code(request.code)
    return result

