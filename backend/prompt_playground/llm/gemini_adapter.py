"""
Google Gemini LLM Adapter
-------------------------
Adapter supporting Google Gemini models (Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 2.0 Flash).
"""

import os
import time
import uuid
import httpx
from typing import AsyncGenerator
from backend.prompt_playground.llm.base_adapter import BaseLLMAdapter
from backend.prompt_playground.schemas.execution_schema import ModelConfig, ExecuteResponse, ExecutionMetrics
from backend.prompt_playground.utils.pricing import calculate_cost

class GeminiAdapter(BaseLLMAdapter):

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

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
            latency = 1.0
            output_text = f"[Google Gemini {config.model} Simulated Output]\n\n" + \
                f"System: ({len(system_prompt)} chars), User: ({len(user_prompt)} chars).\n" + \
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
                    provider="Gemini",
                    model=config.model
                ),
                status="Success"
            )

        # Google Gemini REST Endpoint call
        model_id = "gemini-1.5-flash"
        if "pro" in config.model.lower():
            model_id = "gemini-1.5-pro"
        elif "2.0" in config.model.lower():
            model_id = "gemini-2.0-flash"

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={self.api_key}"
        
        contents = []
        if system_prompt:
            contents.append({"role": "user", "parts": [{"text": f"System Instruction: {system_prompt}"}]})
            contents.append({"role": "model", "parts": [{"text": "Understood."}]})
        contents.append({"role": "user", "parts": [{"text": user_prompt}]})

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": config.temperature,
                "maxOutputTokens": config.max_tokens,
                "topP": config.top_p
            }
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                res = await client.post(url, json=payload)
                elapsed = time.time() - start_time
                res_data = res.json()

                if res.status_code != 200:
                    err_msg = res_data.get("error", {}).get("message", res.text)
                    return ExecuteResponse(
                        run_id=run_id,
                        output_text=f"Gemini API Error: {err_msg}",
                        rendered_system_prompt=system_prompt,
                        rendered_user_prompt=user_prompt,
                        metrics=ExecutionMetrics(
                            latency_ms=round(elapsed * 1000, 2),
                            input_tokens=0,
                            output_tokens=0,
                            total_tokens=0,
                            estimated_cost_usd=0.0,
                            provider="Gemini",
                            model=config.model
                        ),
                        status="Error",
                        error_message=err_msg
                    )

                candidates = res_data.get("candidates", [])
                output_text = candidates[0]["content"]["parts"][0]["text"] if candidates else "No response generated."
                usage = res_data.get("usageMetadata", {})
                in_tokens = usage.get("promptTokenCount", self._estimate_tokens(system_prompt + user_prompt))
                out_tokens = usage.get("candidatesTokenCount", self._estimate_tokens(output_text))
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
                        provider="Gemini",
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
                        provider="Gemini",
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
            yield f"[Gemini {config.model} Simulated Stream]\n"
            yield f"User: {user_prompt}\n"
            return
        
        res = await self.generate(system_prompt, user_prompt, config)
        yield res.output_text
