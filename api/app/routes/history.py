from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.models.schemas import HistoryResponse, RunResponse
from app.db.database import get_db
from app.db.models import Run

router = APIRouter()

@router.get("/", response_model=HistoryResponse)
def get_history(
    template_id: Optional[int] = Query(None, description="Filter by template ID"),
    provider: Optional[str] = Query(None, description="Filter by provider"),
    validation_status: Optional[bool] = Query(None, description="Filter by validation status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db)
):
    """
    Get paginated run history with optional filters.
    """
    # Build query with filters
    query = db.query(Run)

    if template_id is not None:
        query = query.filter(Run.template_id == template_id)

    if provider is not None:
        query = query.filter(Run.provider == provider)

    if validation_status is not None:
        query = query.filter(Run.validation_status == validation_status)

    # Get total count
    total = query.count()

    # Apply pagination and ordering (most recent first)
    runs = query.order_by(Run.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return HistoryResponse(
        runs=runs,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{run_id}", response_model=RunResponse)
def get_run(run_id: int, db: Session = Depends(get_db)):
    """
    Get a specific run by ID.
    """
    from fastapi import HTTPException

    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    return run
