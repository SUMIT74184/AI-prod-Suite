"""
Execution Schemas
-----------------
DTOs for running prompts against single or multiple LLM providers.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ModelConfig(BaseModel):
    provider: str = Field(..., description="Provider name (OpenAI, Anthropic, Gemini)")
    model: str = Field(..., description="Model ID (e.g. gpt-4o, claude-3-5-sonnet, gemini-1.5-pro)")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2048, ge=1, le=16384)
    top_p: float = Field(default=1.0, ge=0.0, le=1.0)
    stream: bool = Field(default=False)
    json_mode: bool = Field(default=False)
    json_schema: Optional[str] = Field(default=None)

class ExecuteRequest(BaseModel):
    prompt_id: Optional[str] = None
    system_prompt: str = Field(default="")
    user_prompt: str = Field(..., description="Raw user prompt with {{variables}}")
    variables: Dict[str, str] = Field(default_factory=dict, description="Key-value mapping for variables")
    model_config: ModelConfig

class CompareRequest(BaseModel):
    prompt_id: Optional[str] = None
    system_prompt: str = Field(default="")
    user_prompt: str = Field(..., description="Raw user prompt with {{variables}}")
    variables: Dict[str, str] = Field(default_factory=dict)
    models: List[ModelConfig] = Field(..., min_items=1, max_items=4, description="List of model configs to run concurrently")

class ExecutionMetrics(BaseModel):
    latency_ms: float
    input_tokens: int
    output_tokens: int
    total_tokens: int
    estimated_cost_usd: float
    provider: str
    model: str

class ExecuteResponse(BaseModel):
    run_id: str
    output_text: str
    rendered_system_prompt: str
    rendered_user_prompt: str
    metrics: ExecutionMetrics
    status: str
    error_message: Optional[str] = None

class CompareResponse(BaseModel):
    results: List[ExecuteResponse]
