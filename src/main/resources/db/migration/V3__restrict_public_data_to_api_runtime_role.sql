-- LibTrack data is accessed only through the Spring API. Do not expose the
-- public schema to Supabase's browser-facing anon/authenticated PostgREST roles.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'libtrack_runtime') THEN
        RAISE EXCEPTION 'Create the libtrack_runtime database role before running LibTrack migrations';
    END IF;
END;
$$;

REVOKE ALL ON SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

GRANT USAGE ON SCHEMA public TO libtrack_runtime;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO libtrack_runtime;
GRANT DELETE ON TABLE public.book_authors, public.book_categories TO libtrack_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO libtrack_runtime;

-- Apply the same isolation to objects created by later Flyway migrations.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE ON TABLES TO libtrack_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO libtrack_runtime;

COMMENT ON ROLE libtrack_runtime IS
    'Private JDBC role used by the LibTrack Spring API; browser Supabase roles have no access to LibTrack data.';
