-- Add logo_url column to profiles table
-- Run this in your Supabase SQL Editor

-- Add logo_url column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.logo_url IS 'URL to client logo/emblem stored in Supabase Storage';
