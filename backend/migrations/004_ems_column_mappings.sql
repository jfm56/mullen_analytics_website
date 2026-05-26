-- ============================================================
-- Migration 004: EMS Column Mappings
-- ============================================================

CREATE TABLE IF NOT EXISTS ems_column_mappings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_upload_id      UUID NOT NULL REFERENCES data_uploads(id) ON DELETE CASCADE,
    client_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id          UUID REFERENCES projects(id) ON DELETE SET NULL,
    analytics_field     VARCHAR(100) NOT NULL,
    mapped_column_name  VARCHAR(500),
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE (data_upload_id, analytics_field)
);

CREATE INDEX IF NOT EXISTS idx_ems_column_mappings_upload
    ON ems_column_mappings(data_upload_id);

CREATE INDEX IF NOT EXISTS idx_ems_column_mappings_client
    ON ems_column_mappings(client_id);
