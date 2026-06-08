-- Read-only. Kør i BEGGE databaser efter oprydning for at verificere alignment.
-- Ingen DELETE — sikkert at køre når som helst.

-- FF MAIN: forvent matches_total ~14694, matches_legacy = 0
SELECT 'ff_matches_total' AS metric, COUNT(*)::text AS value
FROM public.product_ingredient_matches
UNION ALL
SELECT 'ff_matches_legacy',
  COUNT(*)::text
FROM public.product_ingredient_matches m
WHERE NOT EXISTS (
  SELECT 1 FROM (VALUES
    ('bilka-'), ('netto-'), ('foetex-'), ('fotex-'), ('rema-1000-'),
    ('nemlig-'), ('lidl-'), ('365discount-'), ('kvickly-'), ('superbrugsen-'),
    ('brugsen-'), ('meny-'), ('spar-'), ('loevbjerg-'), ('abc-lavpris-'),
    ('min-koebmand-')
  ) AS chains(prefix)
  WHERE m.product_external_id LIKE chains.prefix || '%'
)
UNION ALL
SELECT 'ff_queue_legacy',
  COUNT(*)::text
FROM public.product_ingredient_match_queue q
WHERE NOT EXISTS (
  SELECT 1 FROM (VALUES
    ('bilka-'), ('netto-'), ('foetex-'), ('fotex-'), ('rema-1000-'),
    ('nemlig-'), ('lidl-'), ('365discount-'), ('kvickly-'), ('superbrugsen-'),
    ('brugsen-'), ('meny-'), ('spar-'), ('loevbjerg-'), ('abc-lavpris-'),
    ('min-koebmand-')
  ) AS chains(prefix)
  WHERE q.product_id LIKE chains.prefix || '%'
);

-- GROCERY: forvent source=ff ~14694, planomo_duplicates=0, planomo_unique ~389
-- (Kør denne del i grocery SQL editor — kommentér ud hvis du kun kører i FF.)

-- SELECT 'grocery_matches_ff' AS metric, COUNT(*)::text AS value
-- FROM public.product_ingredient_matches WHERE source = 'ff'
-- UNION ALL
-- SELECT 'grocery_planomo_remaining', COUNT(*)::text
-- FROM public.product_ingredient_matches WHERE source = 'planomo'
-- UNION ALL
-- SELECT 'grocery_planomo_dupes_over_ff',
--   COUNT(*)::text
-- FROM public.product_ingredient_matches pm
-- WHERE pm.source = 'planomo'
--   AND EXISTS (
--     SELECT 1 FROM public.product_ingredient_matches ff
--     WHERE ff.source = 'ff' AND ff.product_external_id = pm.product_external_id
--   );
