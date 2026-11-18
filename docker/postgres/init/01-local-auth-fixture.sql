-- Local-only fixture for the Supabase Auth foreign key. Production uses the
-- actual Supabase-managed auth.users table and must never run this file.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE
);
GRANT USAGE ON SCHEMA auth TO libtrack;
GRANT SELECT ON auth.users TO libtrack;
GRANT REFERENCES ON auth.users TO libtrack;

-- Minimal Supabase role names for local migration tests. Production Supabase
-- manages these roles; the hosted runtime role is created separately.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'libtrack_runtime') THEN
        CREATE ROLE libtrack_runtime NOLOGIN;
    END IF;
END;
$$;
