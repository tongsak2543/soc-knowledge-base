#!/usr/bin/env python3
"""
Wazuh Direct Integrator Script (No CDB - Real-Time API)
File path on Wazuh Manager: /var/ossec/integrations/custom-cti
Permissions:
  chmod 750 /var/ossec/integrations/custom-cti
  chown root:wazuh /var/ossec/integrations/custom-cti
"""
import sys
import json
import urllib.request
import socket

# Wazuh Integratord passes arguments:
# sys.argv[1] = alert file path (temporary JSON alert file created by Wazuh)
# sys.argv[2] = user (if specified)
# sys.argv[3] = hook_url (from ossec.conf <hook_url>)
if len(sys.argv) < 2:
    sys.exit(1)

alert_file = sys.argv[1]
hook_url = sys.argv[3] if len(sys.argv) > 3 else "http://127.0.0.1:8000/api/wazuh/webhook/alert"

try:
    with open(alert_file, "r") as f:
        alert = json.load(f)

    # 1. Post raw alert to CTI API in real-time
    req = urllib.request.Request(
        hook_url,
        data=json.dumps(alert).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "Wazuh-Integrator"},
    )
    with urllib.request.urlopen(req, timeout=4) as response:
        result = json.loads(response.read().decode("utf-8"))

        # 2. If threat matches (Cobalt Strike, Coinminer, Malicious IP, Hashes, Domains)
        if result.get("matched"):
            threats = result.get("threats", [])
            primary_threat = threats[0] if threats else {}

            enriched_event = {
                "cti_match": "true",
                "alert_id": alert.get("id"),
                "timestamp": alert.get("timestamp"),
                "agent_id": alert.get("agent", {}).get("id"),
                "agent_name": alert.get("agent", {}).get("name"),
                "agent_ip": alert.get("agent", {}).get("ip"),
                "threat_category": primary_threat.get("threat_category", "Malicious Threat"),
                "threat_value": primary_threat.get("value"),
                "threat_context": primary_threat.get("threat_context"),
                "action_recommended": primary_threat.get("action", "BLOCK"),
                "severity": primary_threat.get("severity", "CRITICAL"),
                "original_rule": alert.get("rule", {}).get("description"),
                "all_matches": threats,
            }

            # Write directly to CTI alert log for Wazuh to ingest
            log_path = "/var/ossec/logs/cti-alerts.log"
            with open(log_path, "a") as log_f:
                log_f.write(json.dumps(enriched_event) + "\n")

            print(f"[CTI HIT] Threat detected on host {enriched_event.get('agent_name')}: {primary_threat.get('threat_category')} ({primary_threat.get('value')})")

except Exception as e:
    print(f"[CTI ERROR] Failed to query CTI API: {e}", file=sys.stderr)

