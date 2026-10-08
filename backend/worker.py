"""SQS worker for durable pipeline processing.

Run as a separate ECS service with ``python -m worker`` from the backend
directory. Messages are deleted only after successful processing; failures stay
visible to SQS retry policy and eventually land in the configured DLQ.
"""
import json
import logging
import time
from datetime import datetime
from uuid import UUID

import boto3

from app.config import get_settings
from app.routers.emscharts_ingest import _process_upload
from app.routers.emscharts import _audit, _finish, _s3
from app.database import SessionLocal
from app.services.emscharts.pipeline import SyncAlreadyRunning, refresh_analytics, run_sync
from app.services.pipeline.runner import execute_background

logger = logging.getLogger("mullen.pipeline-worker")


def _client(settings):
    kwargs = {"region_name": settings.aws_region or "us-east-1"}
    if settings.sqs_endpoint_url:
        kwargs["endpoint_url"] = settings.sqs_endpoint_url
    return boto3.client("sqs", **kwargs)


def handle_message(message):
    envelope = json.loads(message["Body"])
    job_type = envelope.get("type")
    payload = envelope.get("payload") or {}
    if job_type == "agency_pipeline":
        execute_background(raise_on_error=True, **payload)
    elif job_type == "legacy_upload_process":
        _process_upload(payload["upload_id"], raise_on_error=True)
    elif job_type == "emscharts_sync":
        _run_emscharts_sync(payload)
    else:
        raise ValueError(f"Unsupported processing job type: {job_type!r}")


def _run_emscharts_sync(payload):
    db = None
    try:
        agency_id = UUID(payload["agency_id"])
        user_id = UUID(payload["triggered_by"])
        conn_id = UUID(payload["connection_id"])
        since = datetime.fromisoformat(payload["since"]) if payload.get("since") else None
        db = SessionLocal()
        run = run_sync(
            db, agency_id, _s3(), get_settings().aws_s3_bucket,
            payload["raw_prefix"], since=since, trigger="queued",
            triggered_by=user_id, connection_id=conn_id, raise_on_error=True,
        )
        _finish(db, agency_id, conn_id, run)
        refresh = {"swapped": False, "reason": "run not successful"}
        if run["final_status"] in ("succeeded", "partial"):
            refresh = refresh_analytics(db, agency_id, sync_run_id=run["sync_run_id"])
        _audit(
            db, agency_id, user_id, "emscharts_sync_worker", True,
            {"final_status": run["final_status"], "analytics_swapped": refresh.get("swapped")},
            resource_id=run["sync_run_id"], ip=payload.get("ip"),
        )
    except SyncAlreadyRunning:
        logger.info("duplicate EMSCharts sync message ignored for agency %s", agency_id)
    finally:
        if db is not None:
            db.close()


def run_forever():
    settings = get_settings()
    if settings.job_backend.lower() != "sqs" or not settings.pipeline_queue_url:
        raise RuntimeError("JOB_BACKEND=sqs and PIPELINE_QUEUE_URL are required")
    client = _client(settings)
    logger.info("pipeline worker started")
    while True:
        response = client.receive_message(
            QueueUrl=settings.pipeline_queue_url,
            MaxNumberOfMessages=5,
            WaitTimeSeconds=20,
            VisibilityTimeout=settings.job_visibility_timeout_seconds,
        )
        for message in response.get("Messages", []):
            try:
                handle_message(message)
                client.delete_message(
                    QueueUrl=settings.pipeline_queue_url,
                    ReceiptHandle=message["ReceiptHandle"],
                )
            except Exception:  # noqa: BLE001 - leave message for retry/DLQ
                logger.exception("processing job failed; leaving message for retry")
        if not response.get("Messages"):
            time.sleep(1)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_forever()
