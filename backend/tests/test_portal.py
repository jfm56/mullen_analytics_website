"""
Portal security tests — verifies all spec requirements:
1. Admin can create a client user
2. Client cannot access another client's documents
3. Client cannot access another client's invoices
4. Admin can upload documents
5. Client can download only their own documents
6. Invoice creation works
7. Payment link field is stored but no banking/card data is stored
"""

import io
import os
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import get_db, Base
from app.services.auth import create_user_with_profile, hash_password
from app.models.user import User, Profile
from app.models.invoice import Invoice
from app.models.document import Document

# ---------------------------------------------------------------------------
# Test database setup (separate DB from production)
# ---------------------------------------------------------------------------

TEST_DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/mullen_analytics_test",
)

test_engine = create_engine(TEST_DB_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    yield


@pytest.fixture(scope="module")
def db():
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def client():
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app, raise_server_exceptions=True)
    app.dependency_overrides.pop(get_db, None)


# ---------------------------------------------------------------------------
# Helpers: create users and log in
# ---------------------------------------------------------------------------

def make_admin(db, suffix="a"):
    email = f"admin_{suffix}_{uuid.uuid4().hex[:6]}@test.com"
    user = create_user_with_profile(db, email=email, password="Admin123!", role="admin")
    return user, email


def make_client(db, suffix="c"):
    email = f"client_{suffix}_{uuid.uuid4().hex[:6]}@test.com"
    user = create_user_with_profile(db, email=email, password="Client123!", role="client")
    return user, email


def login(http_client, email, password="Admin123!"):
    resp = http_client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return http_client  # cookies are stored on the TestClient


def logout(http_client):
    http_client.post("/api/auth/logout")


# ---------------------------------------------------------------------------
# 1. Admin can create a client user
# ---------------------------------------------------------------------------

def test_admin_can_create_client(client, db):
    admin_user, admin_email = make_admin(db, "create")
    login(client, admin_email)

    new_email = f"newclient_{uuid.uuid4().hex[:6]}@test.com"
    resp = client.post("/api/users/", json={
        "email": new_email,
        "password": "Secure123!",
        "full_name": "Test Client",
        "role": "client",
    })
    assert resp.status_code in (200, 201), f"Expected 2xx, got {resp.status_code}: {resp.text}"

    logout(client)


# ---------------------------------------------------------------------------
# 2. Client cannot access another client's documents
# ---------------------------------------------------------------------------

