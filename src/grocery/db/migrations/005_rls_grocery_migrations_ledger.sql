-- Fix Supabase security advisor: rls_disabled_in_public on _grocery_migrations.
-- Also add explicit service_role policies on catalog tables (matches 004 pattern).

ALTER TABLE public._grocery_migrations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    '_grocery_migrations',
    'stores',
    'products',
    'product_offers',
    'price_history',
    'sync_logs',
    'api_keys'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS service_role_full_access ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY service_role_full_access ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;

GRANT ALL ON TABLE public._grocery_migrations TO service_role;
