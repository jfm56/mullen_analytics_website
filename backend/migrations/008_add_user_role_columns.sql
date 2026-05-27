-- Migration 008: Add missing role and is_active columns to users table
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'client',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add role column to profiles if missing
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'client';
