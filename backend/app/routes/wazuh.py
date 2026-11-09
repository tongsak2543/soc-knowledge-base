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
    min_confidence: str = "High",
    include_core: bool = True,
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
        core_ips = (
            db.query(IOC.normalized_value, IOC.description)
            .filter(IOC.ioc_type.in_(["IPv4", "IPv6"]))
            .all()
        )
        for norm_val, desc in core_ips:
            ip = (norm_val or "").strip()
            if ip and ip not in seen_ips:
                seen_ips.add(ip)
                raw_tag = "MALICIOUS"
                if desc and "[" in desc and "]" in desc:
                    raw_tag = desc.split("]")[0].replace("[", "").strip()
                cdb_lines.append(f"{ip}:{sanitize_cdb_value(raw_tag)}")

    # 2. Include active high-confidence feed IPs (Tier 1 Staging)
    query = db.query(FeedIOC.normalized_value, FeedIOC.source_name).filter(
        FeedIOC.is_active == True,
        FeedIOC.ioc_type.in_(["IPv4", "IPv6"]),
    )
    if min_confidence != "All":
        query = query.filter(FeedIOC.confidence == min_confidence)

    feed_ips = query.all()
    for norm_val, source_name in feed_ips:
        ip = (norm_val or "").strip()
        if ip and ip not in seen_ips:
            seen_ips.add(ip)
            safe_source = sanitize_cdb_value(source_name, default="CTI_FEED")
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
    hashes = (
        db.query(IOC.normalized_value, IOC.ioc_type)
        .filter(IOC.ioc_type.in_(["MD5", "SHA1", "SHA256"]))
        .all()
    )
    for norm_val, ioc_type in hashes:
        val = (norm_val or "").strip().lower()
        if val and val not in seen:
            seen.add(val)
            tag = sanitize_cdb_value(f"{ioc_type}_CONFIRMED")
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
    domains = (
        db.query(IOC.normalized_value)
        .filter(IOC.ioc_type == "Domain")
        .all()
    )
    for (norm_val,) in domains:
        val = (norm_val or "").strip().lower()
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


# =====================================================================
# DIRECT WAZUH REST APIs (Real-time Lookup & Webhook Integration)
# =====================================================================

class BulkCheckRequest(BaseModel):
    values: List[str]


def _lookup_indicator(val: str, db: Session) -> Dict[str, Any]:
    """Helper to check an indicator against both core IOCs and feed IOCs."""
    raw_val = val.strip()
    norm_val = raw_val.lower()

    # 1. Search Core Database
    core = (
        db.query(IOC)
        .filter((IOC.value == raw_val) | (IOC.normalized_value == norm_val))
        .first()
    )

    if core:
        desc = (core.description or "").lower()
        threat_cat = "Malicious Indicator"
        if "cobalt" in desc or "beacon" in desc:
            threat_cat = "Cobalt Strike C2 / Beacon"
        elif "miner" in desc or "monero" in desc or "xmrig" in desc:
            threat_cat = "Cryptocurrency Miner (XMRig)"
        elif "botnet" in desc or "feodo" in desc:
            threat_cat = "Botnet C2 Server"
        elif "phish" in desc:
            threat_cat = "Phishing Infrastructure"

        return {
            "indicator": raw_val,
            "malicious": True,
            "ioc_type": core.ioc_type,
            "severity": "CRITICAL" if any(c.severity == "Critical" for c in core.cases) or "cobalt" in desc else "HIGH",
            "threat_category": threat_cat,
            "threat_context": core.description,
            "action": "BLOCK",
            "confidence": core.confidence or "High",
            "misp_category": core.misp_category,
            "first_seen": core.created_at.isoformat() if core.created_at else None,
            "recommendation": f"IMMEDIATE ACTION: Block indicator. Matched internal SOC {threat_cat}.",
        }

    # 2. Search Feed IOCs Staging
    feed = (
        db.query(FeedIOC)
        .filter(
            (FeedIOC.value == raw_val) | (FeedIOC.normalized_value == norm_val),
            FeedIOC.is_active == True,
        )
        .first()
    )

    if feed:
        desc = (feed.threat_context or "").lower()
        threat_cat = "External Threat Feed"
        if "cobalt" in desc or "beacon" in desc:
            threat_cat = "Cobalt Strike C2 / Beacon"
        elif "miner" in desc or "monero" in desc or "xmrig" in desc:
            threat_cat = "Cryptocurrency Miner (XMRig)"

        return {
            "indicator": raw_val,
            "malicious": True,
            "ioc_type": feed.ioc_type,
            "severity": "CRITICAL" if "cobalt" in desc else "HIGH",
            "threat_category": threat_cat,
            "threat_context": feed.threat_context,
            "action": "BLOCK",
            "source": feed.source_name,
            "confidence": feed.confidence or "High",
            "first_seen": feed.first_seen.isoformat() if feed.first_seen else None,
            "recommendation": f"POTENTIAL THREAT: Flagged by {feed.source_name}. Investigate host telemetry.",
        }

    return {
        "indicator": raw_val,
        "malicious": False,
        "severity": "CLEAN",
        "action": "ALLOW",
        "message": "Indicator not found in threat intelligence repository.",
    }


