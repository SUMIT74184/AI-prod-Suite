"""
Base LLM Adapter
----------------
Defines the standard abstract interface for all LLM providers (OpenAI, Anthropic, Gemini, etc.).
"""

from abc import ABC, abstractmethod
from typing import AsyncGenerator, Dict, Any
import time
from app.prompt_playground.schemas.execution_schema import ModelConfig, ExecuteResponse, ExecutionMetrics
from app.prompt_playground.utils.pricing import calculate_cost

class BaseLLMAdapter(ABC):
    
    @abstractmethod
    async def generate(
        self, 
        system_prompt: str, 
        user_prompt: str, 
        config: ModelConfig
    ) -> ExecuteResponse:
        """
        Executes a prompt completion non-streamingly and returns structured response with metrics.
        """
        pass

    @abstractmethod
    async def stream(
        self, 
        system_prompt: str, 
        user_prompt: str, 
        config: ModelConfig
    ) -> AsyncGenerator[str, None]:
        """
        Streams prompt completion text chunks (for SSE).
        """
        yield ""

    def _estimate_tokens(self, text: str) -> int:
        """Rough fallback token estimation (~4 chars per token)."""
        if not text:
            return 0
        return max(1, len(text) // 4)
