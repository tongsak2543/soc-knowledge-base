from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.case import Case
from app.models.ioc import IOC
from app.services.validator import validate_and_normalize_ioc

DEMO_CASES = [
    {
        "case_id": "CASE-2024-001",
        "title": "[DEMO] Akira Ransomware Infection via VPN Credential Stuffing",
        "summary": "Threat actor gained initial access via compromised SonicWall VPN account without MFA, performed lateral movement, dumped LSASS credentials, and executed Akira ransomware on internal hypervisors.",
        "category": "Ransomware",
        "severity": "Critical",
        "status": "Resolved",
        "investigation_findings": (
            "- Multiple failed VPN authentication attempts recorded at 02:14 UTC, followed by successful logon from an untrusted foreign IP.\n"
            "- Host WIN-SRV04 logged process creation event for rundll32.exe executing comsvcs.dll to dump LSASS process memory.\n"
            "- Shadow copies deleted via vssadmin.exe delete shadows /all /quiet.\n"
            "- Ransomware binary dropped in C:\\Windows\\Temp\\akira.exe and executed via PowerShell scheduled task."
        ),
        "observed_behavior": (
            "Adversary executed Living-off-the-Land (LotL) commands: 'net user', 'nltest /dclist', and 'arp -a' for internal network discovery. "
            "Disabled Windows Defender via PowerShell Set-MpPreference -DisableRealtimeMonitoring $true. "
            "Encrypted files with extension '.akira' and generated ransom note 'akira_readme.txt'."
        ),
        "investigation_method": (
            "1. VPN gateway radius authentication logs analysis.\n"
            "2. Windows Event Logs inspection (Event IDs 4624, 4672, 7045).\n"
            "3. Sysmon process tracking analysis (Event ID 1 process creation, Event ID 10 process access).\n"
            "4. File carving and memory image analysis using Volatility 3."
        ),
        "root_cause": (
            "Compromised service account credentials reused across external VPN portal that lacked Multi-Factor Authentication (MFA)."
        ),
        "remediation": (
            "- Immediately revoked compromised account credentials and isolated host WIN-SRV04.\n"
            "- Enforced mandatory hardware/software MFA on all external gateway access.\n"
            "- Blocked adversarial C2 IPs and staging domains at perimeter firewall.\n"
            "- Restored encrypted Virtual Machines from immutable offline backups."
        ),
        "conclusion": (
            "Incident contained within 4 hours. No corporate intellectual property was confirmed exfiltrated prior to encryption. "
            "MFA enforcement successfully eliminated the root vector."
        ),
        "tags": "akira, ransomware, vpn-abuse, credential-stuffing, lsass-dump",
        "days_ago": 2,
        "iocs": [
            {
                "ioc_type": "IPv4",
                "value": "185.220.101.45",
                "description": "Attacker VPN source IP & C2 staging proxy",
            },
            {
                "ioc_type": "Domain",
                "value": "akira-cloud-portal.top",
                "description": "Ransom payment negotiation leak portal",
            },
            {
                "ioc_type": "SHA256",
                "value": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                "description": "Akira ransomware encryptor payload executable",
            },
            {
                "ioc_type": "MD5",
                "value": "d41d8cd98f00b204e9800998ecf8427e",
                "description": "Akira privilege escalation dropper script",
            },
        ],
    },
    {
        "case_id": "CASE-2024-002",
        "title": "[DEMO] Executive Phishing Leading to Session Hijacking & Business Email Compromise",
        "summary": "Targeted Adversary-in-the-Middle (AiTM) phishing campaign intercepted Microsoft 365 session cookies, bypassing FIDO2/SMS MFA and creating malicious mail forwarding rules.",
        "category": "Phishing",
        "severity": "High",
        "status": "Resolved",
        "investigation_findings": (
            "- Chief Financial Officer clicked phishing link disguised as an urgent DocuSign invoice.\n"
            "- Evilginx reverse proxy server captured valid ESTSAUTH and ESTSAUTHPERSISTENT session cookies.\n"
            "- Attacker logged into Exchange Online from an AWS residential proxy without triggering conditional access MFA.\n"
            "- Malicious inbox forwarding rule created to automatically redirect vendor payment invoices to external mailbox."
        ),
        "observed_behavior": (
            "Created inbox rule 'MoveToArchive' forwarding emails matching keywords 'invoice', 'wire', 'transfer' to attacker mailbox. "
            "Sent fraudulent payment instructions to active supply chain partner requesting ACH account change."
        ),
        "investigation_method": (
            "1. Microsoft 365 Unified Audit Log (UAL) search for New-InboxRule and Set-Mailbox.\n"
            "2. Entra ID Sign-in logs analysis matching session tokens across disparate geographic locations.\n"
            "3. Message trace analysis across perimeter secure email gateway."
        ),
        "root_cause": (
            "Adversary-in-the-Middle (AiTM) phishing proxy that relayed real-time MFA challenges, allowing session cookie theft."
        ),
        "remediation": (
            "- Revoked all active user refresh and session tokens via Revoke-AzureADUserAllRefreshToken.\n"
            "- Deleted rogue inbox rule and verified message trace.\n"
            "- Upgraded CFO and finance personnel to FIDO2 WebAuthn / conditional access token protection.\n"
            "- Alerted recipient bank of the fraudulent wire attempt."
        ),
        "conclusion": (
            "Fraudulent transaction intercepted before fund settlement. System re-secured and FIDO2 policy rolled out to high-risk staff."
        ),
        "tags": "aitm, phishing, session-hijacking, bec, evilginx, o365",
        "days_ago": 5,
        "iocs": [
            {
                "ioc_type": "Domain",
                "value": "login-microsoftonline-verify.com",
                "description": "Evilginx AiTM reverse proxy domain",
            },
            {
                "ioc_type": "URL",
                "value": "https://login-microsoftonline-verify.com/common/oauth2/authorize",
                "description": "Phishing lure destination URL",
            },
            {
                "ioc_type": "IPv4",
                "value": "91.215.85.17",
                "description": "Attacker proxy IP address used for M365 session access",
            },
        ],
    },
    {
        "case_id": "CASE-2024-003",
        "title": "[DEMO] WebShell Backdoor Injection via Ivanti Connect Secure Zero-Day",
        "summary": "Adversary chained authentication bypass and command injection flaws in edge VPN appliance to drop persistent GLASSTOKEN webshells in web root directory.",
        "category": "Vulnerability Exploitation",
        "severity": "Critical",
        "status": "Closed",
        "investigation_findings": (
            "- Edge appliance received crafted HTTP requests to /api/v1/cav/client/status bypassing authentication.\n"
            "- Malicious Python script executed via command injection modifying /home/venv3/lib/python3.6/site-packages/.\n"
            "- GLASSTOKEN webshell deployed into appliance web root allowing arbitrary base64 payload execution."
        ),
        "observed_behavior": (
            "Adversary disabled system integrity checking tools, dumped appliance configuration cache containing LDAP bind credentials, "
            "and established encrypted reverse HTTPS tunnel to command-and-control server."
        ),
        "investigation_method": (
            "1. Ivanti External Integrity Checker Tool (ICT) scan execution.\n"
            "2. NetFlow / firewall outbound connection volume inspection.\n"
            "3. Decrypted TLS traffic analysis of /api/v1 endpoints."
        ),
        "root_cause": (
            "Zero-day vulnerability chain (CVE-2023-46805 & CVE-2024-21887) in edge VPN firmware."
        ),
        "remediation": (
            "- Applied Ivanti emergency mitigation XML and subsequently patched to latest firmware build.\n"
            "- Rotated all internal Active Directory service accounts and internal certificates stored on appliance.\n"
            "- Quarantined appliance and performed full clean reinstall from verified ISO."
        ),
        "conclusion": (
            "Appliance sanitization completed. Perimeter monitoring confirmed no further lateral progression."
        ),
        "tags": "zero-day, ivanti, webshell, cve-2024-21887, command-injection",
        "days_ago": 9,
        "iocs": [
            {
                "ioc_type": "IPv4",
                "value": "206.189.15.22",
                "description": "Adversary exploitation staging node",
            },
            {
                "ioc_type": "SHA256",
                "value": "a591a6d40bf420404a011733cf7112a32c0286644252f20e4b85c3db0834bf5f",
                "description": "GLASSTOKEN webshell script hash",
            },
            {
                "ioc_type": "Domain",
                "value": "symantec-security-telemetry.net",
                "description": "Masquerading C2 domain used for exfiltration",
            },
        ],
    },
    {
        "case_id": "CASE-2024-004",
        "title": "[DEMO] Lumma Stealer Distribution via Compromised Discord CDN",
        "summary": "Marketing contractor workstation infected with Lumma Stealer malware disguised as a software utility, leading to browser session token theft.",
        "category": "Malware",
        "severity": "High",
        "status": "Resolved",
        "investigation_findings": (
            "- User downloaded an executable bundle from Discord CDN link found on developer forum.\n"
            "- Malware executed and injected shellcode into legitimate Windows process explorer.exe.\n"
            "- Browser SQLite databases for Chrome and Edge queried for cookies, saved logins, and crypto wallet extensions."
        ),
        "observed_behavior": (
            "Process injection via VirtualAllocEx and WriteProcessMemory into explorer.exe. "
            "Exfiltration of zipped credential vault via HTTP POST to fast-flux domains."
        ),
        "investigation_method": (
            "1. EDR timeline analysis of process lineage.\n"
            "2. Network proxy traffic inspection identifying fast-flux DNS queries.\n"
            "3. Memory dump analysis of infected workstation."
        ),
        "root_cause": (
            "Execution of untrusted binary by employee bypassing local policies."
        ),
        "remediation": (
            "- Host isolated and reimaged.\n"
            "- Reset all corporate passwords and invalidated browser sessions.\n"
            "- Blocked Discord CDN attachment executable downloads at web proxy."
        ),
        "conclusion": (
            "Credentials rotated before attacker could exploit session tokens. Endpoint AppLocker rules tightened."
        ),
        "tags": "lumma, infostealer, memory-injection, discord-abuse",
        "days_ago": 12,
        "iocs": [
            {
                "ioc_type": "URL",
                "value": "https://cdn.discordapp.com/attachments/1190283471/crack_patcher.zip",
                "description": "Malicious payload download URL",
            },
            {
                "ioc_type": "Domain",
                "value": "fastflux-update-dns.cc",
                "description": "Lumma C2 panel domain",
            },
            {
                "ioc_type": "SHA256",
                "value": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                "description": "Lumma Stealer unpacked payload DLL",
            },
        ],
    },
    {
        "case_id": "CASE-2026-001",
        "title": "[DEMO] PHP2Shell Core RCE (CVE-2026-109618 / CVE-2026-109619) & WebShell Infiltration",
        "summary": "Adversary targeted public web tier exploiting unauthenticated core PHP use-after-free and multipart session upload progress vulnerabilities to spawn persistent reverse shells and drop secondary staging tools.",
        "category": "Zero-Day Exploit",
        "severity": "Critical",
        "status": "Contained",
        "investigation_findings": (
            "- High-volume malformed multipart/form-data POST requests observed targeting PHP-FPM workers.\n"
            "- Exploitation triggered memory exhaustion and Use-After-Free (UAF) condition before userland application authentication.\n"
            "- Web worker www-data spawned unexpected child process /bin/sh connecting to external C2.\n"
            "- Staged payload dropped at /tmp/nfs-setup and persistent backdoor injected into session storage."
        ),
        "observed_behavior": (
            "Attacker abused session.upload_progress to poison session files with serialized payload. "
            "Spawned interactive reverse shell to 92.118.112.100. "
            "Downloaded secondary payload from hxxp://92.118.112[.]100/nfs-setup and attempted privilege escalation."
        ),
        "investigation_method": (
            "1. Web server error logs analysis showing repetitive PHP Fatal error: Out of memory and SIGSEGV worker crashes.\n"
            "2. Sysmon for Linux / Auditd event logs inspection showing nginx/php-fpm spawning /bin/sh.\n"
            "3. Deep inspection of /var/lib/php/sessions/ for corrupted serialized objects and injected shellcode.\n"
            "4. Network packet analysis identifying multipart/form-data headers abusing session upload progress."
        ),
        "root_cause": (
            "Unpatched PHP core runtime vulnerable to unauthenticated Use-After-Free (CVE-2026-109618) and memory cleanup flaws (CVE-2026-109619)."
        ),
        "remediation": (
            "- Immediately upgraded PHP core runtime to patched releases (PHP 8.5.12, 8.4.27, 8.3.36, 8.2.35).\n"
            "- Killed all compromised PHP-FPM worker processes and flushed session directory /var/lib/php/sessions/.\n"
            "- Applied WAF virtual patching rules to inspect anomalous multipart POST boundaries.\n"
            "- Blocked all known PHP2Shell scanner IPs and staging domains across perimeter firewalls."
        ),
        "conclusion": (
            "Host isolated and sanitized within 45 minutes of initial beaconing. PHP runtime patched and WAF rules enforced."
        ),
        "tags": "php2shell, cve-2026-109618, cve-2026-109619, webshell, reverse-shell, rce, session-upload-progress",
        "days_ago": 1,
        "iocs": [
            {
                "ioc_type": "IPv4",
                "value": "92.118.112.100",
                "description": "PHP2Shell exploit scanner & nfs-setup payload dropper",
            },
            {
                "ioc_type": "IPv4",
                "value": "194.26.192.83",
                "description": "Active mass scanner attempting PHP2Shell UAF memory disclosure",
            },
            {
                "ioc_type": "Domain",
                "value": "botlesscucks.st",
                "description": "PHP2Shell C2 & scanner orchestration domain",
            },
            {
                "ioc_type": "Domain",
                "value": "checkphp2shell.com",
                "description": "Adversary verification infrastructure for vulnerable PHP targets",
            },
            {
                "ioc_type": "SHA256",
                "value": "e2529d4afa39ae4db2eb05d5176317c906289abf09660c75bdeec43e54c55aa3",
                "description": "PHP2Shell staged dropper payload",
            },
            {
                "ioc_type": "SHA256",
                "value": "0c5486f06620e26e316f4b33f318b0d646d5e1133789331aa2fed012360d1486",
                "description": "PHP2Shell reverse shell payload artifact",
            },
            {
                "ioc_type": "URL",
                "value": "http://92.118.112.100/nfs-setup",
                "description": "Active staging URL for secondary PHP2Shell payload",
            },
        ],
    },
]


