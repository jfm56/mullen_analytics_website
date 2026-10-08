"""Pure tests for the API-to-worker dispatch boundary."""

from types import SimpleNamespace

import pytest

from app.services import jobs


def test_background_backend_does_not_require_aws(monkeypatch):
    monkeypatch.setattr(
        jobs,
        "get_settings",
        lambda: SimpleNamespace(job_backend="background"),
    )

    result = jobs.enqueue("agency_pipeline", {"run_id": "synthetic"})

    assert result == {
        "queued": False,
        "backend": "background",
        "job_type": "agency_pipeline",
    }


def test_sqs_backend_requires_a_queue_url(monkeypatch):
    monkeypatch.setattr(
        jobs,
        "get_settings",
        lambda: SimpleNamespace(job_backend="sqs", pipeline_queue_url=""),
    )

    with pytest.raises(jobs.JobConfigurationError):
        jobs.enqueue("emscharts_sync", {"agency_id": "synthetic"})


def test_unknown_job_type_is_rejected_before_dispatch():
    with pytest.raises(ValueError, match="Unsupported processing job type"):
        jobs.enqueue("not-a-real-job", {})
