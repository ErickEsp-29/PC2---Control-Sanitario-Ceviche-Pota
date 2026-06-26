-- Migration to grant privileges on public schema tables, sequences and functions to Supabase roles
-- This resolves the 403 Forbidden errors encountered during API calls.

-- 1. Grant usage on schema public
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Grant all privileges on tables to API roles
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. Grant usage on all sequences (for auto-increment IDs if any)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 4. Grant execute on all functions in schema public
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 5. Alter default privileges so future tables automatically get these grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
