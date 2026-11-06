from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status
from app.models.ioc import IOC
from app.models.case import Case
from app.models.news import News
from app.schemas.ioc import IOCCreate, IOCUpdate
from app.services.validator import validate_and_normalize_ioc


def get_or_create_ioc(
    db: Session,
    ioc_type: str,
    raw_value: str,
    description: Optional[str] = None,
) -> IOC:
    """Helper to retrieve existing IOC or create a new one safely."""
    is_valid, normalized, err = validate_and_normalize_ioc(ioc_type, raw_value)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"IOC Validation Failed: {err}",
        )

    existing = (
        db.query(IOC)
        .filter(IOC.ioc_type == ioc_type, IOC.normalized_value == normalized)
        .first()
    )
    if existing:
        if description and not existing.description:
            existing.description = description
            db.commit()
            db.refresh(existing)
        return existing

    new_ioc = IOC(
        ioc_type=ioc_type,
        value=raw_value.strip(),
        normalized_value=normalized,
        description=description,
    )
    db.add(new_ioc)
    db.commit()
    db.refresh(new_ioc)
    return new_ioc


def create_ioc(db: Session, ioc_in: IOCCreate) -> IOC:
    """Creates a new unique IOC with strict duplicate prevention."""
    is_valid, normalized, err = validate_and_normalize_ioc(ioc_in.ioc_type, ioc_in.value)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"IOC Validation Failed: {err}",
        )

    # Check for duplicate
    existing = (
        db.query(IOC)
        .filter(IOC.ioc_type == ioc_in.ioc_type, IOC.normalized_value == normalized)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate IOC: An IOC of type '{ioc_in.ioc_type}' with normalized value '{normalized}' already exists (ID: {existing.id}).",
        )

    new_ioc = IOC(
        ioc_type=ioc_in.ioc_type,
        value=ioc_in.value.strip(),
        normalized_value=normalized,
        description=ioc_in.description,
    )

    if ioc_in.case_ids:
        cases = db.query(Case).filter(Case.id.in_(ioc_in.case_ids)).all()
        new_ioc.cases = cases

    if ioc_in.news_ids:
        news_records = db.query(News).filter(News.id.in_(ioc_in.news_ids)).all()
        new_ioc.news = news_records

    db.add(new_ioc)
    db.commit()
    db.refresh(new_ioc)
    return new_ioc


def get_ioc_by_id(db: Session, ioc_id: int) -> IOC:
    ioc = db.query(IOC).filter(IOC.id == ioc_id).first()
    if not ioc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"IOC with id {ioc_id} not found.",
        )
    return ioc


def list_iocs(
    db: Session,
    q: Optional[str] = None,
    ioc_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> Tuple[List[IOC], int]:
    query = db.query(IOC)

    if ioc_type:
        query = query.filter(IOC.ioc_type == ioc_type)

    if q:
        search = f"%{q.strip()}%"
        query = query.filter(
            or_(
                IOC.value.ilike(search),
                IOC.normalized_value.ilike(search),
                IOC.description.ilike(search),
            )
        )

    total = query.count()
    iocs = query.order_by(IOC.created_at.desc()).offset(offset).limit(limit).all()
    return iocs, total


def update_ioc(db: Session, ioc_id: int, ioc_in: IOCUpdate) -> IOC:
    ioc = get_ioc_by_id(db, ioc_id)

    target_type = ioc_in.ioc_type or ioc.ioc_type
    target_value = ioc_in.value or ioc.value

    # If type or value is updated, revalidate and check duplicate
    if ioc_in.ioc_type or ioc_in.value:
        is_valid, normalized, err = validate_and_normalize_ioc(target_type, target_value)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"IOC Validation Failed: {err}",
            )

        conflict = (
            db.query(IOC)
            .filter(
                IOC.ioc_type == target_type,
                IOC.normalized_value == normalized,
                IOC.id != ioc_id,
            )
            .first()
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Duplicate IOC: An IOC of type '{target_type}' with value '{normalized}' already exists (ID: {conflict.id}).",
            )

        ioc.ioc_type = target_type
        ioc.value = target_value.strip()
        ioc.normalized_value = normalized

    if ioc_in.description is not None:
        ioc.description = ioc_in.description

    if ioc_in.case_ids is not None:
        cases = db.query(Case).filter(Case.id.in_(ioc_in.case_ids)).all()
        ioc.cases = cases

    if ioc_in.news_ids is not None:
        news_records = db.query(News).filter(News.id.in_(ioc_in.news_ids)).all()
        ioc.news = news_records

    db.commit()
    db.refresh(ioc)
    return ioc


