from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid


class AgencyCreate(BaseModel):
    agency_name:       str
    agency_type:       Optional[str] = None
    state:             Optional[str] = None
    contact_email:     Optional[str] = None
    contact_name:      Optional[str] = None
    subscription_tier: str = "essential"


class AgencyUpdate(BaseModel):
    agency_name:   Optional[str] = None
    contact_email: Optional[str] = None
    contact_name:  Optional[str] = None
    agency_type:   Optional[str] = None
    state:         Optional[str] = None
    status:        Optional[str] = None


class AgencyResponse(BaseModel):
    id:                uuid.UUID
    agency_name:       str
    slug:              str
    subscription_tier: str
    status:            str
    storage_path:      Optional[str] = None
    contact_email:     Optional[str] = None
    contact_name:      Optional[str] = None
    agency_type:       Optional[str] = None
    state:             Optional[str] = None
    created_at:        datetime

    model_config = {"from_attributes": True}


class AgencyMembershipResponse(BaseModel):
    id:         uuid.UUID
    agency_id:  uuid.UUID
    user_id:    uuid.UUID
    role:       str
    created_at: datetime

    model_config = {"from_attributes": True}


class AgencyFileResponse(BaseModel):
    id:                uuid.UUID
    agency_id:         uuid.UUID
    original_filename: str
    stored_filename:   str
    file_type:         str
    mime_type:         Optional[str] = None
    file_size_bytes:   Optional[int] = None
    status:            str
    validation_status: Optional[str] = None
    created_at:        datetime

    model_config = {"from_attributes": True}


class PipelineRunResponse(BaseModel):
    id:            uuid.UUID
    agency_id:     uuid.UUID
    status:        str
    started_at:    Optional[datetime] = None
    completed_at:  Optional[datetime] = None
    error_message: Optional[str] = None
    output_path:   Optional[str] = None
    report_path:   Optional[str] = None
    created_at:    datetime

    model_config = {"from_attributes": True}


class AuditLogResponse(BaseModel):
    id:            uuid.UUID
    agency_id:     Optional[uuid.UUID] = None
    user_id:       Optional[uuid.UUID] = None
    action:        str
    resource_type: Optional[str] = None
    resource_id:   Optional[str] = None
    details:       Optional[dict] = None
    ip_address:    Optional[str] = None
    created_at:    datetime

    model_config = {"from_attributes": True}