def test_client_cannot_access_other_clients_documents(client, db):
    _, admin_email = make_admin(db, "doc_iso")
    client_a, email_a = make_client(db, "doc_a")
    client_b, email_b = make_client(db, "doc_b")

    doc = Document(
        client_id=client_a.id,
        uploaded_by=client_a.id,
        title="Secret Report",
        original_filename="secret.pdf",
        storage_path="/fake/path/secret.pdf",
        visibility="client_visible",
        size_bytes=0,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    login(client, email_b, "Client123!")
    resp = client.get(f"/api/documents/{doc.id}/download")
    assert resp.status_code in (403, 404), (
        f"Client B should not access Client A's document. Got: {resp.status_code}"
    )
    logout(client)


# ---------------------------------------------------------------------------
# 3. Client cannot access another client's invoices
# ---------------------------------------------------------------------------

def test_client_cannot_access_other_clients_invoices(client, db):
    client_a, email_a = make_client(db, "inv_a")
    client_b, email_b = make_client(db, "inv_b")

    invoice = Invoice(
        client_id=client_a.id,
        number="INV-001",
        description="Q1 Analytics",
        amount_due=100000,
        currency="USD",
        status="sent",
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    login(client, email_b, "Client123!")
    resp = client.get(f"/api/invoices/{invoice.id}")
    assert resp.status_code in (403, 404), (
        f"Client B should not see Client A's invoice. Got: {resp.status_code}"
    )
    logout(client)


# ---------------------------------------------------------------------------
# 4. Admin can upload documents
# ---------------------------------------------------------------------------

def test_admin_can_upload_document(client, db, tmp_path):
    _, admin_email = make_admin(db, "upload")
    target_client, _ = make_client(db, "upload_target")

    login(client, admin_email)

    fake_file = io.BytesIO(b"%PDF-1.4 test content")
    resp = client.post(
        "/api/documents/upload",
        data={
            "client_id": str(target_client.id),
            "title": "Test Upload",
            "document_type": "deliverable",
            "visibility": "client_visible",
        },
        files={"file": ("test_report.pdf", fake_file, "application/pdf")},
    )
    assert resp.status_code in (200, 201), f"Upload failed: {resp.status_code}: {resp.text}"
    body = resp.json()
    assert body["original_filename"] == "test_report.pdf"
    assert body["client_id"] == str(target_client.id)
    logout(client)


# ---------------------------------------------------------------------------
# 5. Client can download only their own documents
# ---------------------------------------------------------------------------

def test_client_can_download_own_document(client, db, tmp_path):
    _, admin_email = make_admin(db, "dl_admin")
    target_client, client_email = make_client(db, "dl_client")

    test_file = tmp_path / "sample.pdf"
    test_file.write_bytes(b"%PDF-1.4 real content")

    doc = Document(
        client_id=target_client.id,
        uploaded_by=target_client.id,
        title="My Report",
        original_filename="sample.pdf",
        storage_path=str(test_file),
        visibility="client_visible",
        content_type="application/pdf",
        size_bytes=len(b"%PDF-1.4 real content"),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    login(client, client_email, "Client123!")
    resp = client.get(f"/api/documents/{doc.id}/download")
    assert resp.status_code == 200, f"Client should download own doc. Got: {resp.status_code}: {resp.text}"
    logout(client)


# ---------------------------------------------------------------------------
# 6. Invoice creation works
# ---------------------------------------------------------------------------

def test_admin_can_create_invoice(client, db):
    _, admin_email = make_admin(db, "inv_create")
    target_client, _ = make_client(db, "inv_target")

    login(client, admin_email)
    resp = client.post("/api/invoices/", json={
        "client_id": str(target_client.id),
        "number": "INV-2025-001",
        "description": "Analytics Platform Setup",
        "amount_due": 500000,
        "currency": "USD",
        "status": "pending",
    })
    assert resp.status_code in (200, 201), f"Invoice creation failed: {resp.text}"
    body = resp.json()
    assert body["amount_due"] == 500000
    assert body["status"] == "pending"
    logout(client)


# ---------------------------------------------------------------------------
# 7. Payment URL is stored but NO banking/card data is stored
# ---------------------------------------------------------------------------

def test_payment_link_stores_url_not_card_data(client, db):
    _, admin_email = make_admin(db, "pay_admin")
    target_client, _ = make_client(db, "pay_client")

    invoice = Invoice(
        client_id=target_client.id,
        number="INV-PAY-001",
        description="Payment test",
        amount_due=25000,
        currency="USD",
        status="pending",
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    fake_payment_url = "https://checkout.stripe.com/pay/cs_test_fake_session"
    invoice.hosted_invoice_url = fake_payment_url
    invoice.stripe_invoice_id = "cs_test_fake_session"
    invoice.type = "stripe"
    db.commit()
    db.refresh(invoice)

    # Confirm that the stored invoice record contains ONLY the URL — not card data
    stored = db.query(Invoice).filter(Invoice.id == invoice.id).first()
    assert stored.hosted_invoice_url == fake_payment_url
    assert stored.stripe_invoice_id == "cs_test_fake_session"

    # Confirm no card/banking columns exist on the model at all
    invoice_columns = [c.key for c in Invoice.__table__.columns]
    forbidden = {"card_number", "cvv", "routing_number", "account_number", "bank_account"}
    overlap = forbidden & set(invoice_columns)
    assert not overlap, f"Invoice model must never store: {overlap}"


# ---------------------------------------------------------------------------
# Projects feature tests
# ---------------------------------------------------------------------------

from app.models.project import Project


# 8. Admin can create a project for a client
def test_admin_can_create_project(client, db):
    _, admin_email = make_admin(db, "proj_create_admin")
    target_client, _ = make_client(db, "proj_create_client")

    login(client, admin_email)
    resp = client.post(f"/api/clients/{target_client.id}/projects", json={
        "name": "Q3 Analytics Rollout",
        "description": "Full pipeline build",
        "status": "PLANNING",
        "budget_cents": 500000,
    })
    assert resp.status_code in (200, 201), f"Admin project create failed: {resp.text}"
    body = resp.json()
    assert body["name"] == "Q3 Analytics Rollout"
    assert body["client_id"] == str(target_client.id)
    logout(client)


# 9. Client can view only their own projects
def test_client_can_view_own_projects(client, db):
    target_client, client_email = make_client(db, "proj_view_own")
    project = Project(
        client_id=target_client.id,
        name="Own Project",
        status="ACTIVE",
        phase="discovery",
    )
    db.add(project)
    db.commit()

    login(client, client_email, "Client123!")
    resp = client.get(f"/api/clients/{target_client.id}/projects")
    assert resp.status_code == 200, f"Client should see own projects: {resp.text}"
    names = [p["name"] for p in resp.json()]
    assert "Own Project" in names
    logout(client)


# 10. Client cannot access another client's project via /clients/{id}/projects
def test_client_cannot_access_other_clients_projects(client, db):
    client_a, _ = make_client(db, "proj_iso_a")
    client_b, email_b = make_client(db, "proj_iso_b")

    login(client, email_b, "Client123!")
    resp = client.get(f"/api/clients/{client_a.id}/projects")
    assert resp.status_code == 403, f"Client B should not see Client A's projects. Got: {resp.status_code}"
    logout(client)


# 11. Documents can be linked to a project
def test_documents_linked_to_project(client, db, tmp_path):
    _, admin_email = make_admin(db, "proj_doc_admin")
    target_client, _ = make_client(db, "proj_doc_client")

    project = Project(
        client_id=target_client.id,
        name="Doc-Linked Project",
        status="ACTIVE",
        phase="execution",
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    test_file = tmp_path / "linked.pdf"
    test_file.write_bytes(b"%PDF-1.4 linked content")

    doc = Document(
        client_id=target_client.id,
        project_id=project.id,
        uploaded_by=target_client.id,
        title="Linked Doc",
        original_filename="linked.pdf",
        storage_path=str(test_file),
        visibility="client_visible",
        size_bytes=len(b"%PDF-1.4 linked content"),
    )
    db.add(doc)
    db.commit()

    login(client, admin_email)
    resp = client.get(f"/api/projects/{project.id}/documents")
    assert resp.status_code == 200, f"Admin project docs failed: {resp.text}"
    ids = [d["id"] for d in resp.json()]
    assert str(doc.id) in ids, "Linked document should appear in project docs list"
    logout(client)


# 12. Invoices can be linked to a project
def test_invoices_linked_to_project(client, db):
    _, admin_email = make_admin(db, "proj_inv_admin")
    target_client, _ = make_client(db, "proj_inv_client")

    project = Project(
        client_id=target_client.id,
        name="Invoice-Linked Project",
        status="ACTIVE",
        phase="execution",
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    invoice = Invoice(
        client_id=target_client.id,
        project_id=project.id,
        number="INV-PROJ-001",
        description="Milestone 1",
        amount_due=100000,
        currency="USD",
        status="pending",
    )
    db.add(invoice)
    db.commit()

    login(client, admin_email)
    resp = client.get(f"/api/projects/{project.id}/invoices")
    assert resp.status_code == 200, f"Admin project invoices failed: {resp.text}"
    ids = [i["id"] for i in resp.json()]
    assert str(invoice.id) in ids, "Linked invoice should appear in project invoices list"
    logout(client)
