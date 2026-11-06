def test_create_and_get_case(client):
    payload = {
        "case_id": "CASE-2024-TEST1",
        "title": "Unauthorized Lateral Movement via WMI",
        "summary": "Attacker used compromised admin account to execute remote processes.",
        "category": "Unauthorized Access",
        "severity": "High",
        "status": "In Progress",
        "investigation_findings": "Observed wmic.exe process call creating cmd.exe on remote workstation.",
        "observed_behavior": "Lateral movement across VLAN 10.",
        "investigation_method": "Sysmon Event ID 1 analysis and network PCAP.",
        "root_cause": "Weak local administrator password reused across endpoints.",
        "remediation": "Disabled local admin account and pushed LAPS.",
        "conclusion": "Incident isolated before data exfiltration.",
        "tags": "wmi, lateral-movement, laps",
    }
    res = client.post("/api/cases", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["case_id"] == "CASE-2024-TEST1"
    assert data["title"] == payload["title"]
    assert data["status"] == "In Progress"

    case_id = data["id"]
    get_res = client.get(f"/api/cases/{case_id}")
    assert get_res.status_code == 200
    assert get_res.json()["root_cause"] == payload["root_cause"]


def test_duplicate_case_id_rejected(client):
    payload = {
        "case_id": "CASE-DUP-01",
        "title": "First Case",
        "category": "Malware",
        "severity": "Low",
    }
    res1 = client.post("/api/cases", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/cases", json=payload)
    assert res2.status_code == 409
    assert "Duplicate Case ID" in res2.json()["detail"]


def test_search_cases_by_findings_and_case_id(client):
    client.post("/api/cases", json={
        "case_id": "CASE-SEARCH-01",
        "title": "Phishing Incident Against HR",
        "category": "Phishing",
        "severity": "Medium",
        "investigation_findings": "Found malicious macro in resume.docm file.",
        "root_cause": "Email gateway attachment filter bypass.",
    })
    client.post("/api/cases", json={
        "case_id": "CASE-SEARCH-02",
        "title": "DDoS against web portal",
        "category": "Other",
        "severity": "Low",
    })

    # Search by case_id
    res_code = client.get("/api/cases?q=CASE-SEARCH-01")
    assert res_code.status_code == 200
    assert len(res_code.json()) == 1
    assert res_code.json()[0]["case_id"] == "CASE-SEARCH-01"

    # Search by findings keyword
    res_findings = client.get("/api/cases?q=resume.docm")
    assert res_findings.status_code == 200
    assert len(res_findings.json()) == 1
    assert res_findings.json()[0]["case_id"] == "CASE-SEARCH-01"

    # Filter by category
    res_cat = client.get("/api/cases?category=Phishing")
    assert res_cat.status_code == 200
    assert len(res_cat.json()) == 1


def test_case_ioc_relationships(client):
    case_res = client.post("/api/cases", json={
        "case_id": "CASE-REL-01",
        "title": "Cobalt Strike Beacon Detection",
        "category": "APT",
        "severity": "Critical",
    }).json()

    ioc_res = client.post("/api/iocs", json={
        "ioc_type": "IPv4",
        "value": "198.51.100.99",
        "description": "Cobalt Strike C2 IP",
    }).json()

    # Link IOC to Case
    link_res = client.post(f"/api/cases/{case_res['id']}/iocs/{ioc_res['id']}")
    assert link_res.status_code == 200
    assert len(link_res.json()["iocs"]) == 1
    assert link_res.json()["iocs"][0]["id"] == ioc_res["id"]

    # Verify IOC detail displays this case in history
    ioc_detail = client.get(f"/api/iocs/{ioc_res['id']}").json()
    assert len(ioc_detail["cases"]) == 1
    assert ioc_detail["cases"][0]["case_id"] == "CASE-REL-01"

    # Unlink
    unlink_res = client.delete(f"/api/cases/{case_res['id']}/iocs/{ioc_res['id']}")
    assert unlink_res.status_code == 200
    assert len(unlink_res.json()["iocs"]) == 0

