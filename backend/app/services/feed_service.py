import re
import html
import time
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

FEED_SOURCES = [
    {
        "id": "thn",
        "name": "The Hacker News",
        "url": "https://feeds.feedburner.com/TheHackersNews",
        "badge_color": "rose",
        "website": "https://thehackernews.com",
    },
    {
        "id": "unit42",
        "name": "Palo Alto Unit 42",
        "url": "https://unit42.paloaltonetworks.com/feed/",
        "badge_color": "amber",
        "website": "https://unit42.paloaltonetworks.com",
    },
    {
        "id": "krebs",
        "name": "Krebs on Security",
        "url": "https://krebsonsecurity.com/feed/",
        "badge_color": "cyan",
        "website": "https://krebsonsecurity.com",
    },
    {
        "id": "sans",
        "name": "SANS Internet Storm Center",
        "url": "https://isc.sans.edu/rssfeed.xml",
        "badge_color": "emerald",
        "website": "https://isc.sans.edu",
    },
    {
        "id": "schneier",
        "name": "Schneier on Security",
        "url": "https://www.schneier.com/feed/atom/",
        "badge_color": "violet",
        "website": "https://www.schneier.com",
    },
]

# Simple in-memory cache
_feed_cache: Dict[str, Any] = {
    "timestamp": 0,
    "items": [],
}
CACHE_TTL_SECONDS = 300  # 5 minutes


def strip_html_tags(text: str) -> str:
    """Removes HTML markup from text."""
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", " ", text)
    clean = html.unescape(clean)
    return " ".join(clean.split())


def classify_category(title: str, summary: str) -> str:
    """Classifies threat news into SOC category based on keywords."""
    combined = f"{title} {summary}".lower()
    if any(k in combined for k in ["ransomware", "encryptor", "lockbit", "akira", "blackcat"]):
        return "Ransomware"
    if any(k in combined for k in ["phish", "aitm", "evilginx", "credential theft", "spoof"]):
        return "Phishing"
    if any(k in combined for k in ["cve-", "zero-day", "0-day", "vulnerability", "rce", "exploit", "flaw", "arbitrary code"]):
        return "Vulnerability Exploitation"
    if any(k in combined for k in ["malware", "infostealer", "trojan", "lumma", "redline", "loader", "backdoor", "rootkit"]):
        return "Malware"
    if any(k in combined for k in ["breach", "leaked", "dump", "database leak", "exposed credentials"]):
        return "Data Breach"
    if any(k in combined for k in ["apt", "nation-state", "espionage", "cyber espionage", "volt typhoon", "fancy bear"]):
        return "APT"
    if any(k in combined for k in ["ddos", "denial of service", "amplification attack"]):
        return "Denial of Service"
    return "Cyber Attack"


def classify_severity(title: str, summary: str, category: str) -> str:
    """Assigns SOC severity level based on risk indicators."""
    combined = f"{title} {summary}".lower()
    if any(k in combined for k in ["critical", "zero-day", "active exploitation", "rce", "unauthenticated", "mass exploitation"]):
        return "Critical"
    if any(k in combined for k in ["high severity", "privilege escalation", "bypass", "ransomware", "emergency"]):
        return "High"
    if any(k in combined for k in ["moderate", "medium", "phishing campaign"]):
        return "Medium"
    if category in ["Ransomware", "Vulnerability Exploitation", "APT"]:
        return "High"
    return "Medium"


