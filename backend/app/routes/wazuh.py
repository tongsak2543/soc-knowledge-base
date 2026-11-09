import re
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, Response, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.ioc import IOC
from app.models.feed_ioc import FeedIOC
from app.models.case import Case
from app.services import ioc_retention_service

router = APIRouter(prefix="/wazuh", tags=["Wazuh CTI Integration"])


class WazuhMatchRequest(BaseModel):
    value: str
    ioc_type: Optional[str] = None


def sanitize_cdb_value(val: str, default: str = "MALICIOUS") -> str:
    """
    Sanitizes values for Wazuh CDB files.
    Wazuh CDB requires `key:value` without spaces, colons, or control characters.
    """
    if not val:
        return default
    cleaned = re.sub(r"[^a-zA-Z0-9_\-]", "_", val).strip("_")
    # Collapse multiple consecutive underscores
    cleaned = re.sub(r"_+", "_", cleaned)
    return cleaned or default


@router.get("/stats")
def get_wazuh_integration_stats(db: Session = Depends(get_db)):
    """
    Returns live statistics on indicators available for Wazuh CDB blocklists
    and threat correlation.
    """
    total_feed_iocs = db.query(FeedIOC).filter(FeedIOC.is_active == True).count()
    active_feed_ips = (
        db.query(FeedIOC)
        .filter(FeedIOC.is_active == True, FeedIOC.ioc_type.in_(["IPv4", "IPv6"]))
        .count()
    )
    active_feed_urls = (
        db.query(FeedIOC)
        .filter(FeedIOC.is_active == True, FeedIOC.ioc_type == "URL")
        .count()
    )

    core_cases_count = db.query(Case).count()
    core_iocs_count = db.query(IOC).count()
    core_ips = db.query(IOC).filter(IOC.ioc_type.in_(["IPv4", "IPv6"])).count()
    core_hashes = db.query(IOC).filter(IOC.ioc_type.in_(["MD5", "SHA1", "SHA256"])).count()
    core_domains = db.query(IOC).filter(IOC.ioc_type == "Domain").count()

    return {
        "status": "ready",
        "wazuh_cdb_ready_ips": active_feed_ips + core_ips,
        "wazuh_ready_urls": active_feed_urls,
        "wazuh_ready_hashes": core_hashes,
        "wazuh_ready_domains": core_domains,
        "total_active_feed_indicators": total_feed_iocs,
        "verified_internal_cases": core_cases_count,
        "verified_internal_iocs": core_iocs_count,
        "cdb_endpoints": {
            "ips_cdb": "/api/wazuh/lists/ips.cdb",
            "hashes_cdb": "/api/wazuh/lists/hashes.cdb",
            "domains_cdb": "/api/wazuh/lists/domains.cdb",
            "urls_txt": "/api/wazuh/lists/urls.txt",
        },
    }


@router.get("/lists/ips.cdb")
def export_wazuh_ip_cdb_list(
    min_confidence: str = Query("High", description="Filter confidence: High, Medium, or All"),
    include_core: bool = Query(True, description="Include verified internal incident IOCs"),
    db: Session = Depends(get_db),
):
    """
    Exports malicious IP indicators in the official Wazuh CDB List format:
    `<ip>:<attribution_key>`
    Directly compatible with Wazuh `/var/ossec/etc/lists/` and `ossec-makelists`.
    """
    cdb_lines = []
    seen_ips = set()

    # 1. Include verified internal case IPs (Tier 2 - Highest Priority)
    if include_core:
        core_ips = db.query(IOC).filter(IOC.ioc_type.in_(["IPv4", "IPv6"])).all()
        for ioc in core_ips:
            ip = ioc.normalized_value.strip()
            if ip and ip not in seen_ips:
                seen_ips.add(ip)
                case_names = [c.case_id for c in ioc.cases]
                raw_tag = f"SOC_CASE_{'_'.join(case_names)}" if case_names else "SOC_CONFIRMED"
                cdb_lines.append(f"{ip}:{sanitize_cdb_value(raw_tag)}")

    # 2. Include active high-confidence feed IPs (Tier 1 Staging)
    query = db.query(FeedIOC).filter(
        FeedIOC.is_active == True,
        FeedIOC.ioc_type.in_(["IPv4", "IPv6"]),
    )
    if min_confidence != "All":
        query = query.filter(FeedIOC.confidence == min_confidence)

    feed_ips = query.all()
    for fi in feed_ips:
        ip = fi.normalized_value.strip()
        if ip and ip not in seen_ips:
            seen_ips.add(ip)
            safe_source = sanitize_cdb_value(fi.source_name, default="CTI_FEED")
            cdb_lines.append(f"{ip}:{safe_source}")

    content = "\n".join(cdb_lines) + "\n" if cdb_lines else ""
    return Response(
        content=content,
        media_type="text/plain",
        headers={"Content-Disposition": 'attachment; filename="malicious_ips.cdb"'},
    )


@router.get("/lists/hashes.cdb")
def export_wazuh_hash_cdb_list(
    db: Session = Depends(get_db),
):
    """
    Exports malicious file hashes (MD5, SHA1, SHA256) for Wazuh FIM (File Integrity Monitoring)
    or Sysmon hash matching.
    """
    lines = []
    seen = set()
    hashes = db.query(IOC).filter(IOC.ioc_type.in_(["MD5", "SHA1", "SHA256"])).all()
    for h in hashes:
        val = h.normalized_value.strip().lower()
        if val and val not in seen:
            seen.add(val)
            tag = sanitize_cdb_value(f"{h.ioc_type}_CONFIRMED")
            lines.append(f"{val}:{tag}")

    content = "\n".join(lines) + "\n" if lines else ""
    return Response(
        content=content,
        media_type="text/plain",
        headers={"Content-Disposition": 'attachment; filename="malicious_hashes.cdb"'},
    )


