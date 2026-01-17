-- Create storage bucket for client uploads if it doesn't exist
-- Run this in your Supabase SQL Editor

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'client-uploads', 
    'client-uploads', 
    false, 
    52428800, -- 50MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Simple policies that should work with basic permissions
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Admins full access to storage" ON storage.objects;

-- Allow authenticated users to upload files to any folder
CREATE POLICY "Authenticated users can upload files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'client-uploads' AND 
        auth.role() = 'authenticated'
    );

-- Allow authenticated users to read files
CREATE POLICY "Users can read files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'client-uploads' AND 
        auth.role() = 'authenticated'
    );

-- Allow authenticated users to update files
CREATE POLICY "Users can update files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'client-uploads' AND 
        auth.role() = 'authenticated'
    );
