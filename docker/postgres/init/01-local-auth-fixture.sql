-- Local-only fixture for the Supabase Auth foreign key. Production uses the
-- actual Supabase-managed auth.users table and must never run this file.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE
);
GRANT USAGE ON SCHEMA auth TO libtrack;
GRANT SELECT ON auth.users TO libtrack;
