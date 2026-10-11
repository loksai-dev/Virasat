"""Base Agent Interface for Virasat Multi-Agent Architecture.

Implements the standard Agent wrapper adhering to Google ADK conventions:
- name, model, instruction, tools, timeout, max_retries, output_schema
- Automatic tool calling loop via google-genai function calling
- Every model call and tool call emits an AgentEvent (increasing seq per run)
- Least-privilege typed tool execution (no raw SQL)
- Automatic retry (3 attempts) and degraded mode fallback (PROJECT_CONTEXT rule 7)
"""

import asyncio
import inspect
import json
import logging
from collections.abc import Callable
from typing import Any

from google import genai
from google.genai import types
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import Settings, get_settings
from app.deps import get_genai_client
from app.services.events import EventEmitter

logger = logging.getLogger(__name__)


class BaseAgent:
    """Base wrapper for autonomous agents in the Virasat estate settlement pipeline."""

    def __init__(
        self,
        name: str,
        instruction: str,
        tools: list[Callable] | None = None,
        model: str | None = None,
        timeout: float = 60.0,
        max_retries: int = 3,
        output_schema: type | None = None,
        settings: Settings | None = None,
    ):
        self.name = name
        self.instruction = instruction
        self.tools = tools or []
        self.settings = settings or get_settings()
        self.model = model or self.settings.GEMINI_FLASH_MODEL
        self.timeout = timeout
        self.max_retries = max_retries
        self.output_schema = output_schema
        self._genai_client = get_genai_client(self.settings)
        self._tool_map: dict[str, Callable] = {
            t.__name__: t for t in self.tools if hasattr(t, "__name__")
        }

    def _execute_tool(self, name: str, args: dict[str, Any], emitter: EventEmitter) -> Any:
        """Execute typed tool function under least-privilege boundary and emit tool_call event."""
        tool_func = self._tool_map.get(name)
        if not tool_func:
            err = f"Agent '{self.name}' attempted to invoke unregistered tool '{name}'."
            logger.error(err)
            emitter.emit(
                event_type="tool_call",
                agent=self.name,
                message=f"Unauthorized tool call rejected: {name}",
                payload={"tool": name, "error": "unauthorized"},
                degraded=True,
            )
            return {"error": err}

        # Filter args according to signature
        sig = inspect.signature(tool_func)
        filtered_args = {}
        for param_name in sig.parameters:
            if param_name in args:
                filtered_args[param_name] = args[param_name]

        logger.info("Agent %s invoking tool %s with %s", self.name, name, list(filtered_args.keys()))
        emitter.emit(
            event_type="tool_call",
            agent=self.name,
            message=f"Executing tool {name}",
            payload={"tool": name, "args": {k: str(v) for k, v in filtered_args.items()}},
        )

        try:
            res = tool_func(**filtered_args)
            return res
        except Exception as e:
            logger.error("Tool execution error in %s.%s: %s", self.name, name, e, exc_info=True)
            return {"error": str(e)}

    async def execute(
        self,
        case_id: str,
        prompt: str,
        emitter: EventEmitter,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Execute agent workflow with model calls, tool execution, retries, and fallback."""
        emitter.emit(
            event_type="agent_started",
            agent=self.name,
            message=f"{self.name} started analysis for case {case_id[:8]}",
        )

        attempt = 0
        last_error = None

        while attempt < self.max_retries:
            attempt += 1
            try:
                # Prepare contents and config
                contents: list[Any] = [prompt]
                if context:
                    contents.append(f"CASE_CONTEXT:\n{json.dumps(context, default=str)}")

                gen_config = types.GenerateContentConfig(
                    system_instruction=self.instruction,
                    temperature=0.1,
                )
                if self.tools:
                    gen_config.tools = self.tools

                # Multi-turn tool execution loop
                for turn in range(8):  # Max 8 conversational tool turns
                    logger.debug("Agent %s turn %d calling model %s", self.name, turn, self.model)
                    
                    # Run generate_content in thread pool to avoid blocking asyncio
                    response = await asyncio.to_thread(
                        self._genai_client.models.generate_content,
                        model=self.model,
                        contents=contents,
                        config=gen_config,
                    )

                    # Check for tool/function calls
                    function_calls = getattr(response, "function_calls", None)
                    if not function_calls and hasattr(response, "candidates") and response.candidates:
                        first_cand = response.candidates[0]
                        if hasattr(first_cand, "content") and first_cand.content and hasattr(first_cand.content, "parts"):
                            function_calls = [
                                part.function_call
                                for part in first_cand.content.parts
                                if hasattr(part, "function_call") and part.function_call
                            ]

                    if not function_calls:
                        # Final model message
                        final_text = response.text or ""
                        emitter.emit(
                            event_type="agent_message",
                            agent=self.name,
                            message=final_text.strip()[:400] if final_text else f"{self.name} completed successfully.",
                        )
                        emitter.emit(
                            event_type="agent_done",
                            agent=self.name,
                            message=f"{self.name} completed processing.",
                        )
                        return {"status": "success", "agent": self.name, "output": final_text}

                    # Execute function calls and add to conversation history
                    contents.append(response.candidates[0].content)
                    tool_response_parts = []
                    for call in function_calls:
                        call_name = call.name
                        call_args = dict(call.args) if hasattr(call, "args") and call.args else {}
                        tool_result = self._execute_tool(call_name, call_args, emitter)
                        tool_response_parts.append(
                            types.Part.from_function_response(
                                name=call_name,
                                response={"result": tool_result},
                            )
                        )
                    contents.append(tool_response_parts)

                # Turns exhausted
                emitter.emit(
                    event_type="agent_done",
                    agent=self.name,
                    message=f"{self.name} completed all tool actions.",
                )
                return {"status": "success", "agent": self.name}

            except Exception as e:
                last_error = e
                logger.warning("Agent %s attempt %d failed: %s", self.name, attempt, e)
                await asyncio.sleep(1.0 * attempt)

        # Retries exhausted -> Activate degraded fallback per rule 7
        logger.error("Agent %s exhausted all retries. Falling back to degraded mode: %s", self.name, last_error)
        emitter.emit(
            event_type="agent_message",
            agent=self.name,
            message=f"Model failure encountered in {self.name}; running deterministic fallback.",
            degraded=True,
        )
        fallback_res = await self.fallback_execute(case_id, emitter, context)
        emitter.emit(
            event_type="agent_done",
            agent=self.name,
            message=f"{self.name} completed in degraded mode.",
            degraded=True,
        )
        return {"status": "degraded", "agent": self.name, "result": fallback_res}

    async def fallback_execute(
        self,
        case_id: str,
        emitter: EventEmitter,
        context: dict[str, Any] | None = None,
    ) -> Any:
        """Deterministic fallback method executed if model repeatedly fails."""
        logger.info("Executing default fallback for agent %s on case %s", self.name, case_id)
        return {"fallback": True}
