import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

SUBFOLDERS = ["raw", "processed", "artifacts", "reports", "models", "logs"]


def create_agency_folders(agency_id: str, storage_root: str) -> str:
    """Create isolated D: drive folder structure for an agency."""
    agency_path = Path(storage_root) / "agencies" / agency_id

    for subfolder in SUBFOLDERS:
        target = agency_path / subfolder
        target.mkdir(parents=True, exist_ok=True)
        logger.info("Storage folder ready: %s", target)

    return str(agency_path)


def get_raw_upload_path(agency_id: str, storage_root: str, filename: str) -> str:
    """Return the absolute path where a raw upload should be written."""
    return str(Path(storage_root) / "agencies" / agency_id / "raw" / filename)


def agency_folder_exists(agency_id: str, storage_root: str) -> bool:
    """Check whether an agency's root folder exists on disk."""
    return (Path(storage_root) / "agencies" / agency_id).exists()


def delete_agency_file(file_path: str) -> bool:
    """Safely remove a single file from the agency folder."""
    try:
        path = Path(file_path)
        if path.exists() and path.is_file():
            path.unlink()
            logger.info("Deleted file: %s", file_path)
            return True
        return False
    except Exception as exc:
        logger.error("Failed to delete %s: %s", file_path, exc)
        return False


def ensure_storage_root(storage_root: str) -> None:
    """Create the top-level storage root directory if it does not exist."""
    Path(storage_root).mkdir(parents=True, exist_ok=True)
    logger.info("Storage root ready: %s", storage_root)
