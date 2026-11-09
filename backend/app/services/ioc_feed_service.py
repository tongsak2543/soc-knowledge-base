import re
import json
import time
import urllib.request
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.ioc import IOC
from app.models.case import Case
from app.services.validator import validate_and_normalize_ioc

IOC_FEED_SOURCES = [
    {
        "id": "cobalt_strike",
        "name": "Cobalt Strike C2 Tracker",
        "type": "IPv4",
        "description": "Active Cobalt Strike Team Servers and Beacon C2 listener IPs",
        "badge_color": "rose",
        "website": "https://github.com/drb-ra/C2IntelFeeds",
    },
    {
        "id": "coinminer_pools",
        "name": "Monero / XMRig Mining Pools",
        "type": "Domain",
        "description": "Unauthorized cryptomining pool domains and Stratum protocol endpoints",
        "badge_color": "amber",
        "website": "https://github.com/andoniaf/mining-pools-list",
    },
    {
        "id": "signature_hashes",
        "name": "Signature-Base Malware Hashes",
        "type": "SHA256",
        "description": "Curated malware, Cobalt Strike Beacons, and Coinminer hashes (Florian Roth Signature-Base)",
        "badge_color": "rose",
        "website": "https://github.com/Neo23x0/signature-base",
    },
    {
        "id": "ipsum",
        "name": "IPsum Threat Intelligence",
        "type": "IPv4",
        "description": "High-confidence malicious IPs flagged by multiple global threat lists",
        "badge_color": "violet",
        "website": "https://github.com/stamparm/ipsum",
    },
    {
        "id": "blackbook_domains",
        "name": "Blackbook Malicious Domains",
        "type": "Domain",
        "description": "Active C2 and malware infrastructure domains",
        "badge_color": "purple",
        "website": "https://github.com/stamparm/blackbook",
    },
    {
        "id": "et_compromised",
        "name": "Proofpoint Emerging Threats",
        "type": "IPv4",
        "description": "Actively compromised hosts and adversary C2 infrastructure",
        "badge_color": "cyan",
        "website": "https://rules.emergingthreats.net",
    },
    {
        "id": "openphish",
        "name": "OpenPhish Live",
        "type": "URL",
        "description": "Real-time zero-day active phishing attack URLs",
        "badge_color": "amber",
        "website": "https://openphish.com",
    },
    {
        "id": "feodo",
        "name": "abuse.ch Feodo Tracker",
        "type": "IPv4",
        "description": "Active Botnet Command & Control (C2) servers (Emotet, QakBot, Dridex)",
        "badge_color": "rose",
        "website": "https://feodotracker.abuse.ch",
    },
    {
        "id": "php2shell",
        "name": "PHP2Shell RCE & WebShell Tracker",
        "type": "All",
        "description": "Active PHP2Shell (CVE-2026-109618 / CVE-2026-109619) exploit scanners, staging C2s, and WebShell hashes",
        "badge_color": "rose",
        "website": "https://github.com/naravid19/php2shell-ioc",
    },
]

# Cache structure
_ioc_cache: Dict[str, Any] = {
    "timestamp": 0,
    "items": [],
}
CACHE_TTL_SECONDS = 300  # 5 minutes


def fetch_cobalt_strike_c2(limit: int = 500) -> List[Dict[str, Any]]:
    """Fetches verified Cobalt Strike Team Server and C2 Beacon IPs."""
    items = []
    url = "https://raw.githubusercontent.com/drb-ra/C2IntelFeeds/master/feeds/IPC2s-30day.csv"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 SOC-TIP/2.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            lines = [line.decode("utf-8", errors="ignore").strip() for line in r.readlines()]
            for line in lines[1:limit]:
                if line and not line.startswith("#"):
                    parts = line.split(",")
                    ip = parts[0].strip().strip('"')
                    tag = parts[1].strip().strip('"') if len(parts) > 1 else "Cobalt Strike C2"
                    if ip and re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", ip):
                        items.append({
                            "id": f"cs-{ip}",
                            "ioc_type": "IPv4",
                            "value": ip,
                            "source_id": "cobalt_strike",
                            "source_name": "Cobalt Strike Team Server Tracker",
                            "threat_context": f"Active Cobalt Strike C2 Server / Beacon listener ({tag})",
                            "confidence": "Critical",
                            "first_seen": "Active C2 Intelligence",
                            "badge_color": "rose",
                        })
    except Exception as e:
        print(f"Error fetching Cobalt Strike C2: {e}")
    return items


