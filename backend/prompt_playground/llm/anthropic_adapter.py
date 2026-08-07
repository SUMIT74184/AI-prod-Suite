"""
Anthropic LLM Adapter
----------------------
Adapter supporting Anthropic Claude models (Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku).
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

class AnthropicAdapter(BaseLLMAdapter):

    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")

    async def generate(
        self, 
        system_prompt: str, 
        user_prompt: str, 
        config: ModelConfig
    ) -> ExecuteResponse:
        run_id = str(uuid.uuid4())
        start_time = time.time()

        if not self.api_key:
            # Sandbox / Simulated Execution mode if API key is not set
            latency = 1.4
            output_text = f"[Anthropic {config.model} Simulated Output]\n\n" + \
                f"Parsed system prompt ({len(system_prompt)} chars) and user prompt ({len(user_prompt)} chars).\n" + \
                f"Temperature: {config.temperature}, Max Tokens: {config.max_tokens}."
            
            in_tokens = self._estimate_tokens(system_prompt + user_prompt)
            out_tokens = self._estimate_tokens(output_text)
            cost = calculate_cost(config.model, in_tokens, out_tokens)
            
            return ExecuteResponse(
                run_id=run_id,
                output_text=output_text,
                rendered_system_prompt=system_prompt,
                rendered_user_prompt=user_prompt,
                metrics=ExecutionMetrics(
                    latency_ms=round(latency * 1000, 2),
                    input_tokens=in_tokens,
                    output_tokens=out_tokens,
                    total_tokens=in_tokens + out_tokens,
                    estimated_cost_usd=cost,
                    provider="Anthropic",
                    model=config.model
                ),
                status="Success"
            )

        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }

        # Normalize model name for Anthropic API
        model_id = "claude-3-5-sonnet-20240620"
        if "opus" in config.model.lower():
            model_id = "claude-3-opus-20240229"
        elif "haiku" in config.model.lower():
            model_id = "claude-3-haiku-20240307"

        # Anthropic temperature range is 0.0 to 1.0
        clamped_temp = min(1.0, max(0.0, float(config.temperature)))

        payload = {
            "model": model_id,
            "max_tokens": config.max_tokens,
            "temperature": clamped_temp,
            "messages": [{"role": "user", "content": user_prompt}]
        }
        if system_prompt:
            payload["system"] = system_prompt

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                res = await client.post(url, headers=headers, json=payload)
                elapsed = time.time() - start_time
                res_data = res.json()

                if res.status_code != 200:
                    err_msg = res_data.get("error", {}).get("message", res.text)
                    return ExecuteResponse(
                        run_id=run_id,
                        output_text=f"Anthropic API Error: {err_msg}",
                        rendered_system_prompt=system_prompt,
                        rendered_user_prompt=user_prompt,
                        metrics=ExecutionMetrics(
                            latency_ms=round(elapsed * 1000, 2),
                            input_tokens=0,
                            output_tokens=0,
                            total_tokens=0,
                            estimated_cost_usd=0.0,
                            provider="Anthropic",
                            model=config.model
                        ),
                        status="Error",
                        error_message=err_msg
                    )

                output_text = res_data["content"][0]["text"]
                usage = res_data.get("usage", {})
                in_tokens = usage.get("input_tokens", self._estimate_tokens(system_prompt + user_prompt))
                out_tokens = usage.get("output_tokens", self._estimate_tokens(output_text))
                cost = calculate_cost(config.model, in_tokens, out_tokens)

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
                        provider="Anthropic",
                        model=config.model
                    ),
                    status="Success"
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
                        input_tokens=0,
                        output_tokens=0,
                        total_tokens=0,
                        estimated_cost_usd=0.0,
                        provider="Anthropic",
                        model=config.model
                    ),
                    status="Error",
                    error_message=str(e)
                )

    async def stream(
        self, 
        system_prompt: str, 
        user_prompt: str, 
        config: ModelConfig
    ) -> AsyncGenerator[str, None]:
        if not self.api_key:
            yield f"[Anthropic {config.model} Simulated Stream]\n"
            yield f"User: {user_prompt}\n"
            return
        
        # Fallback to single generation chunk for streaming if standard
        res = await self.generate(system_prompt, user_prompt, config)
        yield res.output_text
