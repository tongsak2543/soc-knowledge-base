from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status
from app.models.news import News
from app.models.ioc import IOC
from app.schemas.news import NewsCreate, NewsUpdate
from app.services.ioc_service import get_or_create_ioc, get_ioc_by_id


def create_news(db: Session, news_in: NewsCreate) -> News:
    db_news = News(
        title=news_in.title.strip(),
        summary=news_in.summary.strip() if news_in.summary else None,
        content=news_in.content.strip(),
        source_name=news_in.source_name.strip() if news_in.source_name else None,
        source_url=news_in.source_url.strip() if news_in.source_url else None,
        published_date=news_in.published_date,
        category=news_in.category,
        severity=news_in.severity,
        tags=news_in.tags.strip() if news_in.tags else "",
    )

    # Attach existing IOCs
    iocs_to_attach = []
    if news_in.ioc_ids:
        existing_iocs = db.query(IOC).filter(IOC.id.in_(news_in.ioc_ids)).all()
        iocs_to_attach.extend(existing_iocs)

    # Create & attach new IOCs if specified
    if news_in.new_iocs:
        for new_ioc_in in news_in.new_iocs:
            ioc_obj = get_or_create_ioc(
                db,
                ioc_type=new_ioc_in.ioc_type,
                raw_value=new_ioc_in.value,
                description=new_ioc_in.description,
            )
            if ioc_obj not in iocs_to_attach:
                iocs_to_attach.append(ioc_obj)

    db_news.iocs = iocs_to_attach
    db.add(db_news)
    db.commit()
    db.refresh(db_news)
    return db_news


def get_news_by_id(db: Session, news_id: int) -> News:
    news = db.query(News).filter(News.id == news_id).first()
    if not news:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"News article with id {news_id} not found.",
        )
    return news


def list_news(
    db: Session,
    q: Optional[str] = None,
    category: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> Tuple[List[News], int]:
    query = db.query(News)

    if category:
        query = query.filter(News.category == category)

    if severity:
        query = query.filter(News.severity == severity)

    if q:
        search = f"%{q.strip()}%"
        query = query.filter(
            or_(
                News.title.ilike(search),
                News.summary.ilike(search),
                News.content.ilike(search),
                News.tags.ilike(search),
                News.source_name.ilike(search),
            )
        )

    total = query.count()
    items = query.order_by(News.published_date.desc(), News.created_at.desc()).offset(offset).limit(limit).all()
    return items, total


def update_news(db: Session, news_id: int, news_in: NewsUpdate) -> News:
    news = get_news_by_id(db, news_id)

    if news_in.title is not None:
        news.title = news_in.title.strip()
    if news_in.summary is not None:
        news.summary = news_in.summary.strip() if news_in.summary else None
    if news_in.content is not None:
        news.content = news_in.content.strip()
    if news_in.source_name is not None:
        news.source_name = news_in.source_name.strip() if news_in.source_name else None
    if news_in.source_url is not None:
        news.source_url = news_in.source_url.strip() if news_in.source_url else None
    if news_in.published_date is not None:
        news.published_date = news_in.published_date
    if news_in.category is not None:
        news.category = news_in.category
    if news_in.severity is not None:
        news.severity = news_in.severity
    if news_in.tags is not None:
        news.tags = news_in.tags.strip()

    if news_in.ioc_ids is not None:
        iocs = db.query(IOC).filter(IOC.id.in_(news_in.ioc_ids)).all()
        news.iocs = iocs

    db.commit()
    db.refresh(news)
    return news


def delete_news(db: Session, news_id: int) -> bool:
    news = get_news_by_id(db, news_id)
    db.delete(news)
    db.commit()
    return True


def associate_ioc_to_news(db: Session, news_id: int, ioc_id: int) -> News:
    news = get_news_by_id(db, news_id)
    ioc = get_ioc_by_id(db, ioc_id)

    if ioc not in news.iocs:
        news.iocs.append(ioc)
        db.commit()
        db.refresh(news)
    return news


def dissociate_ioc_from_news(db: Session, news_id: int, ioc_id: int) -> News:
    news = get_news_by_id(db, news_id)
    ioc = get_ioc_by_id(db, ioc_id)

    if ioc in news.iocs:
        news.iocs.remove(ioc)
        db.commit()
        db.refresh(news)
    return news

