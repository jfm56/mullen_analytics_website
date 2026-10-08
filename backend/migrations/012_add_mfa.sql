-- 012_add_mfa.sql
-- Portal TOTP multi-factor auth. Every client enrolls at the portal entrance;
-- the same auth authority also preserves the EMS QA MFA guarantee.
-- These statements are idempotent and are also applied at startup by the
-- self-heal block in app/main.py (Railway does not run these SQL files).

ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_confirmed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_recovery_codes JSON DEFAULT '[]';

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS mfa_passed BOOLEAN DEFAULT FALSE;
