-- Kør i GROCERY Supabase. Fjerner Goma/legacy produkt-nøgler fra fælles kurering.
-- Beholder kun fooddata-format: {chain}-{source_id} (bilka-*, rema-1000-*, …)
--
-- 1) Kør SELECT-delen først og tjek tallene
-- 2) Kør DELETE-delen når du er tilfreds

-- ─── Preview: hvad slettes? ───────────────────────────────────────────────

SELECT 'matches_legacy' AS bucket, COUNT(*) AS n
FROM public.product_ingredient_matches m
WHERE NOT EXISTS (
  SELECT 1
  FROM (VALUES
    ('bilka-'), ('netto-'), ('foetex-'), ('fotex-'), ('rema-1000-'),
    ('nemlig-'), ('lidl-'), ('365discount-'), ('kvickly-'), ('superbrugsen-'),
    ('brugsen-'), ('meny-'), ('spar-'), ('loevbjerg-'), ('abc-lavpris-'),
    ('min-koebmand-')
  ) AS chains(prefix)
  WHERE m.product_external_id LIKE chains.prefix || '%'
)
UNION ALL
SELECT 'queue_legacy', COUNT(*)
FROM public.product_ingredient_match_queue q
WHERE NOT EXISTS (
  SELECT 1
  FROM (VALUES
    ('bilka-'), ('netto-'), ('foetex-'), ('fotex-'), ('rema-1000-'),
    ('nemlig-'), ('lidl-'), ('365discount-'), ('kvickly-'), ('superbrugsen-'),
    ('brugsen-'), ('meny-'), ('spar-'), ('loevbjerg-'), ('abc-lavpris-'),
    ('min-koebmand-')
  ) AS chains(prefix)
  WHERE q.product_id LIKE chains.prefix || '%'
)
UNION ALL
SELECT 'organic_legacy', COUNT(*)
FROM public.product_organic_tags o
WHERE NOT EXISTS (
  SELECT 1
  FROM (VALUES
    ('bilka-'), ('netto-'), ('foetex-'), ('fotex-'), ('rema-1000-'),
    ('nemlig-'), ('lidl-'), ('365discount-'), ('kvickly-'), ('superbrugsen-'),
    ('brugsen-'), ('meny-'), ('spar-'), ('loevbjerg-'), ('abc-lavpris-'),
    ('min-koebmand-')
  ) AS chains(prefix)
  WHERE o.product_external_id LIKE chains.prefix || '%'
);

-- ─── Delete legacy rows (uncomment when ready) ────────────────────────────

-- DELETE FROM public.product_ingredient_matches m
-- WHERE NOT EXISTS (
--   SELECT 1 FROM (VALUES
--     ('bilka-'), ('netto-'), ('foetex-'), ('fotex-'), ('rema-1000-'),
--     ('nemlig-'), ('lidl-'), ('365discount-'), ('kvickly-'), ('superbrugsen-'),
--     ('brugsen-'), ('meny-'), ('spar-'), ('loevbjerg-'), ('abc-lavpris-'),
--     ('min-koebmand-')
--   ) AS chains(prefix)
--   WHERE m.product_external_id LIKE chains.prefix || '%'
-- );

-- DELETE FROM public.product_ingredient_match_queue q
-- WHERE NOT EXISTS (
--   SELECT 1 FROM (VALUES
--     ('bilka-'), ('netto-'), ('foetex-'), ('fotex-'), ('rema-1000-'),
--     ('nemlig-'), ('lidl-'), ('365discount-'), ('kvickly-'), ('superbrugsen-'),
--     ('brugsen-'), ('meny-'), ('spar-'), ('loevbjerg-'), ('abc-lavpris-'),
--     ('min-koebmand-')
--   ) AS chains(prefix)
--   WHERE q.product_id LIKE chains.prefix || '%'
-- );

-- DELETE FROM public.product_organic_tags o
-- WHERE NOT EXISTS (
--   SELECT 1 FROM (VALUES
--     ('bilka-'), ('netto-'), ('foetex-'), ('fotex-'), ('rema-1000-'),
--     ('nemlig-'), ('lidl-'), ('365discount-'), ('kvickly-'), ('superbrugsen-'),
--     ('brugsen-'), ('meny-'), ('spar-'), ('loevbjerg-'), ('abc-lavpris-'),
--     ('min-koebmand-')
--   ) AS chains(prefix)
--   WHERE o.product_external_id LIKE chains.prefix || '%'
-- );
