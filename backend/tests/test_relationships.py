def test_news_ioc_relationships(client):
    # 1. Create a News article
    news_res = client.post("/api/news", json={
        "title": "SolarWinds Supply Chain Incident",
        "content": "Backdoored Orion software updates distributed Sunburst DLL.",
        "category": "APT",
        "severity": "Critical",
    })
    news_id = news_res.json()["id"]

    # 2. Create an IOC
    ioc_res = client.post("/api/iocs", json={
        "ioc_type": "Domain",
        "value": "avsvmcloud.com",
        "description": "Sunburst DGA C2 domain",
    })
    ioc_id = ioc_res.json()["id"]

    # 3. Associate IOC to News
    link_res = client.post(f"/api/news/{news_id}/iocs/{ioc_id}")
    assert link_res.status_code == 200
    news_detail = link_res.json()
    assert len(news_detail["iocs"]) == 1
    assert news_detail["iocs"][0]["id"] == ioc_id

    # 4. Check that IOC detail also reflects the linked news
    ioc_detail = client.get(f"/api/iocs/{ioc_id}").json()
    assert len(ioc_detail["news"]) == 1
    assert ioc_detail["news"][0]["id"] == news_id

    # 5. Dissociate
    unlink_res = client.delete(f"/api/news/{news_id}/iocs/{ioc_id}")
    assert unlink_res.status_code == 200
    assert len(unlink_res.json()["iocs"]) == 0

    # 6. Check IOC detail has 0 news
    ioc_detail_after = client.get(f"/api/iocs/{ioc_id}").json()
    assert len(ioc_detail_after["news"]) == 0


def test_create_news_with_inline_and_existing_iocs(client):
    # Create an existing IOC first
    existing = client.post("/api/iocs", json={
        "ioc_type": "IPv4",
        "value": "203.0.113.5",
        "description": "Pre-existing scanner",
    }).json()

    # Create news with both existing ioc_ids and new_iocs
    news_res = client.post("/api/news", json={
        "title": "Campaign with Inline IOCs",
        "content": "Report with multiple indicators.",
        "category": "Malware",
        "severity": "High",
        "ioc_ids": [existing["id"]],
        "new_iocs": [
            {
                "ioc_type": "Domain",
                "value": "inline-threat-c2.net",
                "description": "Discovered inline",
            }
        ],
    })
    assert news_res.status_code == 201
    news_data = news_res.json()
    assert len(news_data["iocs"]) == 2

