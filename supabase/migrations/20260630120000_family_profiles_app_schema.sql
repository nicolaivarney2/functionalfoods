-- family_profiles: sørg for at app + web deler samme madbudget-skema.
-- Appen skriver direkte via Supabase (RLS); web bruger service role.
-- Ældre DB'er (create-supermarket-tables.sql) manglede bl.a. children_ages og
-- excluded_ingredients — upsert fra app fejlede stille (42703 undefined column).

DO $$
BEGIN
  IF to_regclass('public.family_profiles') IS NULL THEN
    CREATE TABLE public.family_profiles (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
      adults INTEGER DEFAULT 2,
      children INTEGER DEFAULT 0,
      children_ages TEXT[] DEFAULT '{}',
      prioritize_organic BOOLEAN DEFAULT false,
      prioritize_animal_organic BOOLEAN DEFAULT false,
      excluded_ingredients TEXT[] DEFAULT '{}',
      selected_stores INTEGER[] DEFAULT '{}',
      variation_level INTEGER DEFAULT 2,
      included_recipe_categories TEXT[] DEFAULT '{}',
      lunchbox_config JSONB DEFAULT NULL,
      weekly_budget_kr INTEGER DEFAULT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    RETURN;
  END IF;

  ALTER TABLE public.family_profiles ADD COLUMN IF NOT EXISTS children_ages TEXT[] DEFAULT '{}';
  ALTER TABLE public.family_profiles ADD COLUMN IF NOT EXISTS excluded_ingredients TEXT[] DEFAULT '{}';
  ALTER TABLE public.family_profiles ADD COLUMN IF NOT EXISTS selected_stores INTEGER[] DEFAULT '{}';
  ALTER TABLE public.family_profiles ADD COLUMN IF NOT EXISTS variation_level INTEGER DEFAULT 2;
  ALTER TABLE public.family_profiles ADD COLUMN IF NOT EXISTS included_recipe_categories TEXT[] DEFAULT '{}';
  ALTER TABLE public.family_profiles ADD COLUMN IF NOT EXISTS lunchbox_config JSONB DEFAULT NULL;
  ALTER TABLE public.family_profiles ADD COLUMN IF NOT EXISTS weekly_budget_kr INTEGER DEFAULT NULL;

  -- Legacy: disliked_ingredients / children_age fra ældre supermarket-skema
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'family_profiles' AND column_name = 'disliked_ingredients'
  ) THEN
    EXECUTE $m$
      UPDATE public.family_profiles
      SET excluded_ingredients = COALESCE(excluded_ingredients, disliked_ingredients, '{}')
      WHERE (excluded_ingredients IS NULL OR excluded_ingredients = '{}')
        AND disliked_ingredients IS NOT NULL
    $m$;
  END IF;
END $$;

-- RLS så app-klienten (auth.uid()) kan læse/skrive egen profil
ALTER TABLE public.family_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own family profile" ON public.family_profiles;
CREATE POLICY "Users can view own family profile"
  ON public.family_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own family profile" ON public.family_profiles;
CREATE POLICY "Users can insert own family profile"
  ON public.family_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own family profile" ON public.family_profiles;
CREATE POLICY "Users can update own family profile"
  ON public.family_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own family profile" ON public.family_profiles;
CREATE POLICY "Users can delete own family profile"
  ON public.family_profiles FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_family_profiles_user_id ON public.family_profiles(user_id);
