def test_empty_dashboard_stats(client):
    res = client.get("/api/dashboard/stats")
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_cases"] == 0
    assert stats["total_iocs"] == 0
    assert len(stats["recent_cases"]) == 0
    assert len(stats["recent_iocs"]) == 0
    assert stats["cases_by_category"]["Malware"] == 0
    assert stats["iocs_by_type"]["IPv4"] == 0


def test_populated_dashboard_stats(client):
    # Add cases
    client.post("/api/cases", json={
        "case_id": "CASE-DASH-1",
        "title": "Case 1",
        "category": "Ransomware",
        "severity": "Critical",
    })
    client.post("/api/cases", json={
        "case_id": "CASE-DASH-2",
        "title": "Case 2",
        "category": "Phishing",
        "severity": "High",
    })
    client.post("/api/cases", json={
        "case_id": "CASE-DASH-3",
        "title": "Case 3",
        "category": "Malware",
        "severity": "Medium",
    })

    # Add IOCs
    client.post("/api/iocs", json={
        "ioc_type": "IPv4",
        "value": "1.1.1.1",
    })
    client.post("/api/iocs", json={
        "ioc_type": "Domain",
        "value": "example-c2.com",
    })

    res = client.get("/api/dashboard/stats")
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_cases"] == 3
    assert stats["total_iocs"] == 2
    assert stats["cases_by_category"]["Ransomware"] == 1
    assert stats["cases_by_category"]["Phishing"] == 1
    assert stats["cases_by_category"]["Malware"] == 1
    assert stats["cases_by_severity"]["Critical"] == 1
    assert stats["cases_by_severity"]["High"] == 1
    assert stats["iocs_by_type"]["IPv4"] == 1
    assert stats["iocs_by_type"]["Domain"] == 1
    assert len(stats["recent_cases"]) == 3
    assert len(stats["recent_iocs"]) == 2
