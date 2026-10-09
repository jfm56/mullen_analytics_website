from app.phi_guard import is_phi_write


def test_phi_guard_blocks_known_clinical_mutations():
    assert is_phi_write("POST", "/api/data/upload")
    assert is_phi_write("DELETE", "/api/agencies/a/files/b")
    assert is_phi_write("POST", "/api/v1/agencies/a/emscharts/sync")
    assert is_phi_write("PATCH", "/api/v1/agencies/a/qa/reviews/r")
    assert is_phi_write("POST", "/api/qa/agencies/a/imports")
    assert is_phi_write("PATCH", "/api/qa/agencies/a/flags/f")
    assert is_phi_write("POST", "/api/projects/p/generate-report")


def test_phi_guard_keeps_health_auth_and_reads_available():
    assert not is_phi_write("GET", "/api/data/uploads")
    assert not is_phi_write("POST", "/api/auth/login")
    assert not is_phi_write("GET", "/health")
    assert not is_phi_write("PATCH", "/api/v1/platform/users/u")
    assert not is_phi_write("POST", "/api/qa-example")
    assert not is_phi_write("POST", "/api/projects/")
