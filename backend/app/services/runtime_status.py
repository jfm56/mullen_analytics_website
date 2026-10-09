"""Read-only diagnostics. Configuration and reachability are not migration evidence."""
from pathlib import Path


def storage_metadata(settings):
    return {
        "environment": settings.environment,
        "storage_backend": settings.storage_backend,
        "upload_root": settings.data_uploads_root,
        "storage_root": settings.data_storage_root,
        "s3_bucket": settings.aws_s3_bucket or None,
        "aws_region": settings.aws_region or None,
    }


def check_storage(settings, s3_client=None):
    uploads_exist = Path(settings.data_uploads_root).is_dir()
    storage_exists = Path(settings.data_storage_root).is_dir()
    checks = {
        "uploads_directory": "ok" if uploads_exist else "warning",
        "storage_directory": "ok" if storage_exists else "warning",
        "s3": "not_checked",
    }
    backend = settings.storage_backend.lower()
    if backend == "s3":
        if not settings.aws_s3_bucket:
            checks["s3"] = "not_configured"
        else:
            try:
                if s3_client is None:
                    import boto3
                    from botocore.config import Config
                    s3_client = boto3.client(
                        "s3", region_name=settings.aws_region,
                        config=Config(connect_timeout=3, read_timeout=3,
                                      retries={"max_attempts": 0}),
                    )
                s3_client.head_bucket(Bucket=settings.aws_s3_bucket)
                checks["s3"] = "reachable"
            except Exception:  # SDK errors must never expose credentials in responses.
                checks["s3"] = "error"
        # Legacy upload/processing routes still require persistent directories
        # (EFS in AWS). A reachable bucket alone cannot make storage healthy.
        healthy = uploads_exist and storage_exists and checks["s3"] == "reachable"
    else:
        healthy = backend == "local" and uploads_exist and storage_exists
    return {
        "storage": "ok" if healthy else "warning",
        "storage_checks": checks,
        "uploads_root_exists": uploads_exist,
        "storage_root_exists": storage_exists,
    }
