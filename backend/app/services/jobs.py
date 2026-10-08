"""Small job-dispatch boundary shared by API routes and the AWS worker.

The API remains usable in local/Railway mode with Starlette background tasks,
while AWS can set JOB_BACKEND=sqs and move CPU-heavy work to an ECS worker. The
message contains identifiers and non-sensitive job configuration only; raw data
stays in the configured storage system.
"""
import json
from typing import Any, Dict

from ..config import get_settings

JOB_TYPES = frozenset({
    "agency_pipeline",
    "legacy_upload_process",
    "emscharts_sync",
})


class JobConfigurationError(RuntimeError):
    """Raised when durable processing is selected without queue configuration."""


class JobEnqueueError(RuntimeError):
    """Raised when the configured durable queue cannot accept a job."""


def enqueue(job_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    if job_type not in JOB_TYPES:
        raise ValueError(f"Unsupported processing job type: {job_type!r}")
    settings = get_settings()
    if settings.job_backend.lower() != "sqs":
        return {"queued": False, "backend": settings.job_backend, "job_type": job_type}
    if not settings.pipeline_queue_url:
        raise JobConfigurationError("JOB_BACKEND=sqs requires PIPELINE_QUEUE_URL")

    import boto3

    client_kwargs = {"region_name": settings.aws_region or "us-east-1"}
    if settings.sqs_endpoint_url:
        client_kwargs["endpoint_url"] = settings.sqs_endpoint_url
    try:
        response = boto3.client("sqs", **client_kwargs).send_message(
            QueueUrl=settings.pipeline_queue_url,
            MessageBody=json.dumps({"type": job_type, "payload": payload}, default=str),
        )
    except Exception as exc:  # noqa: BLE001 - convert SDK errors at the boundary
        raise JobEnqueueError("The durable processing queue rejected the job") from exc
    return {
        "queued": True,
        "backend": "sqs",
        "job_type": job_type,
        "message_id": response.get("MessageId"),
    }
