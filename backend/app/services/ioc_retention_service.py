from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.feed_ioc import FeedIOC
from app.models.ioc import IOC
from app.models.case import Case
from app.services import ioc_feed_service
from app.services.validator import validate_and_normalize_ioc


def sync_and_store_feeds_to_db(db: Session, limit_per_source: int = 150) -> Dict[str, Any]:
    """
    Fetches real-time threat intelligence from external CTI feeds (Feodo Tracker,
    OpenPhish, Proofpoint ET, Blocklist.de) and ingests them into the Tier 1
    staging table (feed_iocs) with automatic TTL expiration dates.
    """
    raw_data = ioc_feed_service.get_live_ioc_feeds(force_refresh=True)
    items = raw_data.get("items", [])

    created_count = 0
    updated_count = 0
    now = datetime.now(timezone.utc)
    batch_seen: Dict[tuple, FeedIOC] = {}

    for item in items:
        raw_val = item.get("value", "").strip()
        raw_type = item.get("ioc_type", "IPv4")
        if not raw_val:
            continue

        is_valid, norm_val, _ = validate_and_normalize_ioc(raw_type, raw_val)
        if not is_valid:
            continue

        key = (raw_type, norm_val)

        # Set TTL: 14 days for URLs (phishing dies fast), 30 days for IPs/Domains
        if raw_type == "URL":
            expires_at = now + timedelta(days=14)
        else:
            expires_at = now + timedelta(days=30)

        # 1. Check in current batch
        if key in batch_seen:
            existing_batch = batch_seen[key]
            existing_batch.last_seen = now
            existing_batch.expires_at = expires_at
            if item.get("threat_context"):
                existing_batch.threat_context += f" | {item.get('threat_context')}"
            continue

        # 2. Check in database
        existing_db = (
            db.query(FeedIOC)
            .filter(FeedIOC.ioc_type == raw_type, FeedIOC.normalized_value == norm_val)
            .first()
        )

        if existing_db:
            existing_db.last_seen = now
            existing_db.expires_at = expires_at
            existing_db.is_active = True
            if item.get("threat_context"):
                existing_db.threat_context = item.get("threat_context")
            batch_seen[key] = existing_db
            updated_count += 1
        else:
            feed_obj = FeedIOC(
                ioc_type=raw_type,
                value=raw_val,
                normalized_value=norm_val,
                source_id=item.get("source_id", "cti_feed"),
                source_name=item.get("source_name", "External CTI Feed"),
                threat_context=item.get("threat_context", "Threat indicator observed in external feed"),
                confidence=item.get("confidence", "High"),
                first_seen=now,
                last_seen=now,
                expires_at=expires_at,
                is_active=True,
                is_promoted=False,
            )
            db.add(feed_obj)
            batch_seen[key] = feed_obj
            created_count += 1

    db.commit()
    return {
        "status": "success",
        "created_count": created_count,
        "updated_count": updated_count,
        "total_feed_iocs": db.query(FeedIOC).count(),
        "message": f"Successfully synced CTI feeds: {created_count} added, {updated_count} updated in Tier 1 DB.",
    }


def purge_expired_feed_iocs(db: Session) -> Dict[str, Any]:
    """
    Purges or deactivates stale feed IOCs whose TTL has elapsed (now > expires_at),
    preventing DB bloat and stale alert noise in Wazuh.
    """
    now = datetime.now(timezone.utc)
    expired = db.query(FeedIOC).filter(FeedIOC.expires_at < now, FeedIOC.is_active == True).all()

    count = len(expired)
    for entry in expired:
        # If not promoted to a core case, deactivate or purge
        if not entry.is_promoted:
            entry.is_active = False

    db.commit()
    return {
        "status": "success",
        "deactivated_count": count,
        "message": f"Deactivated {count} expired feed indicators based on TTL policy.",
    }


def promote_feed_ioc_to_core(
    db: Session,
    feed_ioc_id: int,
    case_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Promotes a Tier 1 staging Feed IOC into the Tier 2 permanent SOC Knowledge Base (iocs),
    making it an institutional verified artifact and optionally linking it to an investigation case.
    """
    feed_ioc = db.query(FeedIOC).filter(FeedIOC.id == feed_ioc_id).first()
    if not feed_ioc:
        return {"status": "error", "message": f"Feed IOC #{feed_ioc_id} not found"}

    # Check if already exists in core iocs table
    core_ioc = (
        db.query(IOC)
        .filter(IOC.ioc_type == feed_ioc.ioc_type, IOC.normalized_value == feed_ioc.normalized_value)
        .first()
    )

    is_new_core = False
    if not core_ioc:
        core_ioc = IOC(
            ioc_type=feed_ioc.ioc_type,
            value=feed_ioc.value,
            normalized_value=feed_ioc.normalized_value,
            description=f"[{feed_ioc.source_name}] {feed_ioc.threat_context}",
        )
        db.add(core_ioc)
        db.flush()
        is_new_core = True

    # Link to case if requested
    if case_id:
        case = db.query(Case).filter(Case.id == case_id).first()
        if case and core_ioc not in case.iocs:
            case.iocs.append(core_ioc)

    # Mark feed IOC as promoted
    feed_ioc.is_promoted = True
    feed_ioc.promoted_to_ioc_id = core_ioc.id

    db.commit()
    db.refresh(core_ioc)

    return {
        "status": "success",
        "core_ioc_id": core_ioc.id,
        "is_new": is_new_core,
        "message": f"Successfully promoted indicator '{core_ioc.value}' to Core SOC Knowledge Base.",
    }