@router.get("/lists/domains.cdb")
def export_wazuh_domain_cdb_list(
    db: Session = Depends(get_db),
):
    """
    Exports malicious domain names for Wazuh DNS query matching (Sysmon Event ID 22 or Zeek DNS).
    """
    lines = []
    seen = set()
    domains = db.query(IOC).filter(IOC.ioc_type == "Domain").all()
    for d in domains:
        val = d.normalized_value.strip().lower()
        if val and val not in seen:
            seen.add(val)
            tag = sanitize_cdb_value("MALICIOUS_C2_DOMAIN")
            lines.append(f"{val}:{tag}")

    content = "\n".join(lines) + "\n" if lines else ""
    return Response(
        content=content,
        media_type="text/plain",
        headers={"Content-Disposition": 'attachment; filename="malicious_domains.cdb"'},
    )


@router.get("/lists/urls.txt")
def export_malicious_urls(
    db: Session = Depends(get_db),
):
    """
    Exports active malicious phishing and payload URLs for Web Proxy,
    Suricata, or Wazuh Suricata alert correlation.
    """
    lines = []
    seen = set()
    # Core URLs
    core_urls = db.query(IOC).filter(IOC.ioc_type == "URL").all()
    for u in core_urls:
        val = u.value.strip()
        if val and val not in seen:
            seen.add(val)
            lines.append(val)

    # Feed URLs
    feed_urls = (
        db.query(FeedIOC)
        .filter(FeedIOC.is_active == True, FeedIOC.ioc_type == "URL")
        .all()
    )
    for u in feed_urls:
        val = u.value.strip()
        if val and val not in seen:
            seen.add(val)
            lines.append(val)

    content = "\n".join(lines) + "\n" if lines else ""
    return Response(
        content=content,
        media_type="text/plain",
        headers={"Content-Disposition": 'attachment; filename="phishing_urls.txt"'},
    )


@router.post("/match")
def match_wazuh_event_indicator(
    payload: WazuhMatchRequest,
    db: Session = Depends(get_db),
):
    """
    Real-time lookup endpoint for Wazuh Integrator / Active Response scripts.
    Matches an IP, hash, or domain against both Tier 2 (Internal Cases)
    and Tier 1 (Active CTI Feeds).
    """
    raw_val = payload.value.strip()
    norm_val = raw_val.lower()

    # 1. Check Core Knowledge Base (High Severity Match)
    core_match = (
        db.query(IOC)
        .filter((IOC.value == raw_val) | (IOC.normalized_value == norm_val))
        .first()
    )

    if core_match:
        cases_data = [
            {"case_id": c.case_id, "title": c.title, "severity": c.severity, "status": c.status}
            for c in core_match.cases
        ]
        return {
            "matched": True,
            "tier": "Tier-2 (Verified Internal SOC Case)",
            "severity": "CRITICAL" if any(c.severity == "Critical" for c in core_match.cases) else "HIGH",
            "ioc_type": core_match.ioc_type,
            "indicator": core_match.value,
            "description": core_match.description,
            "cases": cases_data,
            "recommendation": "IMMEDIATE CONTAINMENT: Host matched verified internal incident artifact.",
        }

    # 2. Check Active Feed Staging (Tier 1 CTI)
    feed_match = (
        db.query(FeedIOC)
        .filter(
            (FeedIOC.value == raw_val) | (FeedIOC.normalized_value == norm_val),
            FeedIOC.is_active == True,
        )
        .first()
    )

    if feed_match:
        return {
            "matched": True,
            "tier": "Tier-1 (Active External Threat Intelligence Feed)",
            "severity": "HIGH",
            "ioc_type": feed_match.ioc_type,
            "indicator": feed_match.value,
            "source_name": feed_match.source_name,
            "threat_context": feed_match.threat_context,
            "confidence": feed_match.confidence,
            "expires_at": feed_match.expires_at,
            "recommendation": f"POTENTIAL THREAT: Flagged by {feed_match.source_name}. Check endpoint process tree.",
        }

    return {
        "matched": False,
        "indicator": raw_val,
        "message": "Indicator not found in internal knowledge base or active threat feeds.",
    }


@router.post("/sync-feeds")
def sync_feeds_to_staging(
    db: Session = Depends(get_db),
):
    """
    Ingests live external threat intel feeds into SQLite Tier 1 staging (feed_iocs).
    Calculates TTLs (14 days for URLs, 30 days for IPs) and updates timestamps.
    """
    return ioc_retention_service.sync_and_store_feeds_to_db(db=db)


@router.post("/purge-expired")
def purge_expired_feed_indicators(
    db: Session = Depends(get_db),
):
    """
    Deactivates or purges indicators whose TTL has expired.
    """
    return ioc_retention_service.purge_expired_feed_iocs(db=db)


@router.post("/promote/{feed_ioc_id}")
def promote_feed_ioc(
    feed_ioc_id: int,
    case_id: Optional[int] = Query(None, description="Optional case ID to link indicator to"),
    db: Session = Depends(get_db),
):
    """
    Promotes a Tier 1 Feed indicator into the Tier 2 Core Knowledge Base.
    """
    result = ioc_retention_service.promote_feed_ioc_to_core(
        db=db,
        feed_ioc_id=feed_ioc_id,
        case_id=case_id,
    )
    if result.get("status") == "error":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result.get("message"))
    return result
