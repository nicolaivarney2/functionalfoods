-- Foreløbige opskrifter (Fase 5): bruger-genererede opskrifter fra AI-billedanalyse
-- eller "byg selv". De er IKKE officielle FF-opskrifter før en admin godkender dem og
-- promoverer dem til recipes-tabellen. Idempotent — kan køres flere gange.
--
-- Flow:
--   draft     -> brugeren redigerer/svarer på AI-spørgsmål
--   pending   -> brugeren har sendt til godkendelse
--   approved  -> admin har promoveret til en rigtig recipes-række (promoted_recipe_id)
--   rejected  -> admin afviste (review_notes forklarer hvorfor)
--
-- Adgang: brugeren ejer egne rækker via RLS. Admin tilgår alt via service role i
-- /api/admin/provisional-recipes (service role bypasser RLS).

CREATE TABLE IF NOT EXISTS provisional_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('ai-photo', 'manual')),

  title TEXT NOT NULL DEFAULT 'Foreløbig opskrift',
  description TEXT,
  image_url TEXT,

  servings NUMERIC(6, 2) NOT NULL DEFAULT 1,
  prep_time INTEGER,
  cook_time INTEGER,
  difficulty TEXT,

  -- Ingredienser i FF/Frida-format: [{ name, amount, unit, notes? }]
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Fremgangsmåde: [{ stepNumber, instruction, time?, tips? }]
  instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Ernæring pr. portion: { calories, protein, carbs, fat, fiber }
  nutrition JSONB NOT NULL DEFAULT '{}'::jsonb,
  dietary_categories TEXT[] NOT NULL DEFAULT '{}',

  -- AI-opklarende spørgsmål: [{ question, answer? }]
  clarifying_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_notes TEXT,

  -- Sættes når en admin promoverer til en officiel opskrift
  promoted_recipe_id TEXT,
  -- Admins begrundelse ved afvisning
  review_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provisional_recipes_user ON provisional_recipes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provisional_recipes_status ON provisional_recipes(status, created_at DESC);

ALTER TABLE provisional_recipes ENABLE ROW LEVEL SECURITY;

-- Brugeren kan administrere sine egne foreløbige opskrifter.
DROP POLICY IF EXISTS "Users can manage own provisional recipes" ON provisional_recipes;
CREATE POLICY "Users can manage own provisional recipes" ON provisional_recipes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
