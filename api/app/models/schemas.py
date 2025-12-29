from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime

# ========================== Generation Models ========================

class GenerateRequest(BaseModel):
    """
    Request to generate output from a prompt and json_schema.
    """
    prompt: str
    json_schema: dict
    provider: str
    model: str
    # TODO: fix these defaults later
    temperature: Optional[float] = Field(0.7, ge=0.0, le=1.0)
    max_tokens: Optional[int] = 1000
    template_id: Optional[int] = None
    api_key: Optional[str] = Field(None, description="Optional user-provided API key. If not provided, uses server's API key from environment.")

class GenerateResponse(BaseModel):
    """
    Response containing generated output and metadata.
    """
    run_id: int
    raw_output: str
    parsed_output: Any
    validation_status: bool
    validation_errors: Optional[List[dict]] = None
    latency_ms: float
    tokens_used: int

# ========================== Template Models ========================

class TemplateCreate(BaseModel):
    """
    Request to create a new template.
    """
    name: str
    content: str
    variables: Optional[dict] = None
    json_schema: dict

class TemplateUpdate(BaseModel):
    """
    Request to update an existing template.
    """
    name: Optional[str] = None
    content: Optional[str] = None
    variables: Optional[dict] = None
    json_schema: Optional[dict] = None

class TemplateVersionResponse(BaseModel):
    """
    Response containing template version details.
    """
    id: int
    template_id: int
    version: int
    content: str
    variables: Optional[dict] = None
    json_schema: dict
    created_at: datetime

    class Config:
        from_attributes = True

class TemplateResponse(BaseModel):
    """
    Response containing template details along with its versions.
    """
    id: int
    name: str
    created_at: datetime
    updated_at: datetime
    versions: List[TemplateVersionResponse] = []

    class Config:
        from_attributes = True

# ========================== History Models ========================

class RunResponse(BaseModel):
    """
    Response containing run details.
    """
    id: int
    template_id: Optional[int] = None
    provider: str
    model: str
    prompt: str
    json_schema: dict = Field(..., alias="schema")
    raw_output: Optional[str] = None
    parsed_output: Optional[Any] = None
    validation_errors: Optional[List[str]] = None
    latency_ms: Optional[float] = None
    tokens_used: Optional[int] = None
    retry_count: int
    validation_status: bool
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

class HistoryResponse(BaseModel):
    """
    Paginated response containing a list of runs for history.
    """
    runs: List[RunResponse] = []
    total: int
    page: int
    page_size: int

# ========================== Analytics Models ======================== 

class AnalyticsResponse(BaseModel):
    """
    Response containing analytics data.
    """
    template_id: int
    template_name: str
    total_runs: int
    success_rate: float
    avg_latency: float
    p50_latency: float
    p95_latency: float
    p99_latency: float
    total_tokens: int
    avg_tokens: float
    error_breakdown: dict

# ========================== WebSocket Models ========================

class StreamChunk(BaseModel):
    """
    Model for streaming chunks of generated output.
    """
    type: str = "chunk" # "chunk" | "done" | "error"
    delta: Optional[str] = None
    accumulated: Optional[str] = None
    validation: Optional[dict] = None
    parsed: Optional[Any] = None
