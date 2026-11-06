from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status
from app.models.case import Case
from app.models.ioc import IOC
from app.schemas.case import CaseCreate, CaseUpdate
from app.services.ioc_service import get_or_create_ioc, get_ioc_by_id


def create_case(db: Session, case_in: CaseCreate) -> Case:
    # Check duplicate case_id
    existing_case = db.query(Case).filter(Case.case_id == case_in.case_id.strip()).first()
    if existing_case:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate Case ID: A case with identifier '{case_in.case_id}' already exists (ID: {existing_case.id}).",
        )

    db_case = Case(
        case_id=case_in.case_id.strip(),
        title=case_in.title.strip(),
        summary=case_in.summary.strip() if case_in.summary else None,
        category=case_in.category,
        severity=case_in.severity,
        status=case_in.status,
        investigation_findings=case_in.investigation_findings.strip() if case_in.investigation_findings else None,
        observed_behavior=case_in.observed_behavior.strip() if case_in.observed_behavior else None,
        investigation_method=case_in.investigation_method.strip() if case_in.investigation_method else None,
        root_cause=case_in.root_cause.strip() if case_in.root_cause else None,
        remediation=case_in.remediation.strip() if case_in.remediation else None,
        conclusion=case_in.conclusion.strip() if case_in.conclusion else None,
        tags=case_in.tags.strip() if case_in.tags else "",
        incident_date=case_in.incident_date,
    )

    # Attach existing IOCs
    iocs_to_attach = []
    if case_in.ioc_ids:
        existing_iocs = db.query(IOC).filter(IOC.id.in_(case_in.ioc_ids)).all()
        iocs_to_attach.extend(existing_iocs)

    # Attach new IOCs created inline
    if case_in.new_iocs:
        for new_ioc_in in case_in.new_iocs:
            ioc_obj = get_or_create_ioc(
                db,
                ioc_type=new_ioc_in.ioc_type,
                raw_value=new_ioc_in.value,
                description=new_ioc_in.description,
            )
            if ioc_obj not in iocs_to_attach:
                iocs_to_attach.append(ioc_obj)

    db_case.iocs = iocs_to_attach
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    return db_case


def get_case_by_id(db: Session, case_id: int) -> Case:
    case_obj = db.query(Case).filter(Case.id == case_id).first()
    if not case_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found.",
        )
    return case_obj


def list_cases(
    db: Session,
    q: Optional[str] = None,
    category: Optional[str] = None,
    severity: Optional[str] = None,
    case_status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> Tuple[List[Case], int]:
    query = db.query(Case)

    if category:
        query = query.filter(Case.category == category)

    if severity:
        query = query.filter(Case.severity == severity)

    if case_status:
        query = query.filter(Case.status == case_status)

    if q:
        search = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Case.case_id.ilike(search),
                Case.title.ilike(search),
                Case.summary.ilike(search),
                Case.investigation_findings.ilike(search),
                Case.observed_behavior.ilike(search),
                Case.investigation_method.ilike(search),
                Case.root_cause.ilike(search),
                Case.remediation.ilike(search),
                Case.conclusion.ilike(search),
                Case.tags.ilike(search),
            )
        )

    total = query.count()
    items = query.order_by(Case.created_at.desc()).offset(offset).limit(limit).all()
    return items, total


def update_case(db: Session, case_id: int, case_in: CaseUpdate) -> Case:
    case_obj = get_case_by_id(db, case_id)

    if case_in.case_id is not None:
        new_case_id = case_in.case_id.strip()
        if new_case_id != case_obj.case_id:
            conflict = db.query(Case).filter(Case.case_id == new_case_id, Case.id != case_id).first()
            if conflict:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Case ID '{new_case_id}' is already in use by another case.",
                )
            case_obj.case_id = new_case_id

    if case_in.title is not None:
        case_obj.title = case_in.title.strip()
    if case_in.summary is not None:
        case_obj.summary = case_in.summary.strip() if case_in.summary else None
    if case_in.category is not None:
        case_obj.category = case_in.category
    if case_in.severity is not None:
        case_obj.severity = case_in.severity
    if case_in.status is not None:
        case_obj.status = case_in.status

    if case_in.investigation_findings is not None:
        case_obj.investigation_findings = case_in.investigation_findings.strip() if case_in.investigation_findings else None
    if case_in.observed_behavior is not None:
        case_obj.observed_behavior = case_in.observed_behavior.strip() if case_in.observed_behavior else None
    if case_in.investigation_method is not None:
        case_obj.investigation_method = case_in.investigation_method.strip() if case_in.investigation_method else None
    if case_in.root_cause is not None:
        case_obj.root_cause = case_in.root_cause.strip() if case_in.root_cause else None
    if case_in.remediation is not None:
        case_obj.remediation = case_in.remediation.strip() if case_in.remediation else None
    if case_in.conclusion is not None:
        case_obj.conclusion = case_in.conclusion.strip() if case_in.conclusion else None

    if case_in.tags is not None:
        case_obj.tags = case_in.tags.strip()
    if case_in.incident_date is not None:
        case_obj.incident_date = case_in.incident_date

    if case_in.ioc_ids is not None:
        iocs = db.query(IOC).filter(IOC.id.in_(case_in.ioc_ids)).all()
        case_obj.iocs = iocs

    db.commit()
    db.refresh(case_obj)
    return case_obj


def delete_case(db: Session, case_id: int) -> bool:
    case_obj = get_case_by_id(db, case_id)
    db.delete(case_obj)
    db.commit()
    return True


def associate_ioc_to_case(db: Session, case_id: int, ioc_id: int) -> Case:
    case_obj = get_case_by_id(db, case_id)
    ioc = get_ioc_by_id(db, ioc_id)

    if ioc not in case_obj.iocs:
        case_obj.iocs.append(ioc)
        db.commit()
        db.refresh(case_obj)
    return case_obj


def dissociate_ioc_from_case(db: Session, case_id: int, ioc_id: int) -> Case:
    case_obj = get_case_by_id(db, case_id)
    ioc = get_ioc_by_id(db, ioc_id)

    if ioc in case_obj.iocs:
        case_obj.iocs.remove(ioc)
        db.commit()
        db.refresh(case_obj)
    return case_obj

