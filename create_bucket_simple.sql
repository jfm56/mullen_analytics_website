-- Simple storage bucket creation - just the bucket, no policies
-- Run this in your Supabase SQL Editor if the other script fails

-- Just create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'client-uploads', 
    'client-uploads', 
    false, 
    52428800, -- 50MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
) ON CONFLICT (id) DO NOTHING;
