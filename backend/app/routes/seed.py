from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db, Base, engine
from app.models.case import Case
from app.models.ioc import IOC
from app.models.associations import case_iocs
from app.seed_data import seed_demonstration_data

router = APIRouter(prefix="/seed", tags=["Database Management"])


@router.post("/clean-demo")
def clean_demo_data(db: Session = Depends(get_db)):
    """Deletes all demo cases and demo IOCs, leaving only authentic CTI data and custom cases."""
    demo_cases = db.query(Case).filter(Case.case_id.like("CASE-2024-00%")).all()
    count_cases = len(demo_cases)
    for c in demo_cases:
        db.delete(c)

    demo_iocs = db.query(IOC).filter(IOC.id.in_([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])).all()
    count_iocs = len(demo_iocs)
    for i in demo_iocs:
        db.delete(i)

    db.commit()
    return {
        "status": "success",
        "message": f"Successfully removed {count_cases} demo cases and {count_iocs} demo IOCs.",
    }


@router.post("/reset")
def reset_database(
    db: Session = Depends(get_db),
):
    """Clear all records and recreate empty database tables."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    return {"message": "Database tables have been reset and emptied."}


