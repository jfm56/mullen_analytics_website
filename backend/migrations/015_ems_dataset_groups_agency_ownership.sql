-- 015_ems_dataset_groups_agency_ownership.sql
-- Add missing dataset group table and agency ownership to EMS uploads.
-- Existing applied migrations must remain unchanged.

CREATE TABLE IF NOT EXISTS ems_dataset_groups (
    id UUID PRIMARY KEY,
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_year INTEGER,
    end_year INTEGER,
    source_system VARCHAR(100) DEFAULT 'emscharts',
    status VARCHAR(50) DEFAULT 'active',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_ems_dataset_groups_agency_id
    ON ems_dataset_groups(agency_id);

CREATE INDEX IF NOT EXISTS ix_ems_dataset_groups_client_id
    ON ems_dataset_groups(client_id);

ALTER TABLE data_uploads
    ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS ix_data_uploads_agency_id
    ON data_uploads(agency_id);

-- Only backfill when a user belongs to exactly one agency.
-- Ambiguous ownership remains NULL and therefore invisible under normal RLS.
UPDATE ems_dataset_groups g
SET agency_id = (
    SELECT am.agency_id
    FROM agency_memberships am
    WHERE am.user_id = g.client_id
)
WHERE g.agency_id IS NULL
  AND (
      SELECT COUNT(*)
      FROM agency_memberships am
      WHERE am.user_id = g.client_id
  ) = 1;

UPDATE data_uploads u
SET agency_id = (
    SELECT am.agency_id
    FROM agency_memberships am
    WHERE am.user_id = u.client_id
)
WHERE u.agency_id IS NULL
  AND (
      SELECT COUNT(*)
      FROM agency_memberships am
      WHERE am.user_id = u.client_id
  ) = 1;
