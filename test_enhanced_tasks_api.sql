-- Test the enhanced_tasks table directly
-- Run this in Supabase SQL Editor to verify everything works

-- 1. Check if table exists
SELECT 'enhanced_tasks table exists' as status 
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'enhanced_tasks' 
    AND table_schema = 'public'
);

-- 2. Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'enhanced_tasks' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Test inserting a sample task (this will test RLS policies)
INSERT INTO enhanced_tasks (client_id, title, description, priority, status)
VALUES (
    '0f4be0e6-3639-49a3-bc5f-afe17fc98506', 
    'Test Task', 
    'This is a test task to verify the table works', 
    'medium', 
    'todo'
) ON CONFLICT DO NOTHING;

-- 4. Query the task back
SELECT * FROM enhanced_tasks WHERE client_id = '0f4be0e6-3639-49a3-bc5f-afe17fc98506';

-- 5. Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'enhanced_tasks';
