def test_create_and_duplicate_ioc(client):
    payload = {
        "ioc_type": "IPv4",
        "value": "198.51.100.44",
        "description": "Observed C2 IP",
    }
    # First create
    res1 = client.post("/api/iocs", json=payload)
    assert res1.status_code == 201
    data1 = res1.json()
    assert data1["normalized_value"] == "198.51.100.44"

    # Second create with same value (even with defanging) should fail with 409 Conflict
    dup_payload = {
        "ioc_type": "IPv4",
        "value": "198.51.100[.]44",
        "description": "Defanged duplicate attempt",
    }
    res2 = client.post("/api/iocs", json=dup_payload)
    assert res2.status_code == 409
    assert "Duplicate IOC" in res2.json()["detail"]


def test_invalid_ioc_format_rejected(client):
    payload = {
        "ioc_type": "MD5",
        "value": "invalid_not_hex_or_short",
    }
    res = client.post("/api/iocs", json=payload)
    assert res.status_code == 400
    assert "Validation Failed" in res.json()["detail"]


def test_list_and_search_ioc(client):
    client.post("/api/iocs", json={
        "ioc_type": "Domain",
        "value": "bad-malware-server.com",
        "description": "Malware distribution domain",
    })
    client.post("/api/iocs", json={
        "ioc_type": "SHA256",
        "value": "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        "description": "Clean sha256",
    })

    # Search keyword
    res = client.get("/api/iocs?q=bad-malware")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["normalized_value"] == "bad-malware-server.com"

    # Filter by type
    res_type = client.get("/api/iocs?ioc_type=SHA256")
    assert res_type.status_code == 200
    assert len(res_type.json()) == 1
    assert res_type.json()[0]["ioc_type"] == "SHA256"


def test_update_and_delete_ioc(client):
    res = client.post("/api/iocs", json={
        "ioc_type": "Domain",
        "value": "temporary-ioc.org",
        "description": "To be removed",
    })
    ioc_id = res.json()["id"]

    # Update description
    up_res = client.put(f"/api/iocs/{ioc_id}", json={
        "description": "Updated analyst note",
    })
    assert up_res.status_code == 200
    assert up_res.json()["description"] == "Updated analyst note"

    # Delete
    del_res = client.delete(f"/api/iocs/{ioc_id}")
    assert del_res.status_code == 200

    not_found = client.get(f"/api/iocs/{ioc_id}")
    assert not_found.status_code == 404


def test_bulk_create_and_export_iocs(client):
    bulk_payload = {
        "items": [
            {"ioc_type": "IPv4", "value": "198.51.100.1", "description": "Bulk IP 1"},
            {"ioc_type": "IPv4", "value": "198.51.100[.]1", "description": "Duplicate IP"},
            {"ioc_type": "Domain", "value": "bulk-c2[.]net", "description": "Bulk Domain"},
            {"ioc_type": "IPv4", "value": "invalid.ip.string", "description": "Bad IP"},
        ]
    }
    res = client.post("/api/iocs/bulk", json=bulk_payload)
    assert res.status_code == 201
    data = res.json()
    assert data["total_submitted"] == 4
    assert data["created_count"] == 2
    assert data["duplicate_count"] == 1
    assert data["invalid_count"] == 1

    # Test CSV Export
    csv_res = client.get("/api/iocs/export?format=csv")
    assert csv_res.status_code == 200
    assert "Normalized Value" in csv_res.text
    assert "bulk-c2.net" in csv_res.text

    # Test TXT Export
    txt_res = client.get("/api/iocs/export?format=txt")
    assert txt_res.status_code == 200
    assert "198.51.100.1" in txt_res.text


