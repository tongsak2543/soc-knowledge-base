def test_create_and_get_news(client):
    payload = {
        "title": "New Ransomware Variant Detected",
        "summary": "Detected active campaign targeting supply chains.",
        "content": "Full threat intelligence report content detailing the attack vector.",
        "source_name": "SOC Cyber Team",
        "source_url": "https://threatintel.example.com/reports/1",
        "category": "Ransomware",
        "severity": "Critical",
        "tags": "ransomware, supply-chain",
    }
    response = client.post("/api/news", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] > 0
    assert data["title"] == payload["title"]
    assert data["severity"] == "Critical"
    assert data["category"] == "Ransomware"

    news_id = data["id"]
    get_res = client.get(f"/api/news/{news_id}")
    assert get_res.status_code == 200
    assert get_res.json()["title"] == payload["title"]


def test_list_news_search_and_filter(client):
    # Insert multiple articles
    client.post("/api/news", json={
        "title": "Phishing Campaign Targets Executives",
        "content": "Credential harvesting attack using deceptive portals.",
        "category": "Phishing",
        "severity": "High",
    })
    client.post("/api/news", json={
        "title": "Critical RCE Vulnerability in OpenSSL",
        "content": "Remote code execution flaw requires immediate mitigation.",
        "category": "Vulnerability",
        "severity": "Critical",
    })

    # Search keyword
    res = client.get("/api/news?q=OpenSSL")
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 1
    assert "OpenSSL" in items[0]["title"]

    # Filter by category
    res = client.get("/api/news?category=Phishing")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["category"] == "Phishing"

    # Filter by severity
    res = client.get("/api/news?severity=Critical")
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_update_and_delete_news(client):
    res = client.post("/api/news", json={
        "title": "Temporary News",
        "content": "Will be deleted.",
        "category": "Other",
        "severity": "Low",
    })
    news_id = res.json()["id"]

    # Update
    up_res = client.put(f"/api/news/{news_id}", json={
        "title": "Updated News Headline",
        "severity": "Medium",
    })
    assert up_res.status_code == 200
    assert up_res.json()["title"] == "Updated News Headline"
    assert up_res.json()["severity"] == "Medium"

    # Delete
    del_res = client.delete(f"/api/news/{news_id}")
    assert del_res.status_code == 200

    # Ensure 404 after delete
    not_found = client.get(f"/api/news/{news_id}")
    assert not_found.status_code == 404