def fetch_coinminer_pools(limit: int = 800) -> List[Dict[str, Any]]:
    """Fetches known Monero / XMRig cryptocurrency mining pool endpoints and domains."""
    items = []
    url = "https://raw.githubusercontent.com/andoniaf/mining-pools-list/master/mining-pools.lst"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 SOC-TIP/2.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            lines = [line.decode("utf-8", errors="ignore").strip() for line in r.readlines()]
            for line in lines[:limit]:
                domain = line.split(":")[0].strip()
                if domain and "." in domain and not domain.startswith("#"):
                    items.append({
                        "id": f"miner-{abs(hash(domain))}",
                        "ioc_type": "Domain",
                        "value": domain,
                        "source_id": "coinminer_pools",
                        "source_name": "Monero / XMRig Mining Pool",
                        "threat_context": "Unauthorized XMRig / Monero cryptomining pool domain (Stratum protocol)",
                        "confidence": "Critical",
                        "first_seen": "Active Mining Pool Directory",
                        "badge_color": "amber",
                    })
    except Exception as e:
        print(f"Error fetching Mining Pools: {e}")
    return items


def fetch_feodo_tracker() -> List[Dict[str, Any]]:
    """Fetches active C2 IPs from abuse.ch Feodo Tracker."""
    items = []
    url = "https://feodotracker.abuse.ch/downloads/ipblocklist.json"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 SOC-TIP/2.0"})
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            data = json.loads(r.read().decode("utf-8"))
            for entry in data:
                ip = entry.get("ip_address")
                malware = entry.get("malware", "Botnet C2")
                port = entry.get("port", "")
                country = entry.get("country", "")
                first_seen = entry.get("first_seen", "Recent")
                if ip:
                    items.append({
                        "id": f"feodo-{ip}",
                        "ioc_type": "IPv4",
                        "value": ip,
                        "source_id": "feodo",
                        "source_name": "abuse.ch Feodo Tracker",
                        "threat_context": f"Active {malware} Botnet C2 Server (Port: {port}, Country: {country})",
                        "confidence": "High",
                        "first_seen": first_seen,
                        "badge_color": "rose",
                    })
    except Exception as e:
        print(f"Error fetching Feodo Tracker: {e}")
    return items


def fetch_openphish(limit: int = 300) -> List[Dict[str, Any]]:
    """Fetches real-time phishing URLs from OpenPhish."""
    items = []
    url = "https://openphish.com/feed.txt"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 SOC-TIP/2.0"})
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            lines = [line.decode("utf-8", errors="ignore").strip() for line in r.readlines()]
            for line in lines[:limit]:
                if line and line.startswith("http"):
                    items.append({
                        "id": f"openphish-{abs(hash(line))}",
                        "ioc_type": "URL",
                        "value": line,
                        "source_id": "openphish",
                        "source_name": "OpenPhish Live",
                        "threat_context": "Real-time zero-day credential harvesting phishing campaign",
                        "confidence": "High",
                        "first_seen": "Live Stream",
                        "badge_color": "amber",
                    })
    except Exception as e:
        print(f"Error fetching OpenPhish: {e}")
    return items


def fetch_emerging_threats(limit: int = 500) -> List[Dict[str, Any]]:
    """Fetches compromised IPs from Proofpoint Emerging Threats."""
    items = []
    url = "https://rules.emergingthreats.net/blockrules/compromised-ips.txt"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 SOC-TIP/2.0"})
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            lines = [line.decode("utf-8", errors="ignore").strip() for line in r.readlines()]
            for line in lines[:limit]:
                if line and not line.startswith("#"):
                    items.append({
                        "id": f"et-{line}",
                        "ioc_type": "IPv4",
                        "value": line,
                        "source_id": "et_compromised",
                        "source_name": "Proofpoint Emerging Threats",
                        "threat_context": "Actively compromised command-and-control host",
                        "confidence": "High",
                        "first_seen": "Active Blocklist",
                        "badge_color": "cyan",
                    })
    except Exception as e:
        print(f"Error fetching Emerging Threats: {e}")
    return items


