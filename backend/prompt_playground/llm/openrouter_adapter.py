"""
OpenRouter LLM Adapter
----------------------
Adapter supporting OpenRouter models, including free community models.
Compatible with the OpenAI /chat/completions API format.

Free models (no credit card, just sign up at https://openrouter.ai):
  - nvidia/nemotron-3-ultra-550b-a55b:free
  - google/gemini-2.0-flash-exp:free
  - meta-llama/llama-3-8b-instruct:free
  - mistralai/mistral-7b-instruct:free
  - deepseek/deepseek-chat-v3-0324:free
"""

import os
import time
import uuid
import json
import httpx
from typing import AsyncGenerator
from backend.prompt_playground.llm.base_adapter import BaseLLMAdapter
from backend.prompt_playground.schemas.execution_schema import ModelConfig, ExecuteResponse, ExecutionMetrics
from backend.prompt_playground.utils.pricing import calculate_cost


class OpenRouterAdapter(BaseLLMAdapter):

    def __init__(self):
        self.api_key  = os.getenv("OPENROUTER_API_KEY", "").strip()
        self.site_url = os.getenv("SITE_URL", "http://localhost:3000")
        self.site_name = os.getenv("SITE_NAME", "AI Productivity Suite")

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": self.site_url,
            "X-Title": self.site_name,
            "Content-Type": "application/json",
        }

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        config: ModelConfig,
    ) -> ExecuteResponse:
        run_id    = str(uuid.uuid4())
        start_time = time.time()

        if not self.api_key:
            return ExecuteResponse(
                run_id=run_id,
                output_text="Error: OPENROUTER_API_KEY is not set in .env.local",
                rendered_system_prompt=system_prompt,
                rendered_user_prompt=user_prompt,
                metrics=ExecutionMetrics(
                    latency_ms=0, input_tokens=0, output_tokens=0,
                    total_tokens=0, estimated_cost_usd=0.0,
                    provider="OpenRouter", model=config.model,
                ),
                status="Error",
                error_message="OPENROUTER_API_KEY missing.",
            )

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_prompt})

        payload = {
            "model": config.model,
            "messages": messages,
            "max_tokens": config.max_tokens,
            "temperature": config.temperature,
            "top_p": config.top_p,
        }
        if config.json_mode:
            payload["response_format"] = {"type": "json_object"}

        url = "https://openrouter.ai/api/v1/chat/completions"

        async with httpx.AsyncClient(timeout=90.0) as client:
            try:
                res = await client.post(url, headers=self._headers(), json=payload)
                elapsed = time.time() - start_time
                res_data = res.json()

                if res.status_code != 200:
                    err_msg = res_data.get("error", {}).get("message", res.text)
                    return ExecuteResponse(
                        run_id=run_id,
                        output_text=f"OpenRouter API Error: {err_msg}",
                        rendered_system_prompt=system_prompt,
                        rendered_user_prompt=user_prompt,
                        metrics=ExecutionMetrics(
                            latency_ms=round(elapsed * 1000, 2),
                            input_tokens=0, output_tokens=0, total_tokens=0,
                            estimated_cost_usd=0.0,
                            provider="OpenRouter", model=config.model,
                        ),
                        status="Error",
                        error_message=err_msg,
                    )

                output_text = res_data["choices"][0]["message"]["content"]
                usage       = res_data.get("usage", {})
                in_tokens   = usage.get("prompt_tokens", self._estimate_tokens(system_prompt + user_prompt))
                out_tokens  = usage.get("completion_tokens", self._estimate_tokens(output_text))
                # OpenRouter returns total_cost in usage for paid models; free = 0
                cost = usage.get("total_cost", calculate_cost(config.model, in_tokens, out_tokens))

                return ExecuteResponse(
                    run_id=run_id,
                    output_text=output_text,
                    rendered_system_prompt=system_prompt,
                    rendered_user_prompt=user_prompt,
                    metrics=ExecutionMetrics(
                        latency_ms=round(elapsed * 1000, 2),
                        input_tokens=in_tokens,
                        output_tokens=out_tokens,
                        total_tokens=in_tokens + out_tokens,
                        estimated_cost_usd=cost,
                        provider="OpenRouter",
                        model=config.model,
                    ),
                    status="Success",
                )

            except Exception as e:
                elapsed = time.time() - start_time
                return ExecuteResponse(
                    run_id=run_id,
                    output_text=f"Execution Exception: {str(e)}",
                    rendered_system_prompt=system_prompt,
                    rendered_user_prompt=user_prompt,
                    metrics=ExecutionMetrics(
                        latency_ms=round(elapsed * 1000, 2),
                        input_tokens=0, output_tokens=0, total_tokens=0,
                        estimated_cost_usd=0.0,
                        provider="OpenRouter", model=config.model,
                    ),
                    status="Error",
                    error_message=str(e),
                )

    async def stream(
        self,
        system_prompt: str,
        user_prompt: str,
        config: ModelConfig,
    ) -> AsyncGenerator[str, None]:
        if not self.api_key:
            yield "Error: OPENROUTER_API_KEY is not set."
            return

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_prompt})

        payload = {
            "model": config.model,
            "messages": messages,
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
            "top_p": config.top_p,
            "stream": True,
        }

        url = "https://openrouter.ai/api/v1/chat/completions"

        async with httpx.AsyncClient(timeout=90.0) as client:
            async with client.stream("POST", url, headers=self._headers(), json=payload) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            data_json = json.loads(data_str)
                            delta = data_json["choices"][0]["delta"].get("content", "")
                            if delta:
                                yield delta
                        except Exception:
                            continue
