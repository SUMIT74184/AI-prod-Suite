"""
LLM Adapter Factory
-------------------
Factory class to instantiate the appropriate BaseLLMAdapter subclass
based on provider string (OpenAI, Anthropic, Gemini, OpenRouter) or model name.
"""

import os
from backend.prompt_playground.llm.base_adapter import BaseLLMAdapter
from backend.prompt_playground.llm.openai_adapter import OpenAIAdapter
from backend.prompt_playground.llm.anthropic_adapter import AnthropicAdapter
from backend.prompt_playground.llm.gemini_adapter import GeminiAdapter
from backend.prompt_playground.llm.openrouter_adapter import OpenRouterAdapter

class LLMAdapterFactory:

    @staticmethod
    def get_adapter(provider: str, model: str = "") -> BaseLLMAdapter:
        p = provider.lower().strip()
        m = model.lower().strip()

        if "openrouter" in p:
            return OpenRouterAdapter()
        elif "/" in m:
            # OpenRouter models are namespaced as "provider/model-name"
            # e.g. "google/gemini-2.0-flash-exp:free", "meta-llama/llama-3-8b-instruct:free"
            return OpenRouterAdapter()
        elif "openai" in p or "gpt" in m or m.startswith("o1"):
            return OpenAIAdapter()
        elif "anthropic" in p or "claude" in m:
            return AnthropicAdapter()
        elif "gemini" in p or "google" in p or "gemini" in m:
            return GeminiAdapter()
        else:
            # Default: prefer OpenRouter if key is configured, else OpenAI
            if os.environ.get("OPENROUTER_API_KEY", "").strip():
                return OpenRouterAdapter()
            return OpenAIAdapter()
