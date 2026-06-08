-- FF MAIN — verify efter trin 2. Forvent: total ~14694, legacy = 0, queue_legacy = 0.

SELECT COUNT(*) AS matches_total FROM public.product_ingredient_matches;

SELECT COUNT(*) AS matches_legacy
FROM public.product_ingredient_matches m
WHERE NOT EXISTS (
  SELECT 1 FROM (VALUES
    ('bilka-'), ('netto-'), ('foetex-'), ('fotex-'), ('rema-1000-'),
    ('nemlig-'), ('lidl-'), ('365discount-'), ('kvickly-'), ('superbrugsen-'),
    ('brugsen-'), ('meny-'), ('spar-'), ('loevbjerg-'), ('abc-lavpris-'),
    ('min-koebmand-')
  ) AS chains(prefix)
  WHERE m.product_external_id LIKE chains.prefix || '%'
);

SELECT COUNT(*) AS queue_legacy
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
