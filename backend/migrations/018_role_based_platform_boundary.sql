-- 018_role_based_platform_boundary.sql
--
-- Forward-only RLS hardening for the unified platform. Idempotent; safe to re-run.
-- Applied by backend/scripts/run_migrations.py (each migration in its own
-- transaction, recorded in schema_migrations). Defers transaction control to the
-- runner (no BEGIN/COMMIT), matching 013-016, and changes NO earlier migration.
-- Follows the already-applied 017_rls_least_privilege.sql. The runner also calls
-- app.security_rls.apply_rls() after all migrations (cognito mode), which converges
-- to the SAME end state this file sets (role LOGIN + passwords come from apply_rls;
-- this file provisions roles as NOLOGIN so no secret ever lives in a migration).
--
-- What it enforces, matching app/security_rls.py:
--   1. Two least-privilege roles: app_user (ordinary runtime) and app_platform (Super
--      Admin cross-agency). Neither is SUPERUSER or BYPASSRLS. app_platform's
--      cross-agency reach is a role-keyed policy clause (current_user='app_platform'),
--      NOT a GUC and NOT a bypass — the retired forgeable app.platform_admin GUC is
--      no longer referenced by any policy.
--   2. Explicit per-table grant matrix (CRUD data; SELECT+INSERT append-only audit;
--      SELECT read-only QA config; scoped app_settings sequence; SELECT on the
--      migration ledger) to BOTH roles. PUBLIC stripped; default privileges revoked.
--   3. agency_isolation policies with USING + WITH CHECK. agency_memberships uses
--      per-command policies so ordinary members cannot create memberships, self-grant
--      admin, or change authorization records — only agency-admins (or platform) can.

-- 1. Roles (NOLOGIN here; apply_rls grants LOGIN + the configured password safely).
DO $$
DECLARE r text; parent text;
BEGIN
    FOREACH r IN ARRAY ARRAY['app_user','app_platform'] LOOP
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = r) THEN
            EXECUTE format('CREATE ROLE %I NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE', r);
        ELSE
            EXECUTE format('ALTER ROLE %I NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE', r);
        END IF;
        FOR parent IN
            SELECT p.rolname FROM pg_auth_members m
            JOIN pg_roles p ON p.oid=m.roleid
            JOIN pg_roles c ON c.oid=m.member WHERE c.rolname=r
        LOOP
            EXECUTE format('REVOKE %I FROM %I', parent, r);
        END LOOP;
    END LOOP;
END $$;

-- 2. Permission matrix to BOTH runtime roles.
DO $$
DECLARE
    r text;
    t text;
    crud text[] := ARRAY[
        'agencies','agency_memberships','agency_files','pipeline_runs','analytics_column_settings',
        'app_settings','client_feedback','data_cleaning_results','data_profiles','data_uploads',
        'documents','email_verification_tokens','ems_analytics_snapshots','ems_column_mappings',
        'ems_dashboard_metrics','ems_dataset_groups','ems_incidents','emscharts_connections',
        'enhanced_tasks','invoices','lead_suppressions','leads','messages','module_entitlements',
        'organizations','outreach_messages','password_reset_tokens','profiles','projects',
        'revenue_pipeline','sessions','sync_runs','tool_usage','uploads','users','web_events','web_sessions'];
    appendonly text[] := ARRAY['audit_logs','platform_audit_events','impersonation_logs','error_logs'];
