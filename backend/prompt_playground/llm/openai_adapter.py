"""
OpenAI LLM Adapter
------------------
Adapter supporting OpenAI GPT models (GPT-4o, GPT-4o-mini, GPT-3.5-turbo, o1, etc.).
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

class OpenAIAdapter(BaseLLMAdapter):

    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")

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
            latency = 1.2
            output_text = f"[OpenAI {config.model} Simulated Output]\n\n" + \
                f"Processed system prompt ({len(system_prompt)} chars) and user prompt ({len(user_prompt)} chars).\n" + \
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
                    provider="OpenAI",
                    model=config.model
                ),
                status="Success"
            )

        # Real OpenAI Chat Completions REST API Call
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_prompt})

        payload = {
            "model": config.model.lower(),
            "messages": messages,
            "max_tokens": config.max_tokens,
        }

        # o1 models do not support temperature or top_p custom parameters
        if not config.model.lower().startswith("o1"):
            payload["temperature"] = config.temperature
            payload["top_p"] = config.top_p

        if config.json_mode:
            payload["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                res = await client.post(url, headers=headers, json=payload)
                elapsed = time.time() - start_time
                res_data = res.json()

                if res.status_code != 200:
                    err_msg = res_data.get("error", {}).get("message", res.text)
                    return ExecuteResponse(
                        run_id=run_id,
                        output_text=f"OpenAI API Error: {err_msg}",
                        rendered_system_prompt=system_prompt,
                        rendered_user_prompt=user_prompt,
                        metrics=ExecutionMetrics(
                            latency_ms=round(elapsed * 1000, 2),
                            input_tokens=0,
                            output_tokens=0,
                            total_tokens=0,
                            estimated_cost_usd=0.0,
                            provider="OpenAI",
                            model=config.model
                        ),
                        status="Error",
                        error_message=err_msg
                    )

                output_text = res_data["choices"][0]["message"]["content"]
                usage = res_data.get("usage", {})
                in_tokens = usage.get("prompt_tokens", self._estimate_tokens(system_prompt + user_prompt))
                out_tokens = usage.get("completion_tokens", self._estimate_tokens(output_text))
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
                        provider="OpenAI",
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
                        provider="OpenAI",
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
        # Simple generator for streaming
        if not self.api_key:
            yield f"[OpenAI {config.model} Simulated Stream]\n"
            yield f"System: {system_prompt[:30]}...\n"
            yield f"User: {user_prompt}\n"
            return

        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_prompt})

        payload = {
            "model": config.model.lower(),
            "messages": messages,
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
            "top_p": config.top_p,
            "stream": True
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
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
