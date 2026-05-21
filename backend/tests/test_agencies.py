"""Integration tests for agency management endpoints."""
import pytest


def test_create_agency(auth_client):
    client, user = auth_client
    res = client.post("/api/agencies", json={
        "agency_name": "Test Fire Department",
        "agency_type": "fire",
        "state": "TX",
        "contact_email": "chief@testfire.gov",
        "subscription_tier": "essential",
    })
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["agency_name"] == "Test Fire Department"
    assert data["slug"] == "test-fire-department"
    assert data["subscription_tier"] == "essential"
    assert data["status"] == "active"


def test_create_agency_duplicate_slug(auth_client):
    client, _ = auth_client
    payload = {"agency_name": "Slug Collision EMS", "subscription_tier": "essential"}
    r1 = client.post("/api/agencies", json=payload)
    r2 = client.post("/api/agencies", json=payload)
    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["slug"] != r2.json()["slug"]


def test_get_my_agencies(auth_client):
    client, _ = auth_client
    client.post("/api/agencies", json={"agency_name": "My Agency", "subscription_tier": "essential"})
    res = client.get("/api/agencies/me")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
    assert len(res.json()) >= 1


def test_get_agency_by_id(auth_client):
    client, _ = auth_client
    created = client.post("/api/agencies", json={"agency_name": "Get By ID EMS", "subscription_tier": "operational"})
    assert created.status_code == 201
    agency_id = created.json()["id"]

    res = client.get(f"/api/agencies/{agency_id}")
    assert res.status_code == 200
    assert res.json()["id"] == agency_id


def test_get_agency_not_found(auth_client):
    client, _ = auth_client
    res = client.get("/api/agencies/00000000-0000-0000-0000-000000000000")
    assert res.status_code == 404


def test_update_agency(auth_client):
    client, _ = auth_client
    created = client.post("/api/agencies", json={"agency_name": "Update Test EMS", "subscription_tier": "essential"})
    agency_id = created.json()["id"]

    res = client.patch(f"/api/agencies/{agency_id}", json={"contact_name": "Jane Chief"})
    assert res.status_code == 200
    assert res.json()["contact_name"] == "Jane Chief"


def test_list_agencies_admin(auth_client):
    client, _ = auth_client
    res = client.get("/api/agencies")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_list_members(auth_client):
    client, user = auth_client
    created = client.post("/api/agencies", json={"agency_name": "Member Test EMS", "subscription_tier": "essential"})
    agency_id = created.json()["id"]

    res = client.get(f"/api/agencies/{agency_id}/members")
    assert res.status_code == 200
    members = res.json()
    assert any(m["user_id"] == user["id"] and m["role"] == "owner" for m in members)


def test_unauthenticated_cannot_create(client):
    res = client.post("/api/agencies", json={"agency_name": "Unauth EMS", "subscription_tier": "essential"})
    assert res.status_code == 401