@router.get("/ioc/check")
def check_single_ioc_for_wazuh(
    value: str = Query(..., description="IP, Domain, URL, or Hash to check against CTI repository"),
    db: Session = Depends(get_db),
):
    """
    Direct REST API for Wazuh Active Response scripts, CLI, or integrations.
    Returns instant malicious verdict and recommended containment action.
    Example: GET /api/wazuh/ioc/check?value=1.117.74.144
    """
    return _lookup_indicator(val=value, db=db)


@router.post("/ioc/check-bulk")
def check_bulk_iocs_for_wazuh(
    payload: BulkCheckRequest,
    db: Session = Depends(get_db),
):
    """
    Checks multiple IOCs in a single HTTP request for high-throughput Wazuh agent logs.
    """
    results = []
    for val in payload.values[:100]:
        results.append(_lookup_indicator(val=val, db=db))
    return {
        "total_checked": len(results),
        "malicious_count": sum(1 for r in results if r.get("malicious")),
        "results": results,
    }


@router.post("/webhook/alert")
def wazuh_integrator_alert_webhook(
    alert: Dict[str, Any],
    db: Session = Depends(get_db),
):
    """
    Direct webhook endpoint for Wazuh Integrator daemon (wazuh-integratord).
    Receives raw Wazuh alert JSON, automatically parses IP addresses, hashes,
    and domain names, and evaluates them against the 4,900+ IOC repository.
    """
    extracted_indicators = []

    # 1. Extract Network IPs
    data = alert.get("data", {})
    if isinstance(data, dict):
        if data.get("srcip"):
            extracted_indicators.append(("srcip", data["srcip"]))
        if data.get("dstip"):
            extracted_indicators.append(("dstip", data["dstip"]))

        # 2. Extract Sysmon fields
        win = data.get("win", {})
        if isinstance(win, dict):
            eventdata = win.get("eventdata", {})
            if isinstance(eventdata, dict):
                # DNS query (Coinminer / C2 domains)
                if eventdata.get("queryName"):
                    extracted_indicators.append(("queryName", eventdata["queryName"]))
                if eventdata.get("destinationIp"):
                    extracted_indicators.append(("destinationIp", eventdata["destinationIp"]))
                # Hashes
                if eventdata.get("hashes"):
                    # Sysmon format: MD5=xxx,SHA256=yyy
                    for part in eventdata["hashes"].split(","):
                        if "=" in part:
                            extracted_indicators.append(("hash", part.split("=")[1].strip()))

    # 3. Check Wazuh FIM (Syscheck)
    syscheck = alert.get("syscheck", {})
    if isinstance(syscheck, dict):
        if syscheck.get("md5_after"):
            extracted_indicators.append(("md5", syscheck["md5_after"]))
        if syscheck.get("sha256_after"):
            extracted_indicators.append(("sha256", syscheck["sha256_after"]))

    # Scan extracted indicators against CTI
    matches = []
    for field_name, ind_val in extracted_indicators:
        lookup = _lookup_indicator(val=ind_val, db=db)
        if lookup.get("malicious"):
            matches.append({
                "field": field_name,
                "value": ind_val,
                "threat_category": lookup.get("threat_category"),
                "threat_context": lookup.get("threat_context"),
                "severity": lookup.get("severity"),
                "action": lookup.get("action"),
                "recommendation": lookup.get("recommendation"),
            })

    return {
        "status": "analyzed",
        "rule_id": alert.get("rule", {}).get("id"),
        "rule_description": alert.get("rule", {}).get("description"),
        "indicators_inspected": len(extracted_indicators),
        "matched": len(matches) > 0,
        "matches_count": len(matches),
        "threats": matches,
    }


@router.get("/integrator/script")
def get_wazuh_integrator_script():
    """
    Returns the ready-to-use Python script for /var/ossec/integrations/custom-cti
    to forward Wazuh alerts directly into this CTI API.
    """
    script_content = '''#!/usr/bin/env python3
"""
Wazuh Integrator Daemon script for SOC CTI API
Place this file in: /var/ossec/integrations/custom-cti
chmod 750 /var/ossec/integrations/custom-cti
chown root:wazuh /var/ossec/integrations/custom-cti
"""
import sys
import json
import urllib.request

if len(sys.argv) < 2:
    sys.exit(1)

alert_file = sys.argv[1]
hook_url = sys.argv[3] if len(sys.argv) > 3 else "http://127.0.0.1:8000/api/wazuh/webhook/alert"

try:
    with open(alert_file, "r") as f:
        alert = json.load(f)

    # Post alert to CTI API
    req = urllib.request.Request(
        hook_url,
        data=json.dumps(alert).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "Wazuh-Integrator"},
    )
    with urllib.request.urlopen(req, timeout=4) as response:
        result = json.loads(response.read().decode("utf-8"))
        if result.get("matched"):
            # Threat confirmed! Print to Wazuh log
            print(f"[CTI MATCH] Threat detected in alert {result.get('rule_id')}: {result.get('threats')}")
except Exception as e:
    print(f"[CTI ERROR] Failed to query CTI API: {e}", file=sys.stderr)
'''
    return Response(
        content=script_content,
        media_type="text/x-python",
        headers={"Content-Disposition": 'attachment; filename="custom-cti.py"'},
    )
