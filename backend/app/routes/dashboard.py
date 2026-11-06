from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.dashboard import DashboardStats
from app.services.dashboard_service import get_dashboard_statistics

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_data(db: Session = Depends(get_db)):
    """Retrieve real-time aggregate statistics and distributions from SQLite database."""
    return get_dashboard_statistics(db)

