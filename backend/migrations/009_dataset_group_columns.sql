-- 009_dataset_group_columns.sql
-- Adds the multi-year dataset-group columns to data_uploads.
-- The columns exist on the DataUpload SQLAlchemy model but were never added to
-- the data_uploads table created by 005_data_uploads_tables.sql, and
-- Base.metadata.create_all() only creates new tables (never ALTERs existing
-- ones). Idempotent and safe to re-run. Mirrors scripts/migrate_dataset_columns.py
-- (FK to ems_dataset_groups omitted here to avoid table-creation ordering during
-- migration runs; the app enforces the relationship at the ORM layer).

ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS upload_type VARCHAR(50) DEFAULT 'yearly_csv';
ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS dataset_group_id UUID;
ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS reporting_year INTEGER;
ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS reporting_period_start TIMESTAMP;
ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS reporting_period_end TIMESTAMP;

CREATE INDEX IF NOT EXISTS ix_data_uploads_dataset_group_id ON data_uploads(dataset_group_id);
CREATE INDEX IF NOT EXISTS ix_data_uploads_reporting_year ON data_uploads(reporting_year);
