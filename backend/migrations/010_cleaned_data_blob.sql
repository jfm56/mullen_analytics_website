-- 010_cleaned_data_blob.sql
-- Persist a gzipped copy of the cleaned CSV in the DB so the analytics services
-- (predictive / geographic / response-time / MVA) can read it even when the
-- cleaned file isn't on this server's disk — e.g. ephemeral Railway storage or a
-- cleaned_file_path written on a different machine. Idempotent; also applied by
-- the startup self-heal in app/main.py.

ALTER TABLE data_cleaning_results ADD COLUMN IF NOT EXISTS cleaned_data_gz BYTEA;
