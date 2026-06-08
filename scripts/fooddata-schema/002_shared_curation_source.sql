-- Opgradering til fælles kurering (planomo | ff). Kør efter 001 hvis tabeller findes.

ALTER TABLE public.product_ingredient_matches
  DROP CONSTRAINT IF EXISTS product_ingredient_matches_source_check;
ALTER TABLE public.product_ingredient_matches
  ADD CONSTRAINT product_ingredient_matches_source_check
  CHECK (source IN ('planomo', 'ff'));

ALTER TABLE public.product_ingredient_match_queue
  DROP CONSTRAINT IF EXISTS product_ingredient_match_queue_source_check;
ALTER TABLE public.product_ingredient_match_queue
  ADD CONSTRAINT product_ingredient_match_queue_source_check
  CHECK (source IN ('planomo', 'ff'));

ALTER TABLE public.ingredient_dietary_tags
  DROP CONSTRAINT IF EXISTS ingredient_dietary_tags_source_check;
ALTER TABLE public.ingredient_dietary_tags
  ADD CONSTRAINT ingredient_dietary_tags_source_check
  CHECK (source IN ('planomo', 'ff'));

ALTER TABLE public.product_organic_tags
  DROP CONSTRAINT IF EXISTS product_organic_tags_source_check;
ALTER TABLE public.product_organic_tags
  ADD CONSTRAINT product_organic_tags_source_check
  CHECK (source IN ('planomo', 'ff'));

COMMENT ON TABLE public.product_ingredient_matches IS
  'Fælles ingrediens↔produkt kurering. source=planomo|ff. Union merge — begge apps læser/skriver.';

COMMENT ON TABLE public.product_ingredient_match_queue IS
  'Fælles match-kø. source=planomo|ff.';

COMMENT ON TABLE public.ingredient_dietary_tags IS
  'Fælles fravalg-tags pr. ingredient_id. App ignorerer ukendte IDs lokalt.';

COMMENT ON TABLE public.product_organic_tags IS
  'Fælles øko-tags pr. product_external_id.';
