-- Kør i GROCERY Supabase (GROCERY_SUPABASE_URL).
-- Fixer WARN: function_search_path_mutable + extension_in_public (pg_trgm).
-- Spejler src/grocery/db/migrations/006_security_hardening.sql

CREATE SCHEMA IF NOT EXISTS extensions;

ALTER EXTENSION pg_trgm SET SCHEMA extensions;

GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