def fetch_ipsum(limit: int = 1500) -> List[Dict[str, Any]]:
    """Fetches high-confidence malicious IPs from IPsum threat intelligence."""
    items = []
    url = "https://raw.githubusercontent.com/stamparm/ipsum/master/levels/3.txt"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 SOC-TIP/2.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            lines = [line.decode("utf-8", errors="ignore").strip() for line in r.readlines()]
            for line in lines[:limit]:
                if line and not line.startswith("#"):
                    parts = line.split()
                    ip = parts[0]
                    bad_lists = parts[1] if len(parts) > 1 else "3+"
                    items.append({
                        "id": f"ipsum-{ip}",
                        "ioc_type": "IPv4",
                        "value": ip,
                        "source_id": "ipsum",
                        "source_name": "IPsum Threat Intelligence",
                        "threat_context": f"Flagged by {bad_lists} independent global threat intelligence feeds",
                        "confidence": "Critical",
                        "first_seen": "Aggregated Threat Feed",
                        "badge_color": "violet",
                    })
    except Exception as e:
        print(f"Error fetching IPsum: {e}")
    return items


def fetch_malware_hashes(limit: int = 1200) -> List[Dict[str, Any]]:
    """
    Fetches curated malware file hashes (MD5, SHA1, SHA256) from signature-base,
    prioritizing Cobalt Strike Beacons and Cryptominers (XMRig, Winnti, etc.).
    """
    items = []
    url = "https://raw.githubusercontent.com/Neo23x0/signature-base/master/iocs/hash-iocs.txt"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 SOC-TIP/2.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            lines = [line.decode("utf-8", errors="ignore").strip() for line in r.readlines()]

            # Partition lines: prioritize Cobalt Strike and Coinminer hashes
            priority_lines = []
            standard_lines = []
            for l in lines:
                if not l or l.startswith("#") or ";" not in l:
                    continue
                lower_l = l.lower()
                if any(k in lower_l for k in ["cobalt", "beacon", "strike", "xmrig", "miner", "monero", "stratum", "kinsing"]):
                    priority_lines.append(l)
                else:
                    standard_lines.append(l)

            # Combine: priority first, then standard up to limit
            combined_lines = priority_lines + standard_lines[: max(0, limit - len(priority_lines))]

            for line in combined_lines:
                parts = line.split(";", 1)
                h = parts[0].strip()
                desc = parts[1].strip() if len(parts) > 1 else "Malware artifact"

                h_type = None
                if len(h) == 32:
                    h_type = "MD5"
                elif len(h) == 40:
                    h_type = "SHA1"
                elif len(h) == 64:
                    h_type = "SHA256"

                if h_type:
                    # Give detailed context for Cobalt Strike and Coinminer
                    context = f"Known malware sample ({desc})"
                    src_name = "Signature-Base Malware Hashes"
                    lower_desc = desc.lower()

                    if any(k in lower_desc for k in ["cobalt", "beacon", "strike"]):
                        context = f"Cobalt Strike Beacon payload hash ({desc})"
                        src_name = "Cobalt Strike Beacon Signatures"
                    elif any(k in lower_desc for k in ["xmrig", "miner", "monero", "kinsing"]):
                        context = f"Coinminer / XMRig cryptojacking binary ({desc})"
                        src_name = "Coinminer Malware Hashes"

                    items.append({
                        "id": f"hash-{h[:16]}",
                        "ioc_type": h_type,
                        "value": h,
                        "source_id": "signature_hashes",
                        "source_name": src_name,
                        "threat_context": context,
                        "confidence": "Critical" if "cobalt" in context.lower() or "coinminer" in context.lower() else "High",
                        "first_seen": "Florian Roth Signature-Base",
                        "badge_color": "rose",
                    })
    except Exception as e:
        print(f"Error fetching malware hashes: {e}")
    return items


def fetch_c2_domains(limit: int = 800) -> List[Dict[str, Any]]:
    """Fetches active C2 infrastructure domains from Blackbook."""
    items = []
    url = "https://raw.githubusercontent.com/stamparm/blackbook/master/blackbook.txt"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 SOC-TIP/2.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            lines = [line.decode("utf-8", errors="ignore").strip() for line in r.readlines()]
            for line in lines[:limit]:
                if line and not line.startswith("#") and "." in line:
                    domain = line.split()[0].strip()
                    items.append({
                        "id": f"domain-{abs(hash(domain))}",
                        "ioc_type": "Domain",
                        "value": domain,
                        "source_id": "blackbook_domains",
                        "source_name": "Blackbook Malicious Domains",
                        "threat_context": "Adversary Command & Control (C2) / Phishing infrastructure",
                        "confidence": "High",
                        "first_seen": "Active Threat Infrastructure",
                        "badge_color": "purple",
                    })
    except Exception as e:
        print(f"Error fetching C2 domains: {e}")
    return items


