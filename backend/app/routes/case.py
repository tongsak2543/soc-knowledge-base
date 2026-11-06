from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.case import (
    CaseCreate,
    CaseUpdate,
    CaseResponse,
    CaseListResponse,
)
from app.services import case_service

router = APIRouter(prefix="/cases", tags=["Case Knowledge Base"])


@router.get("", response_model=List[CaseListResponse])
def get_all_cases(
    q: Optional[str] = Query(None, description="Search keyword in Case ID, title, summary, findings, behavior, method, root cause, remediation, conclusion, tags"),
    category: Optional[str] = Query(None, description="Filter by Category"),
    severity: Optional[str] = Query(None, description="Filter by Severity"),
    case_status: Optional[str] = Query(None, description="Filter by Status (Open, In Progress, Resolved, Closed)"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Retrieve SOC/DFIR investigation cases with full-text search and filters."""
    cases, _ = case_service.list_cases(
        db=db,
        q=q,
        category=category,
        severity=severity,
        case_status=case_status,
        limit=limit,
        offset=offset,
    )
    result = []
    for c in cases:
        result.append(
            CaseListResponse(
                id=c.id,
                case_id=c.case_id,
                title=c.title,
                summary=c.summary,
                category=c.category,
                severity=c.severity,
                status=c.status,
                tags=c.tags,
                incident_date=c.incident_date,
                created_at=c.created_at,
                updated_at=c.updated_at,
                ioc_count=len(c.iocs),
            )
        )
    return result


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
def create_case_record(
    case_in: CaseCreate,
    db: Session = Depends(get_db),
):
    """Create a new SOC incident/DFIR investigation case."""
    return case_service.create_case(db=db, case_in=case_in)


@router.get("/{case_id}", response_model=CaseResponse)
def get_case_detail(
    case_id: int,
    db: Session = Depends(get_db),
):
    """Get full details of a specific case including findings, methods, root cause, and linked IOCs."""
    return case_service.get_case_by_id(db=db, case_id=case_id)


@router.put("/{case_id}", response_model=CaseResponse)
def update_case_record(
    case_id: int,
    case_in: CaseUpdate,
    db: Session = Depends(get_db),
):
    """Update an existing investigation case."""
    return case_service.update_case(db=db, case_id=case_id, case_in=case_in)


@router.delete("/{case_id}", status_code=status.HTTP_200_OK)
def delete_case_record(
    case_id: int,
    db: Session = Depends(get_db),
):
    """Delete an investigation case."""
    case_service.delete_case(db=db, case_id=case_id)
    return {"message": f"Case with ID {case_id} has been deleted successfully."}


@router.post("/{case_id}/iocs/{ioc_id}", response_model=CaseResponse)
def link_ioc_to_case(
    case_id: int,
    ioc_id: int,
    db: Session = Depends(get_db),
):
    """Associate an existing IOC to a SOC case."""
    return case_service.associate_ioc_to_case(db=db, case_id=case_id, ioc_id=ioc_id)


@router.delete("/{case_id}/iocs/{ioc_id}", response_model=CaseResponse)
def unlink_ioc_from_case(
    case_id: int,
    ioc_id: int,
    db: Session = Depends(get_db),
):
    """Remove an IOC association from a SOC case."""
    return case_service.dissociate_ioc_from_case(db=db, case_id=case_id, ioc_id=ioc_id)

