-- ============================================================
-- Migration 006: Add analytics_config column to agencies
-- ============================================================

ALTER TABLE agencies
    ADD COLUMN IF NOT EXISTS analytics_config JSONB;
