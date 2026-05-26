from sqlalchemy import Column, String, DateTime, Text, Integer, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from ..database import Base


class DataUpload(Base):
    """Client-uploaded data files (EMSCharts CSV etc.)"""
    __tablename__ = "data_uploads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True, index=True)
    uploaded_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    original_filename = Column(String(500), nullable=False)
    stored_filename = Column(String(500), nullable=False)
    file_path = Column(Text, nullable=False)
    file_size = Column(Integer, default=0)

    source_system = Column(String(100), default="EMSCHARTS")
    upload_status = Column(String(50), default="UPLOADED")  # UPLOADED, CLEANING, CLEANED, FAILED

    row_count_original = Column(Integer, nullable=True)
    row_count_cleaned = Column(Integer, nullable=True)

    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client = relationship("User", foreign_keys=[client_id])
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_user_id])
    project = relationship("Project", back_populates="data_uploads")
    cleaning_results = relationship("DataCleaningResult", back_populates="upload",
                                    cascade="all, delete-orphan")


class DataCleaningResult(Base):
    """Results of the EMS cleaning pipeline for a data upload."""
    __tablename__ = "data_cleaning_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    data_upload_id = Column(UUID(as_uuid=True), ForeignKey("data_uploads.id"),
                            nullable=False, index=True)

    missing_values_summary = Column(JSONB, nullable=True)
    duplicate_rows_count = Column(Integer, default=0)
    removed_rows_count = Column(Integer, default=0)
    cleaned_file_path = Column(Text, nullable=True)
    cleaning_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    upload = relationship("DataUpload", back_populates="cleaning_results")


class EMSDashboardMetrics(Base):
    """Pre-computed dashboard analytics for a DataUpload."""
    __tablename__ = "ems_dashboard_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    data_upload_id = Column(UUID(as_uuid=True), ForeignKey("data_uploads.id"),
                            nullable=False, index=True, unique=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True, index=True)

    metrics_json = Column(JSONB, nullable=False, default=dict)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    upload = relationship("DataUpload", backref="dashboard_metrics")


class DataProfile(Base):
    """Statistical column profile for an uploaded/cleaned dataset."""
    __tablename__ = "data_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    data_upload_id = Column(UUID(as_uuid=True), ForeignKey("data_uploads.id"),
                            nullable=False, index=True, unique=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True, index=True)

    profile_json = Column(JSONB, nullable=False, default=dict)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    upload = relationship("DataUpload", backref="data_profile")


class AnalyticsColumnSettings(Base):
    """Per-upload (optionally per-project) column visibility settings for analytics."""
    __tablename__ = "analytics_column_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    data_upload_id = Column(UUID(as_uuid=True), ForeignKey("data_uploads.id"),
                            nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)

    column_name = Column(String(500), nullable=False)
    is_ignored = Column(Boolean, nullable=False, default=False)
    role = Column(String(50), nullable=True)
    reason = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    upload = relationship("DataUpload", backref="column_settings")


class EMSColumnMapping(Base):
    """User-defined mapping from analytics field names to actual CSV column names."""
    __tablename__ = "ems_column_mappings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    data_upload_id = Column(UUID(as_uuid=True), ForeignKey("data_uploads.id"),
                            nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)

    analytics_field = Column(String(100), nullable=False)
    mapped_column_name = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    upload = relationship("DataUpload", backref="column_mappings")
