from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db, Base, engine
from app.seed_data import seed_demonstration_data

router = APIRouter(prefix="/seed", tags=["Demonstration Data"])


@router.post("")
def populate_demo_data(
    force: bool = Query(False, description="Force re-seeding even if records exist"),
    db: Session = Depends(get_db),
):
    """Seed realistic demonstration SOC cybersecurity threat intelligence data."""
    return seed_demonstration_data(db=db, force=force)


@router.post("/reset")
def reset_database(
    db: Session = Depends(get_db),
):
    """Clear all records and recreate empty database tables."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    return {"message": "Database tables have been reset and emptied."}

