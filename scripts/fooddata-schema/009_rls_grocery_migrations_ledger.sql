-- Kør i GROCERY Supabase (GROCERY_SUPABASE_URL).
-- Fixer: rls_disabled_in_public på _grocery_migrations (kritisk sikkerhedsadvarsel).
-- Spejler src/grocery/db/migrations/005_rls_grocery_migrations_ledger.sql

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
