-- Create project_status_items table
CREATE TABLE IF NOT EXISTS project_status_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'In progress', 'Complete')),
    owner TEXT NOT NULL DEFAULT 'Mullen Analytics',
    target_date_text TEXT,
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE project_status_items ENABLE ROW LEVEL SECURITY;

-- Admin policy (can do everything)
CREATE POLICY "Admin full access to project_status_items" ON project_status_items
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Client read policy (can read their own items)
CREATE POLICY "Client read own project_status_items" ON project_status_items
    FOR SELECT 
    USING (
        client_id = auth.uid()
    );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_project_status_items_client_id ON project_status_items(client_id);
CREATE INDEX IF NOT EXISTS idx_project_status_items_sort_order ON project_status_items(client_id, sort_order);

-- Add comments
COMMENT ON TABLE project_status_items IS 'Project status items that appear in client portal';
COMMENT ON COLUMN project_status_items.client_id IS 'Reference to the client (profiles table)';
COMMENT ON COLUMN project_status_items.title IS 'Title of the project step';
COMMENT ON COLUMN project_status_items.description IS 'Detailed description of the project step';
COMMENT ON COLUMN project_status_items.status IS 'Current status: Planned, In progress, or Complete';
COMMENT ON COLUMN project_status_items.owner IS 'Who is responsible for this step';
COMMENT ON COLUMN project_status_items.target_date_text IS 'Human-readable target date or timeline';
COMMENT ON COLUMN project_status_items.progress_percent IS 'Progress percentage from 0-100';
COMMENT ON COLUMN project_status_items.sort_order IS 'Display order for the items';
