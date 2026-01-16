-- Admin Dashboard Database Migration
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. CREATE TABLES
-- ============================================

-- A) clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  primary_email TEXT,
  status TEXT DEFAULT 'lead' CHECK (status IN ('lead','active','on_hold','completed')),
  last_contacted_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- B) client_contacts
CREATE TABLE IF NOT EXISTS client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- C) client_notes
CREATE TABLE IF NOT EXISTS client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- D) projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'discovery' CHECK (status IN ('discovery','build','validate','deliver','maintenance')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- E) tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','complete')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- F) messages (threaded per client)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES auth.users(id),
  sender_email TEXT,
  body TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- G) activity_log (audit trail)
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_clients_owner_id ON clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_next_followup ON clients(next_followup_at);

CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_client_id ON client_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor_id ON activity_log(actor_id);

-- ============================================
-- 3. ENABLE RLS
-- ============================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE RLS POLICIES
-- ============================================

-- Clients: users can manage their own clients
CREATE POLICY "Users can select their own clients" ON clients
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can insert their own clients" ON clients
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own clients" ON clients
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own clients" ON clients
  FOR DELETE USING (owner_id = auth.uid());

-- Client contacts: access via client ownership
CREATE POLICY "Users can select contacts for their clients" ON client_contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = client_contacts.client_id 
      AND clients.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert contacts for their clients" ON client_contacts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = client_contacts.client_id 
      AND clients.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update contacts for their clients" ON client_contacts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = client_contacts.client_id 
      AND clients.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete contacts for their clients" ON client_contacts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = client_contacts.client_id 
      AND clients.owner_id = auth.uid()
    )
  );

-- Client notes: access via client ownership
CREATE POLICY "Users can select notes for their clients" ON client_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = client_notes.client_id 
      AND clients.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert notes for their clients" ON client_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = client_notes.client_id 
      AND clients.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own notes" ON client_notes
  FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Users can delete their own notes" ON client_notes
  FOR DELETE USING (author_id = auth.uid());

-- Projects: access via client ownership
CREATE POLICY "Users can select projects for their clients" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = projects.client_id 
      AND clients.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert projects for their clients" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = projects.client_id 
      AND clients.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update projects for their clients" ON projects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = projects.client_id 
      AND clients.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete projects for their clients" ON projects
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = projects.client_id 
      AND clients.owner_id = auth.uid()
    )
  );

-- Tasks: access via client or project ownership
CREATE POLICY "Users can select tasks for their clients/projects" ON tasks
  FOR SELECT USING (
    (client_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = tasks.client_id 
      AND clients.owner_id = auth.uid()
    ))
    OR
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM projects 
      JOIN clients ON clients.id = projects.client_id
      WHERE projects.id = tasks.project_id 
      AND clients.owner_id = auth.uid()
    ))
  );

CREATE POLICY "Users can insert tasks for their clients/projects" ON tasks
  FOR INSERT WITH CHECK (
    (client_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = tasks.client_id 
      AND clients.owner_id = auth.uid()
    ))
    OR
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM projects 
      JOIN clients ON clients.id = projects.client_id
      WHERE projects.id = tasks.project_id 
      AND clients.owner_id = auth.uid()
    ))
  );

CREATE POLICY "Users can update tasks for their clients/projects" ON tasks
  FOR UPDATE USING (
    (client_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = tasks.client_id 
      AND clients.owner_id = auth.uid()
    ))
    OR
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM projects 
      JOIN clients ON clients.id = projects.client_id
      WHERE projects.id = tasks.project_id 
      AND clients.owner_id = auth.uid()
    ))
  );

CREATE POLICY "Users can delete tasks for their clients/projects" ON tasks
  FOR DELETE USING (
    (client_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = tasks.client_id 
      AND clients.owner_id = auth.uid()
    ))
    OR
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM projects 
      JOIN clients ON clients.id = projects.client_id
      WHERE projects.id = tasks.project_id 
      AND clients.owner_id = auth.uid()
    ))
  );

-- Messages: access via client ownership
CREATE POLICY "Users can select messages for their clients" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = messages.client_id 
      AND clients.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages for their clients" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = messages.client_id 
      AND clients.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages for their clients" ON messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = messages.client_id 
      AND clients.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages for their clients" ON messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = messages.client_id 
      AND clients.owner_id = auth.uid()
    )
  );

-- Activity log: users can insert any activity, select their own
CREATE POLICY "Authenticated users can insert activity" ON activity_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can select their own activity" ON activity_log
  FOR SELECT USING (actor_id = auth.uid());

-- ============================================
-- SUCCESS
-- ============================================

DO $$
BEGIN
    RAISE NOTICE 'Admin Dashboard migration completed successfully!';
    RAISE NOTICE 'Tables created: clients, client_contacts, client_notes, projects, tasks, messages, activity_log';
    RAISE NOTICE 'RLS policies enabled for all tables';
END $$;
