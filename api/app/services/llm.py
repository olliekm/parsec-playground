"""
LLM service 
"""
import os
from typing import Tuple, Any
from parsec.enforcement.engine import EnforcementEngine
from parsec.models.adapters import OpenAIAdapter, AnthropicAdapter
from parsec.validators import JSONValidator

def create_adapter(provider: str, model: str, api_key: str = None) -> Any:
    """Create and return the appropriate LLM adapter based on provider.

    Args:
        provider: The LLM provider (openai, anthropic, etc.)
        model: The model name
        api_key: Optional user-provided API key. If not provided, uses environment variable.
    """
    if provider == "openai":
        key = api_key or os.getenv("OPENAI_API_KEY", "").strip()
        if not key:
            raise ValueError("OpenAI API key is required. Please provide an API key or set OPENAI_API_KEY in environment.")
        return OpenAIAdapter(model=model, api_key=key)
    elif provider == "anthropic":
        key = api_key or os.getenv("ANTHROPIC_API_KEY", "").strip()
        if not key:
            raise ValueError("Anthropic API key is required. Please provide an API key or set ANTHROPIC_API_KEY in environment.")
        return AnthropicAdapter(model=model, api_key=key)
    # elif provider == "gemini":
    #     return GeminiAdapter(model=model, api_key=os.getenv("GOOGLE_API_KEY"))
    else:
        raise ValueError(f"Unsupported provider: {provider}")


async def generate_with_enforcement(
    provider: str,
    model: str,
    prompt: str,
    schema: dict,
    temperature: float = 0.7,
    max_tokens: int = 1000,
    api_key: str = None
) -> Tuple[Any, str, bool, list, float, int, int]:
    """Generate output using the specified LLM with schema enforcement.

    Args:
        provider: The LLM provider
        model: The model name
        prompt: The input prompt
        schema: JSON schema for validation
        temperature: Generation temperature
        max_tokens: Maximum tokens to generate
        api_key: Optional user-provided API key
    """
    adapter = create_adapter(provider, model, api_key)
    validator = JSONValidator()
    engine = EnforcementEngine(
        adapter=adapter,
        validator=validator,
        max_retries=3
    )

    result = await engine.enforce(
        prompt=prompt,
        schema=schema,
        temperature=temperature,
        max_tokens=max_tokens
    )

    raw_output = result.generation.output
    parsed_output = result.data
    validation_status = result.success
    validation_errors = [
        {"path": err.path, "message": err.message} 
        for err in (result.validation.errors or [])
    ]
    latency_ms = result.generation.latency_ms
    tokens_used = result.generation.tokens_used
    retry_count = result.retry_count


    return (
        parsed_output,
        raw_output,
        validation_status,
        validation_errors,
        latency_ms,
        tokens_used,
        retry_count
    )
