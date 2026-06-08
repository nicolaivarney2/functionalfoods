-- Kør i FF MAIN Supabase (NEXT_PUBLIC_SUPABASE_URL — najaxycfjgultwdwffhv).
-- Fjerner Goma/legacy produkt-nøgler fra FF lokal cache.
-- Beholder kun fooddata-format: {chain}-{source_id} (bilka-*, rema-1000-*, …)
--
-- Forventet preview (ca. jun 2026):
--   matches_legacy  ~1786
--   queue_legacy    ~1400
--
-- Efter DELETE forvent:
--   product_ingredient_matches  ~14694
--
-- RÆKKEFØLGE: Kør 006 i FF FØR du tester madbudget. Grocery er allerede ren (005).

-- ─── Preview ──────────────────────────────────────────────────────────────

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
SELECT 'matches_fooddata_kept', COUNT(*)
FROM public.product_ingredient_matches m
WHERE EXISTS (
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
);

-- Ingredienser der KUN har legacy-matches (gennemgå i admin efter purge)
SELECT i.name, m.ingredient_id, COUNT(*) AS legacy_matches
FROM public.product_ingredient_matches m
JOIN public.ingredients i ON i.id = m.ingredient_id
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
  AND NOT EXISTS (
    SELECT 1
    FROM public.product_ingredient_matches fd
    WHERE fd.ingredient_id = m.ingredient_id
      AND EXISTS (
        SELECT 1
        FROM (VALUES
          ('bilka-'), ('netto-'), ('foetex-'), ('fotex-'), ('rema-1000-'),
          ('nemlig-'), ('lidl-'), ('365discount-'), ('kvickly-'), ('superbrugsen-'),
          ('brugsen-'), ('meny-'), ('spar-'), ('loevbjerg-'), ('abc-lavpris-'),
          ('min-koebmand-')
        ) AS chains(prefix)
        WHERE fd.product_external_id LIKE chains.prefix || '%'
      )
  )
GROUP BY i.name, m.ingredient_id
ORDER BY legacy_matches DESC;

-- ─── Delete (fjern kommentar når preview ser rigtig ud) ─────────────────────

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

-- ─── Verify efter DELETE ───────────────────────────────────────────────────

-- SELECT COUNT(*) AS matches_total FROM public.product_ingredient_matches;
-- SELECT COUNT(*) AS matches_legacy FROM public.product_ingredient_matches m
-- WHERE NOT EXISTS (
--   SELECT 1 FROM (VALUES ('bilka-'), ('netto-'), ('foetex-'), ('fotex-'), ('rema-1000-'),
--     ('nemlig-'), ('lidl-'), ('365discount-'), ('kvickly-'), ('superbrugsen-'),
--     ('brugsen-'), ('meny-'), ('spar-'), ('loevbjerg-'), ('abc-lavpris-'), ('min-koebmand-')
--   ) AS chains(prefix) WHERE m.product_external_id LIKE chains.prefix || '%'
-- );
