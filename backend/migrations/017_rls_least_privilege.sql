-- 017_rls_least_privilege.sql
--
-- Forward-only RLS hardening for the unified platform (staging/production).
-- Idempotent and safe to re-run. Apply as the SCHEMA OWNER (not app_user).
--
-- What it does, matching app/security_rls.py (apply_rls + apply_rls_qa):
--   1. Revokes the historical blanket privileges from app_user.
--   2. Grants least-privilege, per-table: CRUD for data tables, SELECT+INSERT for
--      append-only audit/error trails, SELECT for read-only QA config. No grant on
--      ALL TABLES / ALL SEQUENCES; only the one integer-PK sequence is granted.
--   3. Recreates the agency_isolation policies with BOTH USING (reads) and
--      WITH CHECK (writes) so cross-agency INSERT/UPDATE is rejected, not just hidden.
--
-- Applied by backend/scripts/run_migrations.py, which runs each migration inside a
-- single transaction, records it in schema_migrations (filename + sha256), and holds
-- an advisory lock — so this file does NOT manage its own transaction (no BEGIN/COMMIT),
-- matching 013-016. It sits immediately after 016_unified_platform_identity.sql and
-- changes NO earlier migration. The runner also calls apply_rls() after all migrations
-- in cognito mode, which converges to the same hardened state this file sets.

-- app_user must already exist (apply_rls / an earlier migration creates it). Fail
-- loudly if it does not, rather than silently skipping the hardening.
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
        RAISE EXCEPTION 'role app_user does not exist; provision it before 017';
    END IF;
END $$;

-- 1. Strip any previously over-granted privileges (the old blanket grant).
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM app_user;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM app_user;
GRANT USAGE ON SCHEMA public TO app_user;

-- 2a. CRUD data tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON
    agencies, agency_files, agency_memberships, analytics_column_settings,
    app_settings, client_feedback, data_cleaning_results, data_profiles,
    data_uploads, documents, email_verification_tokens, ems_analytics_snapshots,
    ems_column_mappings, ems_dashboard_metrics, ems_dataset_groups, ems_incidents,
    emscharts_connections, enhanced_tasks, invoices, lead_suppressions, leads,
    messages, module_entitlements, organizations, outreach_messages,
    password_reset_tokens, pipeline_runs, profiles, projects, revenue_pipeline,
    sessions, sync_runs, tool_usage, uploads, users, web_events, web_sessions
TO app_user;

-- 2b. Append-only audit / error trails: SELECT + INSERT only (no UPDATE/DELETE).
GRANT SELECT, INSERT ON
    audit_logs, platform_audit_events, impersonation_logs, error_logs
TO app_user;

-- 2c. Scoped sequence grant: only the one integer-PK table (app_settings); every
--     other PK is a client-generated UUID. Guarded in case the sequence is absent.
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_class WHERE relkind = 'S' AND relname = 'app_settings_id_seq') THEN
        EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE app_settings_id_seq TO app_user';
    END IF;
END $$;

-- 3. Recreate agency_isolation policies with USING + WITH CHECK on every tenancy
--    table. ENABLE (NO FORCE) so the owner remains exempt for maintenance; the
--    non-owner app_user is fully subject to the policy at runtime.
DO $$
DECLARE
    cur_agency CONSTANT text := 'NULLIF(current_setting(''app.current_agency'', true), '''')::uuid';
    cur_user   CONSTANT text := 'NULLIF(current_setting(''app.current_user'', true), '''')::uuid';
    platform   CONSTANT text := 'NULLIF(current_setting(''app.platform_admin'', true), '''') = ''true''';
    t text;
    using_expr text;
    check_expr text;
