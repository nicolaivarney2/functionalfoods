-- Accepter både RFC UUID og Planomo/FF ingredient-* ids i fælles kurering.
-- Kør i grocery Supabase efter 001 + 002.

ALTER TABLE public.product_ingredient_matches
  ALTER COLUMN ingredient_id TYPE text USING ingredient_id::text;

ALTER TABLE public.ingredient_dietary_tags
  ALTER COLUMN ingredient_id TYPE text USING ingredient_id::text;

COMMENT ON COLUMN public.product_ingredient_matches.ingredient_id IS
  'Delt ingredient_id på tværs af apps — UUID eller ingredient-* string.';

COMMENT ON COLUMN public.ingredient_dietary_tags.ingredient_id IS
  'Delt ingredient_id på tværs af apps — UUID eller ingredient-* string.';

COMMENT ON TABLE public.ingredient_dietary_tags IS
  'Fælles fravalg-tags. ingredient_id = samme string i Planomo og FF når apps overlapper.';