def delete_ioc(db: Session, ioc_id: int) -> bool:
    ioc = get_ioc_by_id(db, ioc_id)
    db.delete(ioc)
    db.commit()
    return True


def bulk_create_iocs(
    db: Session,
    bulk_request: "BulkIOCCreateRequest",
) -> "BulkIOCCreateResponse":
    from app.schemas.bulk import BulkIOCCreateResponse, BulkIOCItemResult

    news_obj = None
    if bulk_request.news_id:
        news_obj = db.query(News).filter(News.id == bulk_request.news_id).first()

    target_cases = []
    if bulk_request.case_id:
        c = db.query(Case).filter(Case.id == bulk_request.case_id).first()
        if c:
            target_cases.append(c)

    if bulk_request.case_ids:
        for cid in bulk_request.case_ids:
            c = db.query(Case).filter(Case.id == cid).first()
            if c and c not in target_cases:
                target_cases.append(c)

    results = []
    created_count = 0
    duplicate_count = 0
    invalid_count = 0

    for item in bulk_request.items:
        is_valid, normalized, err = validate_and_normalize_ioc(item.ioc_type, item.value)
        if not is_valid:
            invalid_count += 1
            results.append(
                BulkIOCItemResult(
                    ioc_type=item.ioc_type,
                    value=item.value,
                    status="invalid",
                    error=err,
                )
            )
            continue

        existing = (
            db.query(IOC)
            .filter(IOC.ioc_type == item.ioc_type, IOC.normalized_value == normalized)
            .first()
        )

        if existing:
            duplicate_count += 1
            if news_obj and existing not in news_obj.iocs:
                news_obj.iocs.append(existing)
            for c_obj in target_cases:
                if existing not in c_obj.iocs:
                    c_obj.iocs.append(existing)
            results.append(
                BulkIOCItemResult(
                    ioc_type=item.ioc_type,
                    value=item.value,
                    normalized_value=normalized,
                    status="duplicate",
                    id=existing.id,
                )
            )
            continue

        new_ioc = IOC(
            ioc_type=item.ioc_type,
            value=item.value.strip(),
            normalized_value=normalized,
            description=item.description.strip() if item.description else None,
        )
        if news_obj:
            new_ioc.news.append(news_obj)
        for c_obj in target_cases:
            new_ioc.cases.append(c_obj)

        db.add(new_ioc)
        db.flush()
        created_count += 1
        results.append(
            BulkIOCItemResult(
                ioc_type=item.ioc_type,
                value=item.value,
                normalized_value=normalized,
                status="created",
                id=new_ioc.id,
            )
        )

    db.commit()
    return BulkIOCCreateResponse(
        total_submitted=len(bulk_request.items),
        created_count=created_count,
        duplicate_count=duplicate_count,
        invalid_count=invalid_count,
        results=results,
    )


def export_iocs(
    db: Session,
    ioc_type: Optional[str] = None,
    format_type: str = "csv",
) -> str:
    import csv
    import io

    query = db.query(IOC)
    if ioc_type:
        query = query.filter(IOC.ioc_type == ioc_type)
    iocs = query.order_by(IOC.created_at.desc()).all()

    if format_type.lower() == "txt":
        # Plain text list: 1 normalized indicator per line
        return "\n".join([ioc.normalized_value for ioc in iocs])

    # Default CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID",
        "Type",
        "Raw Value",
        "Normalized Value",
        "Description",
        "Associated Cases Count",
        "Created At",
    ])
    for ioc in iocs:
        writer.writerow([
            ioc.id,
            ioc.ioc_type,
            ioc.value,
            ioc.normalized_value,
            ioc.description or "",
            len(ioc.cases),
            ioc.created_at.isoformat() if ioc.created_at else "",
        ])
    return output.getvalue()

