#!/usr/bin/env python3
"""
WebSocket test client for the streaming endpoint
"""
import asyncio
import websockets
import json


async def test_websocket_stream():
    uri = "ws://localhost:8000/api/ws/stream"

    request_data = {
        "prompt": "Extract the person information: John Doe is 30 years old and lives in San Francisco. His email is john@example.com",
        "schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "age": {"type": "number"},
                "city": {"type": "string"},
                "email": {"type": "string"}
            },
            "required": ["name", "age", "email"]
        },
        "provider": "openai",
        "model": "gpt-4o-mini",
        "temperature": 0.7,
        "max_tokens": 500
    }

    print(f"Connecting to {uri}...")

    async with websockets.connect(uri) as websocket:
        print("Connected! Sending request...")

        # Send the request
        await websocket.send(json.dumps(request_data))
        print("Request sent. Waiting for responses...\n")

        # Receive and print responses
        chunk_count = 0
        async for message in websocket:
            chunk_count += 1
            data = json.loads(message)

            if data["type"] == "error":
                print(f"❌ Error: {data['message']}")
                break
            elif data["type"] == "done":
                print(f"\n✅ Stream complete!")
                print(f"Final accumulated text: {data['accumulated']}")
                print(f"Parsed output: {json.dumps(data['parsed'], indent=2)}")
                break
            else:  # chunk
                print(f"Chunk {chunk_count}: {data['delta']}", end='', flush=True)
                if data.get('parsed'):
                    print(f"\n  → Parsed so far: {data['parsed']}")


if __name__ == "__main__":
    asyncio.run(test_websocket_stream())
