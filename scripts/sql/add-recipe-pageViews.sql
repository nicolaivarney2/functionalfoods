-- Kør i Supabase SQL Editor: tæller besøg på FF (incrementeres via /api/recipes/[slug]/view).
-- Visning = baseline (ketolivViews i app-data / slug-heuristik) + denne tæller.

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS "pageViews" INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN recipes."pageViews" IS 'Antal registrerede sidevisninger på Functional Foods (lægges oven i baseline i UI).';