BEGIN
    FOREACH r IN ARRAY ARRAY['app_user','app_platform'] LOOP
        EXECUTE format('REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM %I', r);
        EXECUTE format('REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
        EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', r);
        FOREACH t IN ARRAY crud LOOP
            IF to_regclass('public.' || t) IS NOT NULL THEN
                EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO %I', t, r);
            END IF;
        END LOOP;
        FOREACH t IN ARRAY appendonly LOOP
            IF to_regclass('public.' || t) IS NOT NULL THEN
                EXECUTE format('GRANT SELECT, INSERT ON %I TO %I', t, r);
            END IF;
        END LOOP;
        IF EXISTS (SELECT FROM pg_class WHERE relkind='S' AND relname='app_settings_id_seq') THEN
            EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE app_settings_id_seq TO %I', r);
        END IF;
        IF to_regclass('public.schema_migrations') IS NOT NULL THEN
            EXECUTE format('GRANT SELECT ON schema_migrations TO %I', r);
        END IF;
    END LOOP;
END $$;

-- PUBLIC + default privileges.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC;

-- 3a. agency_memberships — per-command policies (admin-gated writes).
DO $$
DECLARE
    cur_agency CONSTANT text := 'NULLIF(current_setting(''app.current_agency'', true), '''')::uuid';
    cur_user   CONSTANT text := 'NULLIF(current_setting(''app.current_user'', true), '''')::uuid';
    platform   CONSTANT text := 'current_user = ''app_platform''';
    read_rule  text;
    write_rule text;
    admin_of   text;
BEGIN
    IF to_regclass('public.agency_memberships') IS NULL THEN RETURN; END IF;
    admin_of := format('EXISTS (SELECT 1 FROM agency_memberships m WHERE m.user_id = %s AND m.agency_id = %s AND m.is_agency_admin)', cur_user, cur_agency);
    read_rule := format('user_id = %s OR agency_id = %s OR %s', cur_user, cur_agency, platform);
    write_rule := format('(agency_id = %s AND %s) OR %s', cur_agency, admin_of, platform);
    EXECUTE 'ALTER TABLE agency_memberships ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE agency_memberships NO FORCE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS agency_isolation ON agency_memberships';
    EXECUTE 'DROP POLICY IF EXISTS agency_memberships_sel ON agency_memberships';
    EXECUTE 'DROP POLICY IF EXISTS agency_memberships_ins ON agency_memberships';
    EXECUTE 'DROP POLICY IF EXISTS agency_memberships_upd ON agency_memberships';
    EXECUTE 'DROP POLICY IF EXISTS agency_memberships_del ON agency_memberships';
    EXECUTE format('CREATE POLICY agency_memberships_sel ON agency_memberships FOR SELECT USING (%s)', read_rule);
    EXECUTE format('CREATE POLICY agency_memberships_ins ON agency_memberships FOR INSERT WITH CHECK (%s)', write_rule);
    EXECUTE format('CREATE POLICY agency_memberships_upd ON agency_memberships FOR UPDATE USING (%s) WITH CHECK (%s)', write_rule, write_rule);
    EXECUTE format('CREATE POLICY agency_memberships_del ON agency_memberships FOR DELETE USING (%s)', write_rule);
END $$;

-- 3b. All other tenancy tables — agency_isolation (USING + WITH CHECK), role-based platform clause.
DO $$
DECLARE
    cur_agency CONSTANT text := 'NULLIF(current_setting(''app.current_agency'', true), '''')::uuid';
    cur_user   CONSTANT text := 'NULLIF(current_setting(''app.current_user'', true), '''')::uuid';
    platform   CONSTANT text := 'current_user = ''app_platform''';
    t text;
    using_expr text;
    check_expr text;
    straight text[] := ARRAY['agency_files','audit_logs','pipeline_runs','ems_dataset_groups',
        'data_uploads','emscharts_connections','sync_runs','ems_incidents','ems_analytics_snapshots'];
    children text[] := ARRAY['data_cleaning_results','ems_dashboard_metrics','data_profiles',
        'analytics_column_settings','ems_column_mappings'];
BEGIN
    -- agencies: read = current OR member-of; write = current.
    IF to_regclass('public.agencies') IS NOT NULL THEN
        using_expr := format('id = %s OR EXISTS (SELECT 1 FROM agency_memberships m WHERE m.agency_id = agencies.id AND m.user_id = %s)', cur_agency, cur_user);
        check_expr := format('id = %s', cur_agency);
        EXECUTE 'ALTER TABLE agencies ENABLE ROW LEVEL SECURITY';
        EXECUTE 'ALTER TABLE agencies NO FORCE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS agency_isolation ON agencies';
        EXECUTE format('CREATE POLICY agency_isolation ON agencies USING ((%s) OR %s) WITH CHECK ((%s) OR %s)', using_expr, platform, check_expr, platform);
    END IF;
    -- straight agency_id tables: read = write = current agency.
    FOREACH t IN ARRAY straight LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            using_expr := format('agency_id = %s', cur_agency);
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', t);
            EXECUTE format('DROP POLICY IF EXISTS agency_isolation ON %I', t);
            EXECUTE format('CREATE POLICY agency_isolation ON %I USING ((%s) OR %s) WITH CHECK ((%s) OR %s)', t, using_expr, platform, using_expr, platform);
        END IF;
    END LOOP;
    -- children: ownership via parent data_upload.
    FOREACH t IN ARRAY children LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            using_expr := format('EXISTS (SELECT 1 FROM data_uploads u WHERE u.id = data_upload_id AND u.agency_id = %s)', cur_agency);
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', t);
            EXECUTE format('DROP POLICY IF EXISTS agency_isolation ON %I', t);
            EXECUTE format('CREATE POLICY agency_isolation ON %I USING ((%s) OR %s) WITH CHECK ((%s) OR %s)', t, using_expr, platform, using_expr, platform);
        END IF;
    END LOOP;
END $$;

-- 3c. EMSCS QA tables (only if provisioned).
DO $$
DECLARE
    cur_agency CONSTANT text := 'NULLIF(current_setting(''app.current_agency'', true), '''')::uuid';
    platform   CONSTANT text := 'current_user = ''app_platform''';
    r text;
    t text;
    qa_crud text[] := ARRAY['qa_charts','qa_review_sessions','qa_indicator_reviews','qa_findings','qa_crew_feedback','qa_scores'];
    qa_config text[] := ARRAY['qa_scoring_domains','qa_indicators','qa_scoring_configs'];
BEGIN
    FOREACH r IN ARRAY ARRAY['app_user','app_platform'] LOOP
        FOREACH t IN ARRAY qa_crud LOOP
            IF to_regclass('public.' || t) IS NOT NULL THEN EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO %I', t, r); END IF;
        END LOOP;
        IF to_regclass('public.qa_audit_events') IS NOT NULL THEN EXECUTE format('GRANT SELECT, INSERT ON qa_audit_events TO %I', r); END IF;
        FOREACH t IN ARRAY qa_config LOOP
            IF to_regclass('public.' || t) IS NOT NULL THEN EXECUTE format('GRANT SELECT ON %I TO %I', t, r); END IF;
        END LOOP;
    END LOOP;
    FOREACH t IN ARRAY (qa_crud || ARRAY['qa_audit_events']) LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', t);
            EXECUTE format('DROP POLICY IF EXISTS agency_isolation ON %I', t);
            EXECUTE format('CREATE POLICY agency_isolation ON %I USING (agency_id = %s OR %s) WITH CHECK (agency_id = %s OR %s)', t, cur_agency, platform, cur_agency, platform);
        END IF;
    END LOOP;
END $$;
