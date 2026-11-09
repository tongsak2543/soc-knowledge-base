from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.case import Case
from app.models.ioc import IOC
from app.services import feed_service, ioc_feed_service
from app.services.validator import validate_and_normalize_ioc
from datetime import datetime, timezone

router = APIRouter(prefix="/feeds", tags=["Threat Intelligence Feeds"])


class ConvertFeedToCaseRequest(BaseModel):
    title: str
    link: str
    summary: str
    source_name: str
    category: str
    severity: str
    extracted_iocs: Optional[List[dict]] = None


class ImportFeedIOCRequest(BaseModel):
    ioc_type: str
    value: str
    description: str
    case_ids: Optional[List[int]] = None


@router.get("/iocs")
def get_live_ioc_feeds(
    q: Optional[str] = Query(None, description="Search keyword in indicator value or context"),
    source_id: Optional[str] = Query(None, description="Filter by source ID: feodo, openphish, et_compromised, blocklist_de"),
    ioc_type: Optional[str] = Query(None, description="Filter by IOC type: IPv4, URL"),
    refresh: bool = Query(False, description="Force re-fetch IOC feeds bypassing cache"),
):
    """
    Fetches real-time Indicators of Compromise (IOC) streams directly from
    authentic CTI feeds: abuse.ch Feodo Tracker, OpenPhish, Proofpoint Emerging Threats,
    and Blocklist.de.
    """
    return ioc_feed_service.get_live_ioc_feeds(
        force_refresh=refresh,
        source_id=source_id,
        ioc_type=ioc_type,
        q=q,
    )


@router.post("/iocs/import", status_code=status.HTTP_201_CREATED)
def import_feed_ioc_to_repository(
    payload: ImportFeedIOCRequest,
    db: Session = Depends(get_db),
):
    """
    Imports a live feed indicator directly into the internal SQLite IOC repository
    and optionally associates it with one or more historical cases.
    """
    result = ioc_feed_service.import_feed_ioc_to_db(
        db=db,
        ioc_type=payload.ioc_type,
        value=payload.value,
        description=payload.description,
        case_ids=payload.case_ids,
    )
    if result.get("status") == "error":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.get("message"))
    return result


@router.post("/iocs/bulk-import", status_code=status.HTTP_201_CREATED)
def bulk_import_live_feed_iocs(
    limit: int = Query(100, ge=10, le=500, description="Number of live feed IOCs to ingest"),
    db: Session = Depends(get_db),
):
    """
    Ingests a live stream of authentic, high-confidence IOCs (OpenPhish, Feodo Tracker,
    Emerging Threats, Blocklist.de) directly into the internal SQLite database (tip.db).
    """
    return ioc_feed_service.bulk_import_live_iocs_to_db(db=db, limit=limit)


@router.get("")
def get_live_threat_feeds(
    q: Optional[str] = Query(None, description="Search keyword in title or summary"),
    source_id: Optional[str] = Query(None, description="Filter by source ID: thn, unit42, krebs, sans, schneier"),
    category: Optional[str] = Query(None, description="Filter by category"),
    refresh: bool = Query(False, description="Force re-fetch feeds bypassing cache"),
):
    """
    Fetches real-time cybersecurity threat intelligence news feeds
    directly from authentic sources: The Hacker News, Palo Alto Unit 42,
    Krebs on Security, SANS Internet Storm Center, and Schneier on Security.
    """
    return feed_service.get_live_feeds(
        force_refresh=refresh,
        source_id=source_id,
        category=category,
        q=q,
    )


@router.post("/convert-to-case", status_code=status.HTTP_201_CREATED)
def convert_feed_to_case(
    payload: ConvertFeedToCaseRequest,
    db: Session = Depends(get_db),
):
    """
    Converts a real-world threat feed intelligence item directly
    into an active SOC Knowledge Base case with linked indicators.
    """
    # Generate unique Case ID
    timestamp_suffix = datetime.now(timezone.utc).strftime("%m%d%H%M")
    case_id = f"FEED-{timestamp_suffix}"

    # Check if case_id conflicts
    counter = 1
    original_case_id = case_id
    while db.query(Case).filter(Case.case_id == case_id).first():
        case_id = f"{original_case_id}-{counter}"
        counter += 1

    findings = (
        f"Threat advisory imported from authentic external intelligence source: {payload.source_name}\n"
        f"Original Source URL: {payload.link}\n\n"
        f"Advisory Summary:\n{payload.summary}"
    )

    case_obj = Case(
        case_id=case_id,
        title=f"[{payload.source_name}] {payload.title}",
        summary=payload.summary,
        category=payload.category,
        severity=payload.severity,
        status="Open",
        investigation_findings=findings,
        observed_behavior="External Threat Advisory - Review infrastructure against reported TTPs and IOCs.",
        investigation_method="OSINT & Technical Feed Correlation via SOC TIP",
        root_cause=f"Reported in {payload.source_name} security advisory",
        remediation="Check internal telemetry for matched indicators, enforce firewall blocks, and patch vulnerable assets.",
        conclusion="Incident initiated from live CTI feed ingestion.",
        tags=f"osint, cti-feed, {payload.source_name.lower().replace(' ', '-')}",
        incident_date=datetime.now(timezone.utc),
    )

    db.add(case_obj)
    db.flush()

    # Link any valid extracted IOCs
    if payload.extracted_iocs:
        for ioc_item in payload.extracted_iocs:
            ioc_type = ioc_item.get("type")
            ioc_val = ioc_item.get("value")
            if not ioc_type or not ioc_val:
                continue

            # Map Vulnerability to note or valid IOC
            if ioc_type in ["IPv4", "IPv6", "Domain", "URL", "MD5", "SHA1", "SHA256"]:
                is_valid, norm_val, _ = validate_and_normalize_ioc(ioc_type, ioc_val)
                if is_valid:
                    existing = (
                        db.query(IOC)
                        .filter(IOC.ioc_type == ioc_type, IOC.normalized_value == norm_val)
                        .first()
                    )
                    if not existing:
                        existing = IOC(
                            ioc_type=ioc_type,
                            value=ioc_val,
                            normalized_value=norm_val,
                            description=f"Extracted from {payload.source_name}: {payload.title[:60]}",
                        )
                        db.add(existing)
                        db.flush()

                    if existing not in case_obj.iocs:
                        case_obj.iocs.append(existing)

    db.commit()
    db.refresh(case_obj)

    return {
        "status": "success",
        "message": f"Successfully created SOC Case {case_obj.case_id} from feed item.",
        "case_id": case_obj.case_id,
        "id": case_obj.id,
    }
