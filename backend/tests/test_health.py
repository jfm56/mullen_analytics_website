"""Basic smoke tests — no DB required."""


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_readiness(client):
    res = client.get("/ready")
    assert res.status_code == 200
    assert res.json()["status"] == "ready"


def test_root(client):
    res = client.get("/")
    assert res.status_code == 200
    assert "Mullen Analytics" in res.json()["message"]


def test_unauthenticated_session(client):
    res = client.get("/api/auth/session")
    assert res.status_code == 200
    assert res.json()["authenticated"] is False


def test_unauthenticated_agencies(client):
    res = client.get("/api/agencies/me")
    assert res.status_code == 401
