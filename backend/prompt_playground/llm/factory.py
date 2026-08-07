"""
LLM Adapter Factory
-------------------
Factory class to instantiate the appropriate BaseLLMAdapter subclass
based on provider string (OpenAI, Anthropic, Gemini) or model name.
"""

from backend.prompt_playground.llm.base_adapter import BaseLLMAdapter
from backend.prompt_playground.llm.openai_adapter import OpenAIAdapter
from backend.prompt_playground.llm.anthropic_adapter import AnthropicAdapter
from backend.prompt_playground.llm.gemini_adapter import GeminiAdapter

class LLMAdapterFactory:

    @staticmethod
    def get_adapter(provider: str, model: str = "") -> BaseLLMAdapter:
        p = provider.lower().strip()
        m = model.lower().strip()

        if "openai" in p or "gpt" in m or "o1" in m:
            return OpenAIAdapter()
        elif "anthropic" in p or "claude" in m:
            return AnthropicAdapter()
        elif "gemini" in p or "google" in p or "gemini" in m:
            return GeminiAdapter()
        else:
            # Default to OpenAI Adapter
            return OpenAIAdapter()
