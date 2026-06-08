-- FF MAIN (najaxycfjgultwdwffhv) — KUN LÆS. Kør og tjek tallene før trin 2.

SELECT 'matches_legacy' AS bucket, COUNT(*) AS n
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
SELECT 'matches_fooddata_kept', COUNT(*)
FROM public.product_ingredient_matches m
WHERE EXISTS (
  SELECT 1 FROM (VALUES
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
  SELECT 1 FROM (VALUES
    ('bilka-'), ('netto-'), ('foetex-'), ('fotex-'), ('rema-1000-'),
    ('nemlig-'), ('lidl-'), ('365discount-'), ('kvickly-'), ('superbrugsen-'),
    ('brugsen-'), ('meny-'), ('spar-'), ('loevbjerg-'), ('abc-lavpris-'),
    ('min-koebmand-')
  ) AS chains(prefix)
  WHERE q.product_id LIKE chains.prefix || '%'
);