def fetch_php2shell_iocs(limit: int = 500) -> List[Dict[str, Any]]:
    """
    Fetches real-world PHP2Shell (CVE-2026-109618 / CVE-2026-109619) exploit scanners,
    staging infrastructure, C2 domains, and WebShell payload hashes from naravid19/php2shell-ioc.
    Includes robust offline fallback.
    """
    items = []
    url = "https://raw.githubusercontent.com/naravid19/php2shell-ioc/main/iocs/php2shell_iocs.json"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 SOC-TIP/2.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read().decode("utf-8"))
            for entry in data[:limit]:
                raw_type = entry.get("type", "").lower()
                ind = entry.get("indicator", "").strip()
                if not ind:
                    continue

                ioc_type = "IPv4"
                if raw_type == "domain":
                    ioc_type = "Domain"
                elif raw_type in ["sha256", "hash"]:
                    ioc_type = "SHA256"
                elif raw_type == "url":
                    ioc_type = "URL"
                elif raw_type in ["ip", "ipv4"]:
                    ioc_type = "IPv4"

                ctx = entry.get("context") or "Active PHP2Shell exploitation & scanning infrastructure"
                reported_by = entry.get("reported_by", "Threat Intelligence")
                first_seen = entry.get("first_seen", "2026-10-22")

                items.append({
                    "id": f"php2shell-{abs(hash(ind))}",
                    "ioc_type": ioc_type,
                    "value": ind,
                    "source_id": "php2shell",
                    "source_name": "PHP2Shell RCE & WebShell Tracker",
                    "threat_context": f"PHP2Shell (CVE-2026-109618 / CVE-2026-109619) - {ctx} ({reported_by})",
                    "confidence": "Critical",
                    "first_seen": first_seen,
                    "badge_color": "rose",
                })
    except Exception as e:
        print(f"Error fetching live PHP2Shell feed: {e}")

    # Fallback if empty or offline
    if not items:
        fallback_data = [
            ("IPv4", "92.118.112.100", "PHP2Shell exploit scanner & nfs-setup payload dropper"),
            ("IPv4", "194.26.192.83", "Active mass scanner attempting PHP2Shell UAF memory disclosure"),
            ("IPv4", "45.154.255.94", "PHP2Shell multipart/form-data exploit attempt node"),
            ("IPv4", "185.196.220.37", "Automated PHP session upload progress exploit probe"),
            ("IPv4", "193.142.146.168", "PHP2Shell unauthenticated RCE staging IP"),
            ("Domain", "botlesscucks.st", "PHP2Shell C2 & scanner orchestration domain"),
            ("Domain", "checkphp2shell.com", "Adversary verification infrastructure for vulnerable PHP targets"),
            ("Domain", "ashevilleroofingcontractor.com", "Compromised host hosting PHP2Shell payload staging"),
            ("SHA256", "e2529d4afa39ae4db2eb05d5176317c906289abf09660c75bdeec43e54c55aa3", "PHP2Shell staged dropper payload"),
            ("SHA256", "0c5486f06620e26e316f4b33f318b0d646d5e1133789331aa2fed012360d1486", "PHP2Shell reverse shell payload artifact"),
            ("URL", "http://92.118.112.100/nfs-setup", "Active staging URL for secondary PHP2Shell payload"),
        ]
        for t, v, c in fallback_data:
            items.append({
                "id": f"php2shell-{abs(hash(v))}",
                "ioc_type": t,
                "value": v,
                "source_id": "php2shell",
                "source_name": "PHP2Shell RCE & WebShell Tracker",
                "threat_context": f"PHP2Shell (CVE-2026-109618 / CVE-2026-109619) - {c}",
                "confidence": "Critical",
                "first_seen": "2026-10-22",
                "badge_color": "rose",
            })
    return items


