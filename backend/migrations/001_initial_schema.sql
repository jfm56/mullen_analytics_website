-- Migration: Initial Schema for FastAPI Backend
-- Replaces Supabase tables with standalone PostgreSQL
-- Run this against your PostgreSQL database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE (replaces Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_confirmed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sign_in_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- PROFILES TABLE (matches existing Supabase profiles)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'client',
    full_name VARCHAR(255),
    company VARCHAR(255),
    logo_url TEXT,
    
    -- Project fields
    project_name VARCHAR(255),
    project_status VARCHAR(50) DEFAULT 'Not Started',
    project_phase VARCHAR(50) DEFAULT 'discovery',
    project_deadline TIMESTAMP WITH TIME ZONE,
    
    -- Client status
    client_status VARCHAR(50) DEFAULT 'prospect',
    health_score INTEGER DEFAULT 0,
    contract_value DECIMAL(12,2) DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE,
    renewal_date TIMESTAMP WITH TIME ZONE,
    
    -- Check-in
    next_check_in TIMESTAMP WITH TIME ZONE,
    check_in_notes TEXT,
    
    -- Dashboard embed
    tableau_embed_html TEXT,
    tableau_embed_type VARCHAR(50) DEFAULT 'dashboard',
    tableau_open_url TEXT,
    
    -- Upload settings
    upload_enabled BOOLEAN DEFAULT FALSE,
    allowed_file_types VARCHAR(255) DEFAULT 'csv,xlsx,json,pdf',
    max_upload_mb INTEGER DEFAULT 50,
    
    -- Metadata
    tags JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_client_status ON profiles(client_status);

-- ============================================
-- SESSIONS TABLE (for HTTP-only cookie auth)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================
-- PASSWORD RESET TOKENS
-- ============================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_name VARCHAR(255) DEFAULT 'Mullen Analytics',
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- ============================================
-- INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Invoice details
    number VARCHAR(100),
    description TEXT,
    amount_due INTEGER DEFAULT 0,  -- In cents
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending',
    
    -- Type and source
    type VARCHAR(50) DEFAULT 'uploaded',
    stripe_invoice_id VARCHAR(255),
    hosted_invoice_url TEXT,
    
    -- File (for uploaded invoices)
    file_path TEXT,
    file_url TEXT,
    original_filename VARCHAR(255),
    
    -- Dates
    invoice_date TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ============================================
-- UPLOADS TABLE (client file uploads)
-- ============================================
CREATE TABLE IF NOT EXISTS uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- File info
    original_filename VARCHAR(500) NOT NULL,
    storage_path TEXT NOT NULL,
    content_type VARCHAR(255),
    size_bytes INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    
    -- Metadata
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_uploads_client_id ON uploads(client_id);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status);

-- ============================================
-- DOCUMENTS TABLE (admin-uploaded documents)
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id),
    
    -- File info
    title VARCHAR(500) NOT NULL,
    description TEXT,
    original_filename VARCHAR(500) NOT NULL,
    storage_path TEXT NOT NULL,
    content_type VARCHAR(255),
    size_bytes INTEGER DEFAULT 0,
    
    -- Metadata
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);

-- ============================================
-- ENHANCED TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS enhanced_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Task details
    title VARCHAR(500) NOT NULL,
    description TEXT,
    priority VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'todo',
    
    -- Project linkage
    linked_project VARCHAR(255),
    
    -- Time tracking
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_hours DECIMAL(6,2),
    actual_hours DECIMAL(6,2),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_enhanced_tasks_client_id ON enhanced_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_tasks_status ON enhanced_tasks(status);

-- ============================================
-- REVENUE PIPELINE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS revenue_pipeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Deal info
    deal_name VARCHAR(500) NOT NULL,
    company_name VARCHAR(255),
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    
    -- Pipeline stage
    stage VARCHAR(100) DEFAULT 'lead',
    probability DECIMAL(5,2) DEFAULT 0,
    
    -- Value
    deal_value DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    
    -- Dates
    expected_close_date TIMESTAMP WITH TIME ZONE,
    actual_close_date TIMESTAMP WITH TIME ZONE,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revenue_pipeline_stage ON revenue_pipeline(stage);
CREATE INDEX IF NOT EXISTS idx_revenue_pipeline_client_id ON revenue_pipeline(client_id);

-- ============================================
-- ONBOARDING TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS onboarding_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    client_type VARCHAR(100),
    task_templates JSONB DEFAULT '[]'::jsonb,
    project_phases JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- HELPER FUNCTION: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enhanced_tasks_updated_at BEFORE UPDATE ON enhanced_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_revenue_pipeline_updated_at BEFORE UPDATE ON revenue_pipeline
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_templates_updated_at BEFORE UPDATE ON onboarding_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CLEANUP: Remove expired sessions (run periodically)
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW();
    DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used_at IS NOT NULL;
END;
$$ language 'plpgsql';

-- ============================================
-- DONE
-- ============================================
-- Run this script against your PostgreSQL database:
-- psql -U your_user -d your_database -f 001_initial_schema.sql