def extract_potential_iocs(text: str) -> List[Dict[str, str]]:
    """Extracts CVEs, IPv4s, and hashes from article text."""
    iocs = []
    seen = set()

    # CVE regex
    cves = re.findall(r"\bCVE-\d{4}-\d{4,7}\b", text, re.IGNORECASE)
    for cve in cves:
        val = cve.upper()
        if val not in seen:
            seen.add(val)
            iocs.append({"type": "Vulnerability", "value": val})

    # SHA256 hashes
    sha256s = re.findall(r"\b[0-9a-fA-F]{64}\b", text)
    for h in sha256s:
        val = h.lower()
        if val not in seen:
            seen.add(val)
            iocs.append({"type": "SHA256", "value": val})

    # MD5 hashes
    md5s = re.findall(r"\b[0-9a-fA-F]{32}\b", text)
    for h in md5s:
        val = h.lower()
        if val not in seen:
            seen.add(val)
            iocs.append({"type": "MD5", "value": val})

    # IPv4 addresses (excluding local private and zero-padded false positives)
    ips = re.findall(r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b", text)
    for ip in ips:
        parts = ip.split(".")
        if len(parts) == 4 and all(0 <= int(p) <= 255 for p in parts):
            if not ip.startswith(("10.", "192.168.", "127.", "0.", "255.")):
                if ip not in seen:
                    seen.add(ip)
                    iocs.append({"type": "IPv4", "value": ip})

    return iocs[:10]  # Cap at 10 to keep it relevant


def fetch_single_feed(source: Dict[str, str]) -> List[Dict[str, Any]]:
    """Fetches and parses a single RSS or Atom feed."""
    items_out = []
    url = source["url"]
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9",
    }
    req = urllib.request.Request(url, headers=headers)

    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            content = response.read()
            root = ET.fromstring(content)

            # Check if RSS 2.0 (<channel><item>)
            rss_items = root.findall(".//item")
            if rss_items:
                for item in rss_items[:20]:
                    title_elem = item.find("title")
                    link_elem = item.find("link")
                    desc_elem = item.find("description")
                    pub_elem = item.find("pubDate")

                    title = title_elem.text.strip() if title_elem is not None and title_elem.text else "Untitled"
                    link = link_elem.text.strip() if link_elem is not None and link_elem.text else source["website"]
                    raw_summary = desc_elem.text.strip() if desc_elem is not None and desc_elem.text else ""
                    clean_summary = strip_html_tags(raw_summary)[:350]
                    pub_date = pub_elem.text.strip() if pub_elem is not None and pub_elem.text else "Recent"

                    cat = classify_category(title, clean_summary)
                    sev = classify_severity(title, clean_summary, cat)
                    iocs = extract_potential_iocs(f"{title} {raw_summary}")

                    items_out.append({
                        "id": f"{source['id']}-{abs(hash(link))}",
                        "title": title,
                        "link": link,
                        "summary": clean_summary,
                        "source_id": source["id"],
                        "source_name": source["name"],
                        "source_website": source["website"],
                        "badge_color": source["badge_color"],
                        "published_date": pub_date,
                        "category": cat,
                        "severity": sev,
                        "extracted_iocs": iocs,
                    })

            # Check if Atom (<feed><entry>)
            atom_entries = root.findall(".//{http://www.w3.org/2005/Atom}entry")
            if atom_entries:
                for entry in atom_entries[:20]:
                    title_elem = entry.find("{http://www.w3.org/2005/Atom}title")
                    link_elem = entry.find("{http://www.w3.org/2005/Atom}link")
                    summary_elem = entry.find("{http://www.w3.org/2005/Atom}summary") or entry.find("{http://www.w3.org/2005/Atom}content")
                    published_elem = entry.find("{http://www.w3.org/2005/Atom}published") or entry.find("{http://www.w3.org/2005/Atom}updated")

                    title = title_elem.text.strip() if title_elem is not None and title_elem.text else "Untitled"
                    link = link_elem.attrib.get("href", source["website"]) if link_elem is not None else source["website"]
                    raw_summary = summary_elem.text.strip() if summary_elem is not None and summary_elem.text else ""
                    clean_summary = strip_html_tags(raw_summary)[:350]
                    pub_date = published_elem.text.strip() if published_elem is not None and published_elem.text else "Recent"

                    cat = classify_category(title, clean_summary)
                    sev = classify_severity(title, clean_summary, cat)
                    iocs = extract_potential_iocs(f"{title} {raw_summary}")

                    items_out.append({
                        "id": f"{source['id']}-{abs(hash(link))}",
                        "title": title,
                        "link": link,
                        "summary": clean_summary,
                        "source_id": source["id"],
                        "source_name": source["name"],
                        "source_website": source["website"],
                        "badge_color": source["badge_color"],
                        "published_date": pub_date,
                        "category": cat,
                        "severity": sev,
                        "extracted_iocs": iocs,
                    })

    except Exception as e:
        # Ignore individual feed failure gracefully
        print(f"Failed to fetch feed {source['name']}: {e}")

    return items_out


def get_live_feeds(
    force_refresh: bool = False,
    source_id: Optional[str] = None,
    category: Optional[str] = None,
    q: Optional[str] = None,
) -> Dict[str, Any]:
    """Fetches and caches live feeds from all configured cybersecurity news sources."""
    now = time.time()
    global _feed_cache

    if force_refresh or (now - _feed_cache["timestamp"] > CACHE_TTL_SECONDS) or not _feed_cache["items"]:
        all_items = []
        for src in FEED_SOURCES:
            feed_items = fetch_single_feed(src)
            all_items.extend(feed_items)

        _feed_cache["items"] = all_items
        _feed_cache["timestamp"] = now

    results = _feed_cache["items"]

    # Filter by source
    if source_id and source_id != "all":
        results = [item for item in results if item["source_id"] == source_id]

    # Filter by category
    if category and category != "all":
        results = [item for item in results if item["category"].lower() == category.lower()]

    # Filter by search keyword
    if q and q.strip():
        search_kw = q.strip().lower()
        results = [
            item for item in results
            if search_kw in item["title"].lower() or search_kw in item["summary"].lower()
        ]

    return {
        "sources": FEED_SOURCES,
        "total": len(results),
        "fetched_at": datetime.fromtimestamp(_feed_cache["timestamp"], tz=timezone.utc).isoformat(),
        "items": results,
    }
