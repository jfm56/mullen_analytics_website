-- Add project details fields to profiles table
-- Run this in your Supabase SQL editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS project_name TEXT,
ADD COLUMN IF NOT EXISTS project_status TEXT DEFAULT 'Planned';

-- Add check-in fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS next_check_in TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS check_in_notes TEXT;

-- Add tableau fields with proper names
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS tableau_embed_html TEXT,
ADD COLUMN IF NOT EXISTS tableau_embed_type TEXT DEFAULT 'dashboard',
ADD COLUMN IF NOT EXISTS tableau_open_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN profiles.project_name IS 'Name of the current project for the client';
COMMENT ON COLUMN profiles.project_status IS 'Current status of the project (Planned, In progress, Complete, etc.)';
COMMENT ON COLUMN profiles.next_check_in IS 'Scheduled date and time for next client check-in';
COMMENT ON COLUMN profiles.check_in_notes IS 'Notes and agenda for the next check-in meeting';
COMMENT ON COLUMN profiles.tableau_embed_html IS 'Full Tableau embed HTML code';
COMMENT ON COLUMN profiles.tableau_embed_type IS 'Type of Tableau embed (dashboard, story, etc.)';
COMMENT ON COLUMN profiles.tableau_open_url IS 'URL to open Tableau dashboard in new tab';
