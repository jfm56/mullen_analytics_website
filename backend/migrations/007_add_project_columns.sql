-- ============================================================
-- Migration 007: Add missing columns to projects table
-- ============================================================

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS budget_cents INTEGER,
    ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;
