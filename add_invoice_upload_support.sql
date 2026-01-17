-- Add invoice upload support
-- Run this in your Supabase SQL Editor

-- Add invoice_type column to uploads table
ALTER TABLE uploads 
ADD COLUMN IF NOT EXISTS upload_type TEXT DEFAULT 'general' CHECK (upload_type IN ('general', 'invoice', 'stripe_invoice'));

-- Add invoice-specific fields
ALTER TABLE uploads 
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS invoice_date DATE,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS amount_cents INTEGER,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'waiting_for_payment', 'not_due', 'due_upon_completion', 'overdue', 'cancelled', 'draft'));

-- Create invoices table for better invoice management
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    upload_id UUID REFERENCES uploads(id) ON DELETE SET NULL,
    stripe_invoice_id TEXT,
    invoice_number TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'waiting_for_payment', 'not_due', 'due_upon_completion', 'overdue', 'cancelled', 'draft')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Admin policies for invoices
DROP POLICY IF EXISTS "Admin full access to invoices" ON invoices;
CREATE POLICY "Admin full access to invoices" ON invoices
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Client read policy for invoices
DROP POLICY IF EXISTS "Client read own invoices" ON invoices;
CREATE POLICY "Client read own invoices" ON invoices
    FOR SELECT 
    USING (
        client_id = auth.uid()
    );

-- Create indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date DESC);

-- Add comments
COMMENT ON TABLE invoices IS 'Client invoices from uploads or Stripe';
COMMENT ON COLUMN uploads.upload_type IS 'Type of upload: general, invoice, or stripe_invoice';
COMMENT ON COLUMN uploads.invoice_number IS 'Invoice number if this is an invoice upload';
COMMENT ON COLUMN invoices.amount_cents IS 'Invoice amount in cents';
COMMENT ON COLUMN invoices.status IS 'Invoice payment status';
