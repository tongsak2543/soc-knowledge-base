from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.ioc import (
    IOCCreate,
    IOCUpdate,
    IOCResponse,
    IOCListResponse,
)
from app.schemas.bulk import BulkIOCCreateRequest, BulkIOCCreateResponse
from app.services import ioc_service, news_service, case_service

router = APIRouter(prefix="/iocs", tags=["IOC Management"])


@router.get("", response_model=List[IOCListResponse])
def get_all_iocs(
    q: Optional[str] = Query(None, description="Search keyword in value, normalized value, or description"),
    ioc_type: Optional[str] = Query(None, description="Filter by IOC type"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List IOCs with optional search and type filtering."""
    iocs, _ = ioc_service.list_iocs(
        db=db,
        q=q,
        ioc_type=ioc_type,
        limit=limit,
        offset=offset,
    )
    result = []
    for ioc in iocs:
        result.append(
            IOCListResponse(
                id=ioc.id,
                ioc_type=ioc.ioc_type,
                value=ioc.value,
                normalized_value=ioc.normalized_value,
                description=ioc.description,
                created_at=ioc.created_at,
                updated_at=ioc.updated_at,
                case_count=len(ioc.cases),
                news_count=len(ioc.news),
            )
        )
    return result


@router.post("/bulk", response_model=BulkIOCCreateResponse, status_code=status.HTTP_201_CREATED)
def bulk_create_indicators(
    bulk_in: BulkIOCCreateRequest,
    db: Session = Depends(get_db),
):
    """Bulk create and validate multiple IOCs with automatic defanging and duplicate detection."""
    return ioc_service.bulk_create_iocs(db=db, bulk_request=bulk_in)


@router.get("/export")
def export_indicators(
    format: str = Query("csv", pattern="^(csv|txt)$", description="Export format: 'csv' or 'txt'"),
    ioc_type: Optional[str] = Query(None, description="Optional IOC type filter"),
    db: Session = Depends(get_db),
):
    """Export stored IOCs as CSV or plain text blocklist."""
    content = ioc_service.export_iocs(db=db, ioc_type=ioc_type, format_type=format)
    if format == "txt":
        media_type = "text/plain"
        filename = f"soc_iocs_{ioc_type or 'all'}.txt"
    else:
        media_type = "text/csv"
        filename = f"soc_iocs_{ioc_type or 'all'}.csv"

    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return Response(content=content, media_type=media_type, headers=headers)


@router.post("", response_model=IOCResponse, status_code=status.HTTP_201_CREATED)
def create_ioc_record(
    ioc_in: IOCCreate,
    db: Session = Depends(get_db),
):
    """Create a new unique Indicator of Compromise (IOC)."""
    return ioc_service.create_ioc(db=db, ioc_in=ioc_in)


@router.get("/{ioc_id}", response_model=IOCResponse)
def get_ioc_detail(
    ioc_id: int,
    db: Session = Depends(get_db),
):
    """Get full details of an IOC, including related threat news."""
    return ioc_service.get_ioc_by_id(db=db, ioc_id=ioc_id)


@router.put("/{ioc_id}", response_model=IOCResponse)
def update_ioc_record(
    ioc_id: int,
    ioc_in: IOCUpdate,
    db: Session = Depends(get_db),
):
    """Update an existing IOC."""
    return ioc_service.update_ioc(db=db, ioc_id=ioc_id, ioc_in=ioc_in)


@router.delete("/{ioc_id}", status_code=status.HTTP_200_OK)
def delete_ioc_record(
    ioc_id: int,
    db: Session = Depends(get_db),
):
    """Delete an IOC record."""
    ioc_service.delete_ioc(db=db, ioc_id=ioc_id)
    return {"message": f"IOC with ID {ioc_id} has been deleted successfully."}


@router.post("/{ioc_id}/cases/{case_id}", response_model=IOCResponse)
def link_case_to_ioc(
    ioc_id: int,
    case_id: int,
    db: Session = Depends(get_db),
):
    """Associate a SOC investigation case to an IOC."""
    case_service.associate_ioc_to_case(db=db, case_id=case_id, ioc_id=ioc_id)
    return ioc_service.get_ioc_by_id(db=db, ioc_id=ioc_id)


@router.delete("/{ioc_id}/cases/{case_id}", response_model=IOCResponse)
def unlink_case_from_ioc(
    ioc_id: int,
    case_id: int,
    db: Session = Depends(get_db),
):
    """Remove a case association from an IOC."""
    case_service.dissociate_ioc_from_case(db=db, case_id=case_id, ioc_id=ioc_id)
    return ioc_service.get_ioc_by_id(db=db, ioc_id=ioc_id)


@router.post("/{ioc_id}/news/{news_id}", response_model=IOCResponse)
def link_news_to_ioc(
    ioc_id: int,
    news_id: int,
    db: Session = Depends(get_db),
):
    """Associate a threat news article to an IOC."""
    news_service.associate_ioc_to_news(db=db, news_id=news_id, ioc_id=ioc_id)
    return ioc_service.get_ioc_by_id(db=db, ioc_id=ioc_id)


@router.delete("/{ioc_id}/news/{news_id}", response_model=IOCResponse)
def unlink_news_from_ioc(
    ioc_id: int,
    news_id: int,
    db: Session = Depends(get_db),
):
    """Remove a news association from an IOC."""
    news_service.dissociate_ioc_from_news(db=db, news_id=news_id, ioc_id=ioc_id)
    return ioc_service.get_ioc_by_id(db=db, ioc_id=ioc_id)

