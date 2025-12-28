"""
WebSocket streaming service using Parsec StreamingEngine
"""
import os
from fastapi import WebSocket
from parsec.enforcement.streaming_engine import StreamingEngine
from parsec.models.adapters import OpenAIAdapter, AnthropicAdapter


def create_adapter(provider: str, model: str):
    """Create LLM adapter based on provider"""
    if provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        return OpenAIAdapter(
            model=model,
            api_key=api_key
        )
    elif provider == "anthropic":
        api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
        return AnthropicAdapter(
            model=model,
            api_key=api_key
        )
    # elif provider == "gemini":
    #     return GeminiAdapter(
    #         model=model,
    #         api_key=os.getenv("GOOGLE_API_KEY")
    #     )
    else:
        raise ValueError(f"Unknown provider: {provider}")


async def stream_generate(
    websocket: WebSocket,
    prompt: str,
    schema: dict,
    provider: str,
    model: str,
    temperature: float = 0.7,
    max_tokens: int = 1000
):
    """
    Stream generation via WebSocket using Parsec StreamingEngine.
    Sends chunks to client as they arrive.
    """
    try:
        # Create adapter
        adapter = create_adapter(provider, model)
        
        # Check streaming support
        if not adapter.supports_streaming():
            await websocket.send_json({
                "type": "error",
                "message": f"{provider} does not support streaming"
            })
            return
        
        # Create streaming engine
        engine = StreamingEngine(adapter=adapter)
        
        # Stream with progressive parsing
        async for chunk, parsed in engine.stream_with_parsing(
            prompt=prompt,
            schema=schema,
            temperature=temperature,
            max_tokens=max_tokens
        ):
            # Send chunk to frontend
            await websocket.send_json({
                "type": "done" if chunk.is_complete else "chunk",
                "delta": chunk.delta,
                "accumulated": chunk.accumulated,
                "parsed": parsed,
                "is_complete": chunk.is_complete
            })
            
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })