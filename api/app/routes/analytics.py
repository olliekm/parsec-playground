from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import numpy as np

from app.models.schemas import AnalyticsResponse
from app.db.database import get_db
from app.db.models import Run, Template

router = APIRouter()

@router.get("/{template_id}", response_model=AnalyticsResponse)
def get_template_analytics(template_id: int, db: Session = Depends(get_db)):
    """
    Get analytics for a specific template.
    """
    # Check if template exists
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Get all runs for this template
    runs = db.query(Run).filter(Run.template_id == template_id).all()

    if not runs:
        # Return empty analytics if no runs
        return AnalyticsResponse(
            template_id=template_id,
            template_name=template.name,
            total_runs=0,
            success_rate=0.0,
            avg_latency=0.0,
            p50_latency=0.0,
            p95_latency=0.0,
            p99_latency=0.0,
            total_tokens=0,
            avg_tokens=0.0,
            error_breakdown={}
        )

    # Calculate metrics
    total_runs = len(runs)
    successful_runs = sum(1 for run in runs if run.validation_status)
    success_rate = (successful_runs / total_runs) * 100 if total_runs > 0 else 0.0

    # Latency metrics
    latencies = [run.latency_ms for run in runs if run.latency_ms is not None]
    avg_latency = sum(latencies) / len(latencies) if latencies else 0.0
    p50_latency = float(np.percentile(latencies, 50)) if latencies else 0.0
    p95_latency = float(np.percentile(latencies, 95)) if latencies else 0.0
    p99_latency = float(np.percentile(latencies, 99)) if latencies else 0.0

    # Token metrics
    tokens = [run.tokens_used for run in runs if run.tokens_used is not None]
    total_tokens = sum(tokens)
    avg_tokens = total_tokens / len(tokens) if tokens else 0.0

    # Error breakdown
    error_breakdown = {}
    failed_runs = [run for run in runs if not run.validation_status]
    for run in failed_runs:
        if run.validation_errors:
            for error in run.validation_errors:
                error_type = error.get("message", "Unknown error")
                error_breakdown[error_type] = error_breakdown.get(error_type, 0) + 1

    return AnalyticsResponse(
        template_id=template_id,
        template_name=template.name,
        total_runs=total_runs,
        success_rate=success_rate,
        avg_latency=avg_latency,
        p50_latency=p50_latency,
        p95_latency=p95_latency,
        p99_latency=p99_latency,
        total_tokens=total_tokens,
        avg_tokens=avg_tokens,
        error_breakdown=error_breakdown
    )


@router.get("/", response_model=List[AnalyticsResponse])
def get_all_analytics(db: Session = Depends(get_db)):
    """
    Get analytics for all templates.
    """
    templates = db.query(Template).all()
    analytics_list = []

    for template in templates:
        try:
            analytics = get_template_analytics(template.id, db)
            analytics_list.append(analytics)
        except Exception:
            # Skip templates with errors
            continue

    return analytics_list
