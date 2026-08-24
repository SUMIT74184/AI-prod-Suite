"""
Execution Service
-----------------
Coordinates dynamic variable rendering, provider adapter execution,
concurrent multi-model comparison, and metrics persistence.
"""

import asyncio
import json
import time
from typing import List, Dict, Any, AsyncGenerator
from app.prompt_playground.schemas.execution_schema import (
    ExecuteRequest, CompareRequest, ExecuteResponse, CompareResponse, ModelConfig
)
from app.prompt_playground.utils.variable_parser import render_prompt
from app.prompt_playground.utils.pricing import calculate_cost
from app.prompt_playground.llm.factory import LLMAdapterFactory
from app.prompt_playground.repositories.prompt_repository import PromptRepository

class ExecutionService:

    @staticmethod
    async def execute_prompt(request: ExecuteRequest) -> ExecuteResponse:
        # Render variables in System and User prompt
        rendered_sys, _ = render_prompt(request.system_prompt, request.variables)
        rendered_user, _ = render_prompt(request.user_prompt, request.variables)

        # Get adapter for selected provider / model
        adapter = LLMAdapterFactory.get_adapter(
            provider=request.llm_config.provider, 
            model=request.llm_config.model
        )

        # Execute completion
        res = await adapter.generate(
            system_prompt=rendered_sys, 
            user_prompt=rendered_user, 
            config=request.llm_config
        )

        # Record run metrics in DB
        try:
            PromptRepository.record_run(
                prompt_id=request.prompt_id,
                version_id=None,
                provider=res.metrics.provider,
                model=res.metrics.model,
                latency_ms=res.metrics.latency_ms,
                input_tokens=res.metrics.input_tokens,
                output_tokens=res.metrics.output_tokens,
                total_tokens=res.metrics.total_tokens,
                estimated_cost_usd=res.metrics.estimated_cost_usd,
                status=res.status,
                output_text=res.output_text
            )
        except Exception:
            pass

        return res

    @staticmethod
    async def compare_models(request: CompareRequest) -> CompareResponse:
        """
        Executes a single prompt against multiple models concurrently using asyncio.gather().
        """
        rendered_sys, _ = render_prompt(request.system_prompt, request.variables)
        rendered_user, _ = render_prompt(request.user_prompt, request.variables)

        async def run_single_config(config: ModelConfig) -> ExecuteResponse:
            adapter = LLMAdapterFactory.get_adapter(provider=config.provider, model=config.model)
            res = await adapter.generate(
                system_prompt=rendered_sys,
                user_prompt=rendered_user,
                config=config
            )
            # Record run metrics
            try:
                PromptRepository.record_run(
                    prompt_id=request.prompt_id,
                    version_id=None,
                    provider=res.metrics.provider,
                    model=res.metrics.model,
                    latency_ms=res.metrics.latency_ms,
                    input_tokens=res.metrics.input_tokens,
                    output_tokens=res.metrics.output_tokens,
                    total_tokens=res.metrics.total_tokens,
                    estimated_cost_usd=res.metrics.estimated_cost_usd,
                    status=res.status,
                    output_text=res.output_text
                )
            except Exception:
                pass
            return res

        # Run all selected model configs concurrently
        tasks = [run_single_config(cfg) for cfg in request.models]
        results = await asyncio.gather(*tasks)

        return CompareResponse(results=list(results))

    @staticmethod
    async def stream_prompt(request: ExecuteRequest) -> AsyncGenerator[str, None]:
        """
        Streams prompt completion via SSE events.
        Yields token chunks and a final metrics event.
        """
        rendered_sys, _ = render_prompt(request.system_prompt, request.variables)
        rendered_user, _ = render_prompt(request.user_prompt, request.variables)

        adapter = LLMAdapterFactory.get_adapter(
            provider=request.llm_config.provider,
            model=request.llm_config.model
        )

        start_time = time.time()
        full_output = ""

        try:
            async for chunk in adapter.stream(
                system_prompt=rendered_sys,
                user_prompt=rendered_user,
                config=request.llm_config
            ):
                full_output += chunk
                yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"

            elapsed = time.time() - start_time
            in_tokens = adapter._estimate_tokens(rendered_sys + rendered_user)
            out_tokens = adapter._estimate_tokens(full_output)
            cost = calculate_cost(request.llm_config.model, in_tokens, out_tokens)

            metrics_event = {
                "type": "metrics",
                "latency_ms": round(elapsed * 1000, 2),
                "input_tokens": in_tokens,
                "output_tokens": out_tokens,
                "total_tokens": in_tokens + out_tokens,
                "estimated_cost_usd": cost,
                "provider": request.llm_config.provider,
                "model": request.llm_config.model
            }
            yield f"data: {json.dumps(metrics_event)}\n\n"

            # Record run in DB
            try:
                PromptRepository.record_run(
                    prompt_id=request.prompt_id,
                    version_id=None,
                    provider=request.llm_config.provider,
                    model=request.llm_config.model,
                    latency_ms=round(elapsed * 1000, 2),
                    input_tokens=in_tokens,
                    output_tokens=out_tokens,
                    total_tokens=in_tokens + out_tokens,
                    estimated_cost_usd=cost,
                    status="Success",
                    output_text=full_output
                )
            except Exception:
                pass

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        yield "data: [DONE]\n\n"
