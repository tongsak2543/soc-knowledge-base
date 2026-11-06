from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.case import Case
from app.models.ioc import IOC
from app.schemas.dashboard import (
    DashboardStats,
    DashboardRecentCase,
    DashboardRecentIOC,
)
from app.services.validator import VALID_CATEGORIES, VALID_SEVERITIES, VALID_STATUSES, VALID_IOC_TYPES


def get_dashboard_statistics(db: Session) -> DashboardStats:
    total_cases = db.query(Case).count()
    total_iocs = db.query(IOC).count()

    # Recent 5 Cases
    recent_db_cases = (
        db.query(Case)
        .order_by(Case.created_at.desc())
        .limit(5)
        .all()
    )

    recent_cases = [
        DashboardRecentCase(
            id=c.id,
            case_id=c.case_id,
            title=c.title,
            category=c.category,
            severity=c.severity,
            status=c.status,
            incident_date=c.incident_date,
            created_at=c.created_at,
            ioc_count=len(c.iocs),
        )
        for c in recent_db_cases
    ]

    # Recent 5 IOCs
    recent_db_iocs = (
        db.query(IOC)
        .order_by(IOC.created_at.desc())
        .limit(5)
        .all()
    )

    recent_iocs = [
        DashboardRecentIOC(
            id=i.id,
            ioc_type=i.ioc_type,
            value=i.value,
            normalized_value=i.normalized_value,
            description=i.description,
            created_at=i.created_at,
            case_count=len(i.cases),
        )
        for i in recent_db_iocs
    ]

    # Category counts
    cat_counts = {cat: 0 for cat in VALID_CATEGORIES}
    db_cat_counts = (
        db.query(Case.category, func.count(Case.id))
        .group_by(Case.category)
        .all()
    )
    for cat, count in db_cat_counts:
        cat_counts[cat] = count

    # Severity counts
    sev_counts = {sev: 0 for sev in VALID_SEVERITIES}
    db_sev_counts = (
        db.query(Case.severity, func.count(Case.id))
        .group_by(Case.severity)
        .all()
    )
    for sev, count in db_sev_counts:
        sev_counts[sev] = count

    # Status counts
    status_counts = {s: 0 for s in VALID_STATUSES}
    db_status_counts = (
        db.query(Case.status, func.count(Case.id))
        .group_by(Case.status)
        .all()
    )
    for s, count in db_status_counts:
        status_counts[s] = count

    # IOC Type counts
    type_counts = {t: 0 for t in VALID_IOC_TYPES}
    db_type_counts = (
        db.query(IOC.ioc_type, func.count(IOC.id))
        .group_by(IOC.ioc_type)
        .all()
    )
    for ioc_t, count in db_type_counts:
        type_counts[ioc_t] = count

    return DashboardStats(
        total_cases=total_cases,
        total_iocs=total_iocs,
        recent_cases=recent_cases,
        recent_iocs=recent_iocs,
        cases_by_category=cat_counts,
        cases_by_severity=sev_counts,
        cases_by_status=status_counts,
        iocs_by_type=type_counts,
    )
