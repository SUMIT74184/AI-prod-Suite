"""
Prompt Playground Router
------------------------
FastAPI endpoints for prompt management, multi-model execution, comparison, versioning, and history.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from app.prompt_playground.schemas.prompt_schema import PromptCreate, PromptResponse, PromptUpdate
from app.prompt_playground.schemas.execution_schema import ExecuteRequest, ExecuteResponse, CompareRequest, CompareResponse
from app.prompt_playground.repositories.prompt_repository import PromptRepository
from app.prompt_playground.services.execution_service import ExecutionService

router = APIRouter(prefix="/api/py/prompt-playground", tags=["Prompt Playground"])

# Initial seed data for pre-built templates
SEED_PROMPTS = [
    {
        "name": "Customer Support Email",
        "section": "My Prompts",
        "description": "Polite customer support email response generator",
        "tags": ["Email", "Support"],
        "system_prompt": "You are a helpful customer support agent for Acme Corp. Always be polite, empathetic, and concise.",
        "user_prompt": "Draft an email responding to a customer named {{customer_name}} about their delayed order of {{product}}. The new ETA is {{eta}}.",
        "provider": "OpenAI",
        "model": "GPT-4o"
    },
    {
        "name": "Code Reviewer Agent",
        "section": "Team Prompts",
        "description": "Senior software engineer reviewing code snippets",
        "tags": ["Coding", "Security"],
        "system_prompt": "You are an expert senior software engineer. Review the provided code for bugs, security risks, performance, and formatting.",
        "user_prompt": "Review the following {{language}} code:\n\n{{code}}",
        "provider": "Anthropic",
        "model": "Claude 3.5 Sonnet"
    },
    {
        "name": "Meeting Summarizer",
        "section": "Templates",
        "description": "Extract action items and key decisions from transcripts",
        "tags": ["Summarization", "Productivity"],
        "system_prompt": "Extract action items, key decisions, and a concise summary from the meeting transcript.",
        "user_prompt": "Meeting Transcript:\n{{transcript}}",
        "provider": "Gemini",
        "model": "Gemini 1.5 Pro"
    }
]

def seed_db_if_empty():
    existing = PromptRepository.get_all_prompts()
    if not existing:
        for seed in SEED_PROMPTS:
            PromptRepository.create_prompt(
                name=seed["name"],
                description=seed["description"],
                section=seed["section"],
                tags=seed["tags"],
                system_prompt=seed["system_prompt"],
                user_prompt=seed["user_prompt"],
                provider=seed["provider"],
                model=seed["model"]
            )

@router.get("/prompts")
def list_prompts() -> List[Dict[str, Any]]:
    """List all prompts from DB (with auto-seeding if empty)."""
    seed_db_if_empty()
    return PromptRepository.get_all_prompts()

@router.post("/prompts")
def create_prompt(payload: PromptCreate) -> Dict[str, Any]:
    """Create a new prompt with initial version snapshot."""
    return PromptRepository.create_prompt(
        name=payload.name,
        description=payload.description or "",
        section=payload.section or "My Prompts",
        tags=payload.tags or [],
        system_prompt=payload.system_prompt or "",
        user_prompt=payload.user_prompt,
        provider=payload.default_provider or "OpenAI",
        model=payload.default_model or "GPT-4o"
    )

@router.get("/prompts/{prompt_id}")
def get_prompt(prompt_id: str) -> Dict[str, Any]:
    """Retrieve full prompt details including all historical versions."""
    prompt = PromptRepository.get_prompt_by_id(prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return prompt

@router.post("/prompts/{prompt_id}/versions")
def add_version(prompt_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new version for an existing prompt."""
    try:
        return PromptRepository.add_version(
            prompt_id=prompt_id,
            system_prompt=payload.get("system_prompt", ""),
            user_prompt=payload.get("user_prompt", ""),
            provider=payload.get("provider", "OpenAI"),
            model=payload.get("model", "GPT-4o")
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/execute", response_model=ExecuteResponse)
async def execute_prompt(request: ExecuteRequest) -> ExecuteResponse:
    """Execute a prompt completion against a single LLM provider model."""
    return await ExecutionService.execute_prompt(request)

@router.post("/compare", response_model=CompareResponse)
async def compare_models(request: CompareRequest) -> CompareResponse:
    """Run a prompt concurrently against multiple LLM models and return comparative results."""
    return await ExecutionService.compare_models(request)

@router.get("/history")
def get_history(prompt_id: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
    """Retrieve execution history logs."""
    return PromptRepository.get_runs(prompt_id=prompt_id, limit=limit)
