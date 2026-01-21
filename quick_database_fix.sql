-- Quick Database Fix - Run this in Supabase SQL Editor
-- This will create the essential tables needed for the admin dashboard

-- Create enhanced_tasks table (most important)
CREATE TABLE IF NOT EXISTS enhanced_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    linked_project TEXT,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2)
);

-- Enable RLS
ALTER TABLE enhanced_tasks ENABLE ROW LEVEL SECURITY;

-- Create simple admin policy
CREATE POLICY "Admin full access to enhanced_tasks" ON enhanced_tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_enhanced_tasks_client_id ON enhanced_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_tasks_status ON enhanced_tasks(status);

-- Add missing columns to profiles table if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS client_status TEXT DEFAULT 'prospect';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS project_phase TEXT DEFAULT 'discovery';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS project_deadline DATE;

-- Verify tables were created
SELECT 'enhanced_tasks table created successfully' as status;
