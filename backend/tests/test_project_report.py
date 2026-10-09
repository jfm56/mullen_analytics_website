"""Legacy reports must not create fake downloadable artifacts."""
from uuid import uuid4

from app.models.document import Document


def test_unimplemented_project_report_creates_no_document(auth_client, db):
    client, user = auth_client
    created = client.post('/api/projects/', json={
        'client_id': user['id'], 'name': 'Synthetic report audit',
    })
    assert created.status_code == 200, created.text
    project_id = created.json()['id']
    before = db.query(Document).filter(Document.project_id == project_id).count()
    response = client.post(f'/api/projects/{project_id}/generate-report')
    assert response.status_code == 501, response.text
    assert 'not available' in response.json()['detail']
    assert db.query(Document).filter(Document.project_id == project_id).count() == before


def test_project_report_checks_ownership_before_feature_status(auth_client):
    client, _ = auth_client
    response = client.post(f'/api/projects/{uuid4()}/generate-report')
    assert response.status_code == 404, response.text
