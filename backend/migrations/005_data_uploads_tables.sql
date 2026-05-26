-- ============================================================
-- Migration 005: EMS Data Uploads & Analytics Tables
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------
-- Data uploads (client-submitted CSV files)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_uploads (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id          UUID REFERENCES projects(id) ON DELETE SET NULL,
    uploaded_by_user_id UUID NOT NULL REFERENCES users(id),
    original_filename   VARCHAR(500) NOT NULL,
    stored_filename     VARCHAR(500) NOT NULL,
    file_path           TEXT NOT NULL,
    file_size           INTEGER DEFAULT 0,
    source_system       VARCHAR(100) DEFAULT 'EMSCHARTS',
    upload_status       VARCHAR(50)  DEFAULT 'UPLOADED',
    row_count_original  INTEGER,
    row_count_cleaned   INTEGER,
    notes               TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_uploads_client  ON data_uploads(client_id);
CREATE INDEX IF NOT EXISTS idx_data_uploads_project ON data_uploads(project_id);
CREATE INDEX IF NOT EXISTS idx_data_uploads_status  ON data_uploads(upload_status);

-- -------------------------------------------------------
-- Data cleaning results
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_cleaning_results (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_upload_id         UUID NOT NULL REFERENCES data_uploads(id) ON DELETE CASCADE,
    missing_values_summary JSONB,
    duplicate_rows_count   INTEGER DEFAULT 0,
    removed_rows_count     INTEGER DEFAULT 0,
    cleaned_file_path      TEXT,
    cleaning_notes         TEXT,
    created_at             TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_cleaning_results_upload ON data_cleaning_results(data_upload_id);

-- -------------------------------------------------------
-- EMS Dashboard metrics (pre-computed)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS ems_dashboard_metrics (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_upload_id UUID NOT NULL UNIQUE REFERENCES data_uploads(id) ON DELETE CASCADE,
    client_id      UUID NOT NULL REFERENCES users(id),
    project_id     UUID REFERENCES projects(id) ON DELETE SET NULL,
    metrics_json   JSONB NOT NULL DEFAULT '{}',
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ems_dashboard_metrics_upload  ON ems_dashboard_metrics(data_upload_id);
CREATE INDEX IF NOT EXISTS idx_ems_dashboard_metrics_client  ON ems_dashboard_metrics(client_id);
CREATE INDEX IF NOT EXISTS idx_ems_dashboard_metrics_project ON ems_dashboard_metrics(project_id);

-- -------------------------------------------------------
-- Data profiles (statistical column profiles)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_profiles (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_upload_id UUID NOT NULL UNIQUE REFERENCES data_uploads(id) ON DELETE CASCADE,
    client_id      UUID NOT NULL REFERENCES users(id),
    project_id     UUID REFERENCES projects(id) ON DELETE SET NULL,
    profile_json   JSONB NOT NULL DEFAULT '{}',
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_profiles_upload ON data_profiles(data_upload_id);
CREATE INDEX IF NOT EXISTS idx_data_profiles_client ON data_profiles(client_id);

-- -------------------------------------------------------
-- Analytics column settings (per-upload visibility + roles)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_column_settings (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_upload_id UUID NOT NULL REFERENCES data_uploads(id) ON DELETE CASCADE,
    client_id      UUID NOT NULL REFERENCES users(id),
    project_id     UUID REFERENCES projects(id) ON DELETE SET NULL,
    column_name    VARCHAR(500) NOT NULL,
    is_ignored     BOOLEAN NOT NULL DEFAULT FALSE,
    role           VARCHAR(50),
    reason         VARCHAR(500),
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_col_settings_upload ON analytics_column_settings(data_upload_id);
CREATE INDEX IF NOT EXISTS idx_analytics_col_settings_client ON analytics_column_settings(client_id);
