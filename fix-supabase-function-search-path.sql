-- Fix Supabase linter: Function Search Path Mutable (WARN)
-- Sætter search_path for at undgå search_path injection
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- Inkluder auth så auth.uid() resolver korrekt
DO $$
BEGIN
  ALTER FUNCTION public.handle_new_user() SET search_path = public, auth, pg_catalog;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER FUNCTION public.is_admin() SET search_path = public, auth, pg_catalog;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
ALTER FUNCTION public.cleanup_old_price_history() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_blog_post_comment_count() SET search_path = public, pg_catalog;
