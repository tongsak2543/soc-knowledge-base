import re
import ipaddress
from urllib.parse import urlparse
from typing import Tuple

VALID_CATEGORIES = [
    "Malware",
    "Ransomware",
    "Phishing",
    "Unauthorized Access",
    "Data Breach",
    "APT",
    "Vulnerability",
    "Vulnerability Exploitation",
    "Cyber Attack",
    "Policy Violation",
    "Denial of Service",
    "Other",
]

VALID_STATUSES = [
    "Open",
    "In Progress",
    "Resolved",
    "Closed",
]

VALID_SEVERITIES = [
    "Critical",
    "High",
    "Medium",
    "Low",
    "Informational",
]

VALID_IOC_TYPES = [
    "IPv4",
    "IPv6",
    "Domain",
    "URL",
    "MD5",
    "SHA1",
    "SHA256",
]

DOMAIN_REGEX = re.compile(
    r"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$"
)
MD5_REGEX = re.compile(r"^[0-9a-fA-F]{32}$")
SHA1_REGEX = re.compile(r"^[0-9a-fA-F]{40}$")
SHA256_REGEX = re.compile(r"^[0-9a-fA-F]{64}$")


def defang(value: str) -> str:
    """Removes common defanging representations from IOC values."""
    val = value.strip()
    # Replace hxxp / hxxps
    val = re.sub(r"^hxxps?://", lambda m: "https://" if "hxxps" in m.group(0).lower() else "http://", val, flags=re.IGNORECASE)
    # Replace [.] and (.) with .
    val = val.replace("[.]", ".").replace("(.)", ".").replace("{.}", ".")
    # Replace [:] with :
    val = val.replace("[:]", ":")
    return val.strip()


def validate_and_normalize_ioc(ioc_type: str, raw_value: str) -> Tuple[bool, str, str]:
    """
    Validates and normalizes an IOC value based on its type.
    Returns: (is_valid, normalized_value, error_message)
    """
    if ioc_type not in VALID_IOC_TYPES:
        return False, "", f"Invalid IOC type: '{ioc_type}'. Allowed types: {', '.join(VALID_IOC_TYPES)}"

    cleaned = defang(raw_value)
    if not cleaned:
        return False, "", "IOC value cannot be empty"

    if ioc_type == "IPv4":
        try:
            ip = ipaddress.IPv4Address(cleaned)
            return True, str(ip), ""
        except ValueError:
            return False, "", f"'{raw_value}' is not a valid IPv4 address"

    elif ioc_type == "IPv6":
        try:
            ip = ipaddress.IPv6Address(cleaned)
            return True, str(ip).lower(), ""
        except ValueError:
            return False, "", f"'{raw_value}' is not a valid IPv6 address"

    elif ioc_type == "Domain":
        # Remove protocol or port if mistakenly pasted
        norm = cleaned.lower()
        if "://" in norm:
            parsed = urlparse(norm)
            norm = parsed.netloc or parsed.path
        norm = norm.split(":")[0].strip().rstrip("/")
        if DOMAIN_REGEX.match(norm):
            return True, norm, ""
        return False, "", f"'{raw_value}' is not a valid Domain name"

    elif ioc_type == "URL":
        norm = cleaned
        if not (norm.startswith("http://") or norm.startswith("https://")):
            norm = "http://" + norm
        parsed = urlparse(norm)
        if parsed.scheme in ["http", "https"] and parsed.netloc:
            # Reconstruct clean URL
            return True, norm, ""
        return False, "", f"'{raw_value}' is not a valid URL"

    elif ioc_type == "MD5":
        norm = cleaned.lower()
        if MD5_REGEX.match(norm):
            return True, norm, ""
        return False, "", f"'{raw_value}' is not a valid 32-character hexadecimal MD5 hash"

    elif ioc_type == "SHA1":
        norm = cleaned.lower()
        if SHA1_REGEX.match(norm):
            return True, norm, ""
        return False, "", f"'{raw_value}' is not a valid 40-character hexadecimal SHA1 hash"

    elif ioc_type == "SHA256":
        norm = cleaned.lower()
        if SHA256_REGEX.match(norm):
            return True, norm, ""
        return False, "", f"'{raw_value}' is not a valid 64-character hexadecimal SHA256 hash"

    return False, "", "Unknown validation error"

