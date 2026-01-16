-- Add Tableau dashboard/story embed fields to profiles table
-- Run this in your Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS tableau_url TEXT,
ADD COLUMN IF NOT EXISTS tableau_type TEXT DEFAULT 'dashboard' CHECK (tableau_type IN ('dashboard', 'story'));

-- Add comment for documentation
COMMENT ON COLUMN profiles.tableau_url IS 'Tableau Public or Server embed URL for client dashboard/story';
COMMENT ON COLUMN profiles.tableau_type IS 'Type of Tableau embed: dashboard or story';
