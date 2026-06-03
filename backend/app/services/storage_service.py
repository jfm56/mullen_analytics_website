"""
Storage service — abstracts local filesystem vs S3 storage.

STORAGE_BACKEND=local  → stores under DATA_UPLOADS_ROOT / DATA_STORAGE_ROOT
STORAGE_BACKEND=s3     → (future) stores in S3 bucket

Usage:
    from app.services.storage_service import get_storage
    storage = get_storage()
    path = storage.save_upload(file_bytes, client_id, upload_id, filename)
"""

import os
import uuid
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class LocalStorageService:
    """File-system backed storage for local and Railway (ephemeral) use."""

    def __init__(self, uploads_root: str, storage_root: str):
        self.uploads_root = Path(uploads_root)
        self.storage_root = Path(storage_root)
        self._ensure_dirs()

    def _ensure_dirs(self):
        self.uploads_root.mkdir(parents=True, exist_ok=True)
        self.storage_root.mkdir(parents=True, exist_ok=True)

    def _client_upload_dir(self, client_id: str) -> Path:
        d = self.uploads_root / "clients" / client_id
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _client_cleaned_dir(self, client_id: str) -> Path:
        d = self.uploads_root / "clients" / client_id / "cleaned"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def save_upload(self, file_bytes: bytes, client_id: str, filename: str) -> str:
        """Save raw uploaded file. Returns absolute path string."""
        stored_name = f"{uuid.uuid4().hex}_{Path(filename).name}"
        dest = self._client_upload_dir(client_id) / stored_name
        dest.write_bytes(file_bytes)
        logger.info("Saved upload: %s (%d bytes)", dest, len(file_bytes))
        return str(dest)

    def get_upload_path(self, file_path: str) -> Optional[Path]:
        """Return Path for an upload given its stored path string."""
        p = Path(file_path)
        return p if p.exists() else None

    def save_cleaned_file(self, client_id: str, upload_id: str, df) -> str:
        """Save a pandas DataFrame as cleaned CSV. Returns absolute path string."""
        dest = self._client_cleaned_dir(client_id) / f"{upload_id}_cleaned.csv"
        df.to_csv(dest, index=False)
        logger.info("Saved cleaned file: %s", dest)
        return str(dest)

    def get_cleaned_file_path(self, file_path: str) -> Optional[Path]:
        """Return Path for a cleaned file given its stored path string."""
        p = Path(file_path)
        return p if p.exists() else None

    def delete_upload_files(self, file_path: Optional[str], cleaned_path: Optional[str]) -> None:
        """Delete both raw and cleaned files if they exist."""
        for fp in [file_path, cleaned_path]:
            if fp:
                p = Path(fp)
                if p.exists():
                    p.unlink()
                    logger.info("Deleted file: %s", p)

    def file_exists(self, path_or_key: str) -> bool:
        return Path(path_or_key).exists()


_storage_instance: Optional[LocalStorageService] = None


def get_storage() -> LocalStorageService:
    """Return singleton storage service configured from settings."""
    global _storage_instance
    if _storage_instance is None:
        from ..config import get_settings
        s = get_settings()
        # Resolve relative paths relative to backend directory
        uploads_root = s.data_uploads_root
        storage_root = s.data_storage_root
        if not os.path.isabs(uploads_root):
            uploads_root = str(Path(__file__).parent.parent.parent / uploads_root)
        if not os.path.isabs(storage_root):
            storage_root = str(Path(__file__).parent.parent.parent / storage_root)
        _storage_instance = LocalStorageService(uploads_root, storage_root)
    return _storage_instance
