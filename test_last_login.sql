-- Test script to verify last login tracking
-- Run this in your Supabase SQL Editor to check if the last_login column exists and has data

-- 1. Check if last_login column exists in profiles table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'last_login';

-- 2. Check current last_login values for all users
SELECT 
    id,
    email,
    full_name,
    last_login,
    created_at
FROM profiles 
WHERE role = 'client'
ORDER BY last_login DESC NULLS LAST;

-- 3. Test updating last_login manually (for testing)
UPDATE profiles 
SET last_login = NOW() 
WHERE email = 'test@example.com' -- Replace with actual client email

-- 4. Verify the update
SELECT 
    email,
    full_name,
    last_login,
    EXTRACT(EPOCH FROM (NOW() - last_login))/60 as minutes_since_login
FROM profiles 
WHERE email = 'test@example.com' -- Replace with actual client email;
