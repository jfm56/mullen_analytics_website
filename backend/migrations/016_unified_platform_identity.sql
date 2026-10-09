-- 016_unified_platform_identity.sql
-- Required unified-platform identity and agency permission columns.
-- Additive and idempotent; does not modify previously applied migrations.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS cognito_sub VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS ix_users_cognito_sub
    ON users(cognito_sub);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS platform_role VARCHAR(30);

CREATE INDEX IF NOT EXISTS ix_users_platform_role
    ON users(platform_role);

ALTER TABLE agencies
    ADD COLUMN IF NOT EXISTS data_classification VARCHAR(20)
    NOT NULL DEFAULT 'production';

CREATE INDEX IF NOT EXISTS ix_agencies_data_classification
    ON agencies(data_classification);

ALTER TABLE agencies
    ADD COLUMN IF NOT EXISTS org_id UUID;

CREATE INDEX IF NOT EXISTS ix_agencies_org_id
    ON agencies(org_id);

ALTER TABLE agency_memberships
    ADD COLUMN IF NOT EXISTS can_review BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE agency_memberships
    ADD COLUMN IF NOT EXISTS can_receive_reviews BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE agency_memberships
    ADD COLUMN IF NOT EXISTS is_agency_admin BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE agency_memberships
    ADD COLUMN IF NOT EXISTS provider_id VARCHAR(100);
