from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.news import (
    NewsCreate,
    NewsUpdate,
    NewsResponse,
    NewsListResponse,
)
from app.services import news_service

router = APIRouter(prefix="/news", tags=["Threat News"])


@router.get("", response_model=List[NewsListResponse])
def get_all_news(
    q: Optional[str] = Query(None, description="Search keyword in title, summary, content, tags"),
    category: Optional[str] = Query(None, description="Filter by category"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Retrieve threat news with optional search and filters."""
    news_items, _ = news_service.list_news(
        db=db,
        q=q,
        category=category,
        severity=severity,
        limit=limit,
        offset=offset,
    )
    result = []
    for item in news_items:
        result.append(
            NewsListResponse(
                id=item.id,
                title=item.title,
                summary=item.summary,
                source_name=item.source_name,
                source_url=item.source_url,
                published_date=item.published_date,
                category=item.category,
                severity=item.severity,
                tags=item.tags,
                created_at=item.created_at,
                updated_at=item.updated_at,
                ioc_count=len(item.iocs),
            )
        )
    return result


@router.post("", response_model=NewsResponse, status_code=status.HTTP_201_CREATED)
def create_threat_news(
    news_in: NewsCreate,
    db: Session = Depends(get_db),
):
    """Create a new cybersecurity threat intelligence news item."""
    return news_service.create_news(db=db, news_in=news_in)


@router.get("/{news_id}", response_model=NewsResponse)
def get_threat_news_detail(
    news_id: int,
    db: Session = Depends(get_db),
):
    """Get full details of a specific threat news record including associated IOCs."""
    return news_service.get_news_by_id(db=db, news_id=news_id)


@router.put("/{news_id}", response_model=NewsResponse)
def update_threat_news(
    news_id: int,
    news_in: NewsUpdate,
    db: Session = Depends(get_db),
):
    """Update an existing threat news record."""
    return news_service.update_news(db=db, news_id=news_id, news_in=news_in)


@router.delete("/{news_id}", status_code=status.HTTP_200_OK)
def delete_threat_news(
    news_id: int,
    db: Session = Depends(get_db),
):
    """Delete a threat news record."""
    news_service.delete_news(db=db, news_id=news_id)
    return {"message": f"News article with ID {news_id} has been deleted successfully."}


@router.post("/{news_id}/iocs/{ioc_id}", response_model=NewsResponse)
def link_ioc_to_news(
    news_id: int,
    ioc_id: int,
    db: Session = Depends(get_db),
):
    """Associate an existing IOC to a news record."""
    return news_service.associate_ioc_to_news(db=db, news_id=news_id, ioc_id=ioc_id)


@router.delete("/{news_id}/iocs/{ioc_id}", response_model=NewsResponse)
def unlink_ioc_from_news(
    news_id: int,
    ioc_id: int,
    db: Session = Depends(get_db),
):
    """Remove an IOC association from a news record."""
    return news_service.dissociate_ioc_from_news(db=db, news_id=news_id, ioc_id=ioc_id)

