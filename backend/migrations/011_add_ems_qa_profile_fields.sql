-- 011_add_ems_qa_profile_fields.sql
-- EMS QA add-on entitlement on a client profile. Drives the portal -> EMS QA
-- single sign-on handoff: when ems_qa_enabled, the portal shows the "QA Platform"
-- tile and mints a signed token carrying ems_agency_slug + ems_role.
-- Idempotent; also applied via the startup self-heal patches in app/main.py.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ems_qa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ems_agency_slug VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ems_role VARCHAR(50);