BEGIN
    FOR t, using_expr, check_expr IN
        SELECT * FROM (VALUES
            -- Memberships: visible for your own (switcher) OR the current agency;
            -- writable ONLY in the current agency's verified context (closes the
            -- self-grant-into-arbitrary-agency vector).
            ('agency_memberships',
             format('user_id = %s OR agency_id = %s', cur_user, cur_agency),
             format('agency_id = %s', cur_agency)),
            -- Agencies: visible for the current agency OR any you belong to;
            -- writable only in the agency's own context.
            ('agencies',
             format('id = %s OR EXISTS (SELECT 1 FROM agency_memberships m WHERE m.agency_id = agencies.id AND m.user_id = %s)', cur_agency, cur_user),
             format('id = %s', cur_agency)),
            -- Straight agency_id tables: read and write confined to the current agency.
            ('agency_files', format('agency_id = %s', cur_agency), format('agency_id = %s', cur_agency)),
            ('audit_logs', format('agency_id = %s', cur_agency), format('agency_id = %s', cur_agency)),
            ('pipeline_runs', format('agency_id = %s', cur_agency), format('agency_id = %s', cur_agency)),
            ('ems_dataset_groups', format('agency_id = %s', cur_agency), format('agency_id = %s', cur_agency)),
            ('data_uploads', format('agency_id = %s', cur_agency), format('agency_id = %s', cur_agency)),
            ('emscharts_connections', format('agency_id = %s', cur_agency), format('agency_id = %s', cur_agency)),
            ('sync_runs', format('agency_id = %s', cur_agency), format('agency_id = %s', cur_agency)),
            ('ems_incidents', format('agency_id = %s', cur_agency), format('agency_id = %s', cur_agency)),
            ('ems_analytics_snapshots', format('agency_id = %s', cur_agency), format('agency_id = %s', cur_agency)),
            -- Analytics children: ownership inherited through the parent data_upload.
            ('data_cleaning_results', format('EXISTS (SELECT 1 FROM data_uploads u WHERE u.id = data_upload_id AND u.agency_id = %s)', cur_agency), format('EXISTS (SELECT 1 FROM data_uploads u WHERE u.id = data_upload_id AND u.agency_id = %s)', cur_agency)),
            ('ems_dashboard_metrics', format('EXISTS (SELECT 1 FROM data_uploads u WHERE u.id = data_upload_id AND u.agency_id = %s)', cur_agency), format('EXISTS (SELECT 1 FROM data_uploads u WHERE u.id = data_upload_id AND u.agency_id = %s)', cur_agency)),
            ('data_profiles', format('EXISTS (SELECT 1 FROM data_uploads u WHERE u.id = data_upload_id AND u.agency_id = %s)', cur_agency), format('EXISTS (SELECT 1 FROM data_uploads u WHERE u.id = data_upload_id AND u.agency_id = %s)', cur_agency)),
            ('analytics_column_settings', format('EXISTS (SELECT 1 FROM data_uploads u WHERE u.id = data_upload_id AND u.agency_id = %s)', cur_agency), format('EXISTS (SELECT 1 FROM data_uploads u WHERE u.id = data_upload_id AND u.agency_id = %s)', cur_agency)),
            ('ems_column_mappings', format('EXISTS (SELECT 1 FROM data_uploads u WHERE u.id = data_upload_id AND u.agency_id = %s)', cur_agency), format('EXISTS (SELECT 1 FROM data_uploads u WHERE u.id = data_upload_id AND u.agency_id = %s)', cur_agency))
        ) AS v(t, using_expr, check_expr)
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS agency_isolation ON %I', t);
        EXECUTE format(
            'CREATE POLICY agency_isolation ON %I USING ((%s) OR %s) WITH CHECK ((%s) OR %s)',
            t, using_expr, platform, check_expr, platform
        );
    END LOOP;
END $$;

-- 3b. EMSCS QA tables (only if provisioned — the feature flag may be off).
DO $$
DECLARE
    cur_agency CONSTANT text := 'NULLIF(current_setting(''app.current_agency'', true), '''')::uuid';
    platform   CONSTANT text := 'NULLIF(current_setting(''app.platform_admin'', true), '''') = ''true''';
    t text;
BEGIN
    -- Agency-owned QA tables: CRUD, except the append-only qa_audit_events.
    FOREACH t IN ARRAY ARRAY['qa_charts','qa_review_sessions','qa_indicator_reviews','qa_findings','qa_crew_feedback','qa_scores']
    LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO app_user', t);
        END IF;
    END LOOP;
    IF to_regclass('public.qa_audit_events') IS NOT NULL THEN
        EXECUTE 'GRANT SELECT, INSERT ON qa_audit_events TO app_user';
    END IF;
    -- Read-only QA config (shared methodology).
    FOREACH t IN ARRAY ARRAY['qa_scoring_domains','qa_indicators','qa_scoring_configs']
    LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            EXECUTE format('GRANT SELECT ON %I TO app_user', t);
        END IF;
    END LOOP;
    -- Policies (USING + WITH CHECK) on the agency-owned QA tables.
    FOREACH t IN ARRAY ARRAY['qa_charts','qa_review_sessions','qa_indicator_reviews','qa_findings','qa_crew_feedback','qa_scores','qa_audit_events']
    LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', t);
            EXECUTE format('DROP POLICY IF EXISTS agency_isolation ON %I', t);
            EXECUTE format(
                'CREATE POLICY agency_isolation ON %I USING (agency_id = %s OR %s) WITH CHECK (agency_id = %s OR %s)',
                t, cur_agency, platform, cur_agency, platform
            );
        END IF;
    END LOOP;
END $$;
