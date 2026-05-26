from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.analytics import analytics

router = APIRouter(tags=["LLMOps Observability Analytics"])

@router.get("/metrics")
def get_metrics(db: Session = Depends(get_db)):
    """Aggregates latency, throughput, model allocation, and cache efficiency KPIs."""
    metrics = analytics.get_dashboard_metrics(db)
    if not metrics:
         raise HTTPException(status_code=500, detail="Failed to calculate system metrics.")
    return metrics

@router.get("/logs")
def get_logs(limit: int = Query(default=50, ge=1, le=100), db: Session = Depends(get_db)):
    """Returns paginated query performance audit trails for deep search profiling."""
    return analytics.get_recent_logs(db, limit=limit)