def seed_demonstration_data(db: Session, force: bool = False) -> dict:
    """
    Populates SQLite database with realistic demonstration SOC investigation cases and IOCs.
    """
    existing_count = db.query(Case).count()
    if existing_count > 0 and not force:
        return {
            "status": "skipped",
            "message": f"Database already contains {existing_count} case records. Use force=True to re-seed.",
            "seeded_cases": 0,
            "seeded_iocs": 0,
        }

    now = datetime.now(timezone.utc)
    case_count = 0
    ioc_count = 0

    for item in DEMO_CASES:
        inc_date = now - timedelta(days=item.get("days_ago", 0))

        existing_case = db.query(Case).filter(Case.case_id == item["case_id"]).first()
        if existing_case:
            case_obj = existing_case
            case_obj.title = item["title"]
            case_obj.summary = item["summary"]
            case_obj.category = item["category"]
            case_obj.severity = item["severity"]
            case_obj.status = item["status"]
            case_obj.investigation_findings = item["investigation_findings"]
            case_obj.observed_behavior = item["observed_behavior"]
            case_obj.investigation_method = item["investigation_method"]
            case_obj.root_cause = item["root_cause"]
            case_obj.remediation = item["remediation"]
            case_obj.conclusion = item["conclusion"]
            case_obj.tags = item["tags"]
            case_obj.incident_date = inc_date
        else:
            case_obj = Case(
                case_id=item["case_id"],
                title=item["title"],
                summary=item["summary"],
                category=item["category"],
                severity=item["severity"],
                status=item["status"],
                investigation_findings=item["investigation_findings"],
                observed_behavior=item["observed_behavior"],
                investigation_method=item["investigation_method"],
                root_cause=item["root_cause"],
                remediation=item["remediation"],
                conclusion=item["conclusion"],
                tags=item["tags"],
                incident_date=inc_date,
            )
            db.add(case_obj)

        for ioc_data in item.get("iocs", []):
            is_valid, norm_val, _ = validate_and_normalize_ioc(
                ioc_data["ioc_type"], ioc_data["value"]
            )
            if not is_valid:
                continue

            existing_ioc = (
                db.query(IOC)
                .filter(
                    IOC.ioc_type == ioc_data["ioc_type"],
                    IOC.normalized_value == norm_val,
                )
                .first()
            )

            if not existing_ioc:
                existing_ioc = IOC(
                    ioc_type=ioc_data["ioc_type"],
                    value=ioc_data["value"].strip(),
                    normalized_value=norm_val,
                    description=ioc_data["description"],
                )
                db.add(existing_ioc)
                db.flush()
                ioc_count += 1

            if existing_ioc not in case_obj.iocs:
                case_obj.iocs.append(existing_ioc)

        case_count += 1

    db.commit()
    return {
        "status": "success",
        "message": f"Successfully seeded {case_count} SOC investigation cases and {ioc_count} IOC records.",
        "seeded_cases": case_count,
        "seeded_iocs": ioc_count,
    }
