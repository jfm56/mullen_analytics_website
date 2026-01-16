-- Add client upload settings to profiles table
-- Run this in your Supabase SQL Editor

-- Add upload configuration columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS upload_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allowed_file_types TEXT DEFAULT 'csv,xlsx,json,pdf',
ADD COLUMN IF NOT EXISTS max_upload_mb INTEGER DEFAULT 50;

-- Create uploads table
CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  s3_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'processing', 'done', 'error')),
  notes TEXT
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_uploads_client_uploaded 
ON uploads(client_id, uploaded_at DESC);

-- Add comments for documentation
COMMENT ON TABLE uploads IS 'Client file uploads stored in S3';
COMMENT ON COLUMN profiles.upload_enabled IS 'Whether client can upload files';
COMMENT ON COLUMN profiles.allowed_file_types IS 'Comma-separated list of allowed file extensions';
COMMENT ON COLUMN profiles.max_upload_mb IS 'Maximum file size in megabytes';
COMMENT ON COLUMN uploads.s3_key IS 'S3 object key (path) for the uploaded file';
COMMENT ON COLUMN uploads.status IS 'Upload processing status';