def get_live_ioc_feeds(
    force_refresh: bool = False,
    source_id: Optional[str] = None,
    ioc_type: Optional[str] = None,
    q: Optional[str] = None,
) -> Dict[str, Any]:
    """Retrieves aggregated and deduplicated live IOC feeds from multiple authentic sources."""
    now = time.time()
    global _ioc_cache

    if force_refresh or (now - _ioc_cache["timestamp"] > CACHE_TTL_SECONDS) or not _ioc_cache["items"]:
        all_items = []
        # Priority 1: High-threat focus feeds (Cobalt Strike, Coinminer, PHP2Shell)
        all_items.extend(fetch_cobalt_strike_c2(limit=500))
        all_items.extend(fetch_coinminer_pools(limit=800))
        all_items.extend(fetch_php2shell_iocs(limit=500))

        # Priority 2: General threat feeds
        all_items.extend(fetch_malware_hashes(limit=1200))
        all_items.extend(fetch_ipsum(limit=1500))
        all_items.extend(fetch_c2_domains(limit=800))
        all_items.extend(fetch_emerging_threats(limit=500))
        all_items.extend(fetch_openphish(limit=300))
        all_items.extend(fetch_feodo_tracker())

        _ioc_cache["items"] = all_items
        _ioc_cache["timestamp"] = now

    results = _ioc_cache["items"]

    # Filter by source
    if source_id and source_id != "all":
        results = [item for item in results if item["source_id"] == source_id]

    # Filter by IOC type
    if ioc_type and ioc_type != "all":
        results = [item for item in results if item["ioc_type"].lower() == ioc_type.lower()]

    # Filter by keyword
    if q and q.strip():
        search_kw = q.strip().lower()
        results = [
            item for item in results
            if search_kw in item["value"].lower() or search_kw in item["threat_context"].lower()
        ]

    return {
        "sources": IOC_FEED_SOURCES,
        "total": len(results),
        "fetched_at": datetime.fromtimestamp(_ioc_cache["timestamp"], tz=timezone.utc).isoformat(),
        "items": results,
    }


def import_feed_ioc_to_db(
    db: Session,
    ioc_type: str,
    value: str,
    description: str,
    case_ids: Optional[List[int]] = None,
) -> Dict[str, Any]:
    """Validates, normalizes, and saves a live feed IOC directly into SQLite tip.db."""
    import uuid as uuid_mod

    is_valid, norm_val, err = validate_and_normalize_ioc(ioc_type, value)
    if not is_valid:
        return {"status": "error", "message": f"Validation failed: {err}"}

    existing = (
        db.query(IOC)
        .filter(IOC.ioc_type == ioc_type, IOC.normalized_value == norm_val)
        .first()
    )

    if existing:
        if case_ids:
            for cid in case_ids:
                case_obj = db.query(Case).filter(Case.id == cid).first()
                if case_obj and existing not in case_obj.iocs:
                    case_obj.iocs.append(existing)
            db.commit()
        return {
            "status": "exists",
            "message": f"IOC already exists in database (ID: {existing.id}).",
            "id": existing.id,
            "normalized_value": norm_val,
        }

    # Map MISP Category
    misp_cat = "Network activity"
    if ioc_type in ["MD5", "SHA1", "SHA256"]:
        misp_cat = "Payload delivery"
    elif ioc_type == "URL":
        misp_cat = "Network activity"

    new_ioc = IOC(
        ioc_type=ioc_type,
        value=value.strip(),
        normalized_value=norm_val,
        description=description.strip() if description else "Imported from live threat feed",
        uuid=str(uuid_mod.uuid4()),
        misp_category=misp_cat,
        to_ids=True,
        tlp="TLP:AMBER",
        confidence="High",
    )

    if case_ids:
        for cid in case_ids:
            case_obj = db.query(Case).filter(Case.id == cid).first()
            if case_obj:
                new_ioc.cases.append(case_obj)

    db.add(new_ioc)
    db.commit()
    db.refresh(new_ioc)

    return {
        "status": "created",
        "message": f"Successfully imported new IOC to database (ID: {new_ioc.id}).",
        "id": new_ioc.id,
        "normalized_value": norm_val,
    }


def bulk_import_live_iocs_to_db(db: Session, limit: int = 5000) -> Dict[str, Any]:
    """Imports a large batch of authentic live CTI indicators directly into SQLite tip.db."""
    feed_data = get_live_ioc_feeds(force_refresh=True)
    items = feed_data.get("items", [])[:limit]

    created = 0
    duplicate = 0

    for item in items:
        res = import_feed_ioc_to_db(
            db=db,
            ioc_type=item["ioc_type"],
            value=item["value"],
            description=f"[{item['source_name']}] {item['threat_context']}",
        )
        if res.get("status") == "created":
            created += 1
        else:
            duplicate += 1

    return {
        "status": "success",
        "total_processed": len(items),
        "created_count": created,
        "duplicate_count": duplicate,
        "total_in_db": db.query(IOC).count(),
        "message": f"Successfully imported {created} indicators! (Total in DB: {db.query(IOC).count()})",
    }
