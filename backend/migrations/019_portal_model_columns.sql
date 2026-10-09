-- Forward-only correction for columns formerly provisioned only at local startup.
-- Do not edit historical migrations. The migration runner owns the transaction.
-- 018 is reserved for the separately reviewed role-boundary migration.
-- Existing values are preserved; nullable access overrides retain plan defaults.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free_trial';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_status VARCHAR(50) DEFAULT 'trialing';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_selected_at TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS extra_dataset_slots INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS module_overrides JSON;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS direction VARCHAR(20) DEFAULT 'outbound';
