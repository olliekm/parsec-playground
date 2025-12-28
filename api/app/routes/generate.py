from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
import json

from app.models.schemas import GenerateRequest, GenerateResponse
from app.db.database import get_db
from app.db.models import Run
from app.services.llm import generate_with_enforcement
from app.services.streaming import stream_generate

router = APIRouter()

@router.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest, db: Session = Depends(get_db)):
    try:
        (
            parsed_output,
            raw_output,
            validation_status,
            validation_errors,
            latency_ms,
            tokens_used,
            retry_count
        ) =  await generate_with_enforcement(
            provider=request.provider,
            model=request.model,
            prompt=request.prompt,
            schema=request.json_schema,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        run = Run(
            template_id=request.template_id,
            provider=request.provider,
            model=request.model,
            prompt=request.prompt,
            schema=request.json_schema,
            raw_output=raw_output,
            parsed_output=parsed_output,
            validation_status=validation_status,
            validation_errors=validation_errors,
            latency_ms=latency_ms,
            tokens_used=tokens_used,
            retry_count=retry_count
        )
        db.add(run)
        db.commit()
        db.refresh(run)

        return GenerateResponse(
            run_id=run.id,
            raw_output=raw_output,
            parsed_output=parsed_output,
            validation_status=validation_status,
            validation_errors=validation_errors,
            latency_ms=latency_ms,
            tokens_used=tokens_used
        )
    except Exception as e:
        db.rollback()
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        print(f"Error in generate endpoint: {error_detail}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    """
    WebSocket endpoint for streaming generation.
    Client sends request, receives token-by-token updates.
    """
    await websocket.accept()
    
    try:
        # Receive generation request from client
        data = await websocket.receive_text()
        request_data = json.loads(data)
        
        # Extract parameters
        provider = request_data.get("provider")
        model = request_data.get("model")
        prompt = request_data.get("prompt")
        schema = request_data.get("schema")
        temperature = request_data.get("temperature", 0.7)
        max_tokens = request_data.get("max_tokens", 1000)
        
        # Validate required fields
        if not all([provider, model, prompt, schema]):
            await websocket.send_json({
                "type": "error",
                "message": "Missing required fields: provider, model, prompt, schema"
            })
            await websocket.close()
            return
        
        # Stream generation
        await stream_generate(
            websocket=websocket,
            prompt=prompt,
            schema=schema,
            provider=provider,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
    except WebSocketDisconnect:
        print("Client disconnected from WebSocket")
    except Exception as e:
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass