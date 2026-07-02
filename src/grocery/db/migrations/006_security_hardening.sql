-- Fix Supabase security advisor warnings:
-- - function_search_path_mutable on set_updated_at
-- - extension_in_public for pg_trgm

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
