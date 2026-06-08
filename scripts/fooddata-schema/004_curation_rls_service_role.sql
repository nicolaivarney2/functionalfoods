-- Kør i GROCERY Supabase (GROCERY_SUPABASE_URL) — IKKE FF main DB.
-- Efter 001 + 002 + 003.
--
-- Fixer: "new row violates row-level security policy" ved FF/Planomo push
-- (sb_secret_* / service_role skal kunne læse+skrive kurering-tabeller).

-- ─── RLS: service_role fuld adgang (server-only tabeller) ─────────────────

ALTER TABLE public.product_ingredient_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ingredient_match_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_dietary_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_organic_tags ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'product_ingredient_matches',
    'product_ingredient_match_queue',
    'ingredient_dietary_tags',
    'product_organic_tags'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS service_role_full_access ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY service_role_full_access ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;

-- ─── Grants (sikkerhedsnet hvis default grants mangler) ─────────────────────

GRANT ALL ON TABLE public.product_ingredient_matches TO service_role;
GRANT ALL ON TABLE public.product_ingredient_match_queue TO service_role;
GRANT ALL ON TABLE public.ingredient_dietary_tags TO service_role;
GRANT ALL ON TABLE public.product_organic_tags TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
