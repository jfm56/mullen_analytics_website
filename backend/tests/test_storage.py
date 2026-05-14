"""Unit tests for the storage service — no DB or network required."""
import os
import tempfile

import pytest

from app.services.storage import (
    agency_folder_exists,
    create_agency_folders,
    delete_agency_file,
    ensure_storage_root,
    get_raw_upload_path,
)

SUBFOLDERS = ["raw", "processed", "artifacts", "reports", "models", "logs"]


@pytest.fixture()
def tmp_root(tmp_path):
    return str(tmp_path / "storage")


def test_ensure_storage_root_creates_dir(tmp_root):
    assert not os.path.exists(tmp_root)
    ensure_storage_root(tmp_root)
    assert os.path.isdir(tmp_root)


def test_create_agency_folders(tmp_root):
    agency_id = "test-agency-123"
    path = create_agency_folders(agency_id, tmp_root)
    assert os.path.isdir(path)
    for sub in SUBFOLDERS:
        assert os.path.isdir(os.path.join(path, sub))


def test_create_agency_folders_idempotent(tmp_root):
    agency_id = "idempotent-agency"
    create_agency_folders(agency_id, tmp_root)
    create_agency_folders(agency_id, tmp_root)  # should not raise


def test_agency_folder_exists(tmp_root):
    agency_id = "exists-check"
    assert not agency_folder_exists(agency_id, tmp_root)
    create_agency_folders(agency_id, tmp_root)
    assert agency_folder_exists(agency_id, tmp_root)


def test_get_raw_upload_path(tmp_root):
    path = get_raw_upload_path("agency-abc", tmp_root, "data.csv")
    assert path.endswith(os.path.join("agency-abc", "raw", "data.csv"))


def test_delete_agency_file(tmp_root):
    agency_id = "delete-test"
    create_agency_folders(agency_id, tmp_root)
    file_path = get_raw_upload_path(agency_id, tmp_root, "test.csv")
    with open(file_path, "w") as f:
        f.write("col1,col2\n1,2\n")
    assert os.path.exists(file_path)
    assert delete_agency_file(file_path) is True
    assert not os.path.exists(file_path)


def test_delete_nonexistent_file(tmp_root):
    assert delete_agency_file("/tmp/does_not_exist_xyz.csv") is False
