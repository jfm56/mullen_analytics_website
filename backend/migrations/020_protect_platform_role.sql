-- Owner-managed platform authorization; the ordinary shared role must never
-- mint a SUPER_ADMIN record and then use the API's platform connection.
-- The runner owns this transaction. The trigger runs with the caller's identity.
CREATE OR REPLACE FUNCTION public.guard_platform_role()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public AS $$
DECLARE changed boolean;
BEGIN
    IF TG_OP = 'INSERT' THEN
        changed := NEW.platform_role IS NOT NULL;
    ELSE
        changed := NEW.platform_role IS DISTINCT FROM OLD.platform_role;
    END IF;
    IF changed AND current_user <> 'app_platform' AND current_user <>
       pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid = TG_RELID)) THEN
        RAISE EXCEPTION 'Platform role changes require the platform identity'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_platform_role ON public.users;
CREATE TRIGGER guard_platform_role
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.guard_platform_role();
