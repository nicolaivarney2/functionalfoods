-- Sticky ingredient↔product matches: survive offer/catalog churn.

ALTER TABLE public.product_ingredient_matches
  ADD COLUMN IF NOT EXISTS product_name_snapshot text,
  ADD COLUMN IF NOT EXISTS product_store_snapshot text,
  ADD COLUMN IF NOT EXISTS last_known_price numeric;

COMMENT ON COLUMN public.product_ingredient_matches.product_name_snapshot IS
  'Navn ved match-tidspunkt; bruges når tilbud midlertidigt er væk.';
COMMENT ON COLUMN public.product_ingredient_matches.product_store_snapshot IS
  'Butiksnavn ved match; uafhængigt af aktivt tilbud.';
COMMENT ON COLUMN public.product_ingredient_matches.last_known_price IS
  'Sidst kendte pris (kr) ved match; ikke nødvendigvis aktuelt tilbud.';
