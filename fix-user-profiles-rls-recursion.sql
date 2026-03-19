-- Fix: Admin-menu forsvinder efter RLS på user_profiles
-- Årsag: Policies med "EXISTS (SELECT ... FROM user_profiles ...)" giver uendelig rekursion
--        på samme tabel → Supabase fejler SELECT → useAdminCheck får ingen role.
--
-- Kør i Supabase SQL Editor (én gang).

CREATE OR REPLACE FUNCTION public.check_user_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$;

REVOKE ALL ON FUNCTION public.check_user_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_user_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_is_admin() TO service_role;

DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;

CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT
  USING (public.check_user_is_admin());

CREATE POLICY "Admins can update all profiles" ON user_profiles
  FOR UPDATE
  USING (public.check_user_is_admin());
