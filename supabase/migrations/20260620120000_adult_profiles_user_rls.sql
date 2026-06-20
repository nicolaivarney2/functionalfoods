-- Sikrer at adult_weight_loss_profiles har bruger-niveau RLS-policies, så
-- Functional Foods-app'en kan læse/skrive brugerens egne diæt-profiler DIREKTE
-- via Supabase (auth.uid() = user_id) — præcis som family_profiles.
--
-- Baggrund: FF-web skriver kun til tabellen server-side med service-role-nøglen
-- (der omgår RLS), så tabellen manglede muligvis bruger-policies. App'en bruger
-- den anon/authenticated-klient og er derfor afhængig af disse policies.
--
-- Migrationen er idempotent og additiv: den oprettes kun hvis tabellen findes,
-- den rører hverken skema eller data, og policies droppes/genskabes så den kan
-- køres flere gange uden fejl.

DO $$
BEGIN
  IF to_regclass('public.adult_weight_loss_profiles') IS NULL THEN
    RAISE NOTICE 'adult_weight_loss_profiles findes ikke endnu — springer RLS-opsætning over.';
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.adult_weight_loss_profiles ENABLE ROW LEVEL SECURITY';

  -- SELECT
  EXECUTE 'DROP POLICY IF EXISTS "Users can view own adult profiles" ON public.adult_weight_loss_profiles';
  EXECUTE $p$
    CREATE POLICY "Users can view own adult profiles"
      ON public.adult_weight_loss_profiles
      FOR SELECT
      USING (auth.uid() = user_id)
  $p$;

  -- INSERT
  EXECUTE 'DROP POLICY IF EXISTS "Users can insert own adult profiles" ON public.adult_weight_loss_profiles';
  EXECUTE $p$
    CREATE POLICY "Users can insert own adult profiles"
      ON public.adult_weight_loss_profiles
      FOR INSERT
      WITH CHECK (auth.uid() = user_id)
  $p$;

  -- UPDATE
  EXECUTE 'DROP POLICY IF EXISTS "Users can update own adult profiles" ON public.adult_weight_loss_profiles';
  EXECUTE $p$
    CREATE POLICY "Users can update own adult profiles"
      ON public.adult_weight_loss_profiles
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id)
  $p$;

  -- DELETE
  EXECUTE 'DROP POLICY IF EXISTS "Users can delete own adult profiles" ON public.adult_weight_loss_profiles';
  EXECUTE $p$
    CREATE POLICY "Users can delete own adult profiles"
      ON public.adult_weight_loss_profiles
      FOR DELETE
      USING (auth.uid() = user_id)
  $p$;
END $$;
