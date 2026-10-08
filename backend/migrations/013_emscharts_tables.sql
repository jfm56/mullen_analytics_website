-- Migration 013: agency-owned EMSCharts operational ingestion tables.
-- These tables were previously created only by SQLAlchemy create_all(), which
-- meant a clean migration run could not validate the reconciliation invariants.

CREATE TABLE IF NOT EXISTS emscharts_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL UNIQUE REFERENCES agencies(id) ON DELETE CASCADE,
    source_system VARCHAR(50) NOT NULL DEFAULT 'zoll_emscharts',
    delivery_method VARCHAR(30) NOT NULL DEFAULT 'manual',
    sftp_username VARCHAR(120),
    s3_raw_prefix VARCHAR(300),
    nemsis_version VARCHAR(10),
    secret_ref VARCHAR(200),
    ems_sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ems_sync_mode VARCHAR(20) NOT NULL DEFAULT 'off',
    last_successful_sync TIMESTAMP,
    last_attempted_sync TIMESTAMP,
    next_scheduled_sync TIMESTAMP,
    sync_status VARCHAR(20) NOT NULL DEFAULT 'idle',
    sync_error TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_emscharts_connections_agency_id
    ON emscharts_connections(agency_id);

CREATE TABLE IF NOT EXISTS sync_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES emscharts_connections(id),
    source_system VARCHAR(50),
    trigger VARCHAR(20),
    triggered_by UUID REFERENCES users(id),
    requested_period_start TIMESTAMP,
    requested_period_end TIMESTAMP,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    files_received INTEGER DEFAULT 0,
    records_received INTEGER DEFAULT 0,
    inserted INTEGER DEFAULT 0,
    updated INTEGER DEFAULT 0,
    unchanged INTEGER DEFAULT 0,
    rejected INTEGER DEFAULT 0,
    duplicates INTEGER DEFAULT 0,
    validation_failures INTEGER DEFAULT 0,
    final_status VARCHAR(20) NOT NULL DEFAULT 'running',
    error TEXT
);
CREATE INDEX IF NOT EXISTS ix_sync_runs_agency_id ON sync_runs(agency_id);

CREATE TABLE IF NOT EXISTS ems_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    source_record_id VARCHAR(120) NOT NULL,
    response_number VARCHAR(120),
    incident_number VARCHAR(120),
    source_object_key VARCHAR(400),
    sync_run_id UUID REFERENCES sync_runs(id),
    content_hash VARCHAR(64),
    psap_call_at TIMESTAMP,
    unit_notified_at TIMESTAMP,
    enroute_at TIMESTAMP,
    arrived_scene_at TIMESTAMP,
    arrived_patient_at TIMESTAMP,
    left_scene_at TIMESTAMP,
    arrived_dest_at TIMESTAMP,
    back_in_service_at TIMESTAMP,
    unit_id VARCHAR(60),
    scene_lat DOUBLE PRECISION,
    scene_lng DOUBLE PRECISION,
    disposition VARCHAR(80),
    call_type VARCHAR(30),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_ems_incident_agency_source UNIQUE (agency_id, source_record_id)
);
CREATE INDEX IF NOT EXISTS ix_ems_incidents_agency_id ON ems_incidents(agency_id);
CREATE INDEX IF NOT EXISTS ix_ems_incidents_source_record_id ON ems_incidents(source_record_id);
CREATE INDEX IF NOT EXISTS ix_ems_incidents_incident_number ON ems_incidents(incident_number);

CREATE TABLE IF NOT EXISTS ems_analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'staged',
    metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    sync_run_id UUID REFERENCES sync_runs(id),
    computed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_ems_analytics_snapshots_agency_id
    ON ems_analytics_snapshots(agency_id);
CREATE INDEX IF NOT EXISTS ix_ems_analytics_snapshots_status
    ON ems_analytics_snapshots(status);
