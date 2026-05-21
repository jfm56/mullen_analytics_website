-- ============================================================
-- Migration 003: EMS / Healthcare Analytics Platform
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------
-- Subscription tiers
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_tiers (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier_key    VARCHAR(50)  UNIQUE NOT NULL,
    tier_name   VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2) DEFAULT 0,
    features    JSONB DEFAULT '[]',
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW()
);

INSERT INTO subscription_tiers (tier_key, tier_name, description, price_monthly, features) VALUES
('essential',    'Essential Analytics',       'File upload, data validation, call volume & response time summaries, basic executive report', 299.00,  '["file_upload","data_validation","call_volume","response_times","basic_report"]'),
('operational',  'Operational Intelligence',  'Everything in Essential plus staffing analysis, forecasting, municipality & payroll analytics', 799.00,  '["file_upload","data_validation","call_volume","response_times","basic_report","staffing_analysis","response_forecasting","municipality_analysis","payroll_analytics","dashboard_exports"]'),
('predictive',   'Predictive AI',             'Everything in Operational plus AI forecasting, attrition & mutual-aid models, LLM insights', 1499.00, '["file_upload","data_validation","call_volume","response_times","basic_report","staffing_analysis","response_forecasting","municipality_analysis","payroll_analytics","dashboard_exports","call_volume_forecast","attrition_forecast","mutual_aid_forecast","hiring_triggers","ai_insights","llm_assistant"]'),
('enterprise',   'Enterprise',                'Custom pipelines, dedicated onboarding, API integrations, advanced LLM, priority support', 0.00,    '["everything","custom_pipelines","dedicated_onboarding","api_integrations","custom_dashboards","advanced_llm","priority_support"]')
ON CONFLICT (tier_key) DO NOTHING;

-- -------------------------------------------------------
-- Agencies
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS agencies (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_name       VARCHAR(255) NOT NULL,
    slug              VARCHAR(100) UNIQUE NOT NULL,
    subscription_tier VARCHAR(50)  DEFAULT 'essential',
    status            VARCHAR(50)  DEFAULT 'active',
    storage_path      TEXT,
    contact_email     VARCHAR(255),
    contact_name      VARCHAR(255),
    agency_type       VARCHAR(100),
    state             VARCHAR(50),
    created_at        TIMESTAMP DEFAULT NOW(),
    updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agencies_slug   ON agencies(slug);
CREATE INDEX IF NOT EXISTS idx_agencies_status ON agencies(status);

-- -------------------------------------------------------
-- Agency memberships (user <-> agency)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS agency_memberships (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id  UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    role       VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(agency_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_memberships_agency ON agency_memberships(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_memberships_user   ON agency_memberships(user_id);

-- -------------------------------------------------------
-- Agency uploaded files
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS agency_files (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id         UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    uploaded_by       UUID NOT NULL REFERENCES users(id),
    original_filename VARCHAR(500) NOT NULL,
    stored_filename   VARCHAR(500) NOT NULL,
    file_type         VARCHAR(50)  NOT NULL,
    mime_type         VARCHAR(100),
    file_size_bytes   BIGINT,
    upload_path       TEXT NOT NULL,
    status            VARCHAR(50) DEFAULT 'uploaded',
    validation_status VARCHAR(50),
    created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agency_files_agency ON agency_files(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_files_status ON agency_files(status);
CREATE INDEX IF NOT EXISTS idx_agency_files_type   ON agency_files(file_type);

-- -------------------------------------------------------
-- Pipeline runs
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS pipeline_runs (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id     UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    status        VARCHAR(50) DEFAULT 'queued',
    started_at    TIMESTAMP,
    completed_at  TIMESTAMP,
    error_message TEXT,
    output_path   TEXT,
    report_path   TEXT,
    triggered_by  UUID REFERENCES users(id),
    created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_agency  ON pipeline_runs(agency_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status  ON pipeline_runs(status);

-- -------------------------------------------------------
-- Audit logs
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id     UUID REFERENCES agencies(id),
    user_id       UUID REFERENCES users(id),
    action        VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id   VARCHAR(255),
    details       JSONB,
    ip_address    VARCHAR(45),
    created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_agency  ON audit_logs(agency_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action  ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- -------------------------------------------------------
-- Updated_at trigger for agencies
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_agencies_updated_at ON agencies;
CREATE TRIGGER update_agencies_updated_at
    BEFORE UPDATE ON agencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
