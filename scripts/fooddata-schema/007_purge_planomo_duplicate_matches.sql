-- Kør i GROCERY Supabase (GROCERY_SUPABASE_URL — kuwqzodesppknbjtrsgs).
-- Fjerner Planomo-duplikater: samme product_external_id findes allerede under source=ff.
--
-- Forventet preview (ca. jun 2026):
--   planomo_duplicates_to_delete  ~473
--   planomo_unique_remaining      ~389  (beholdes — gennemgås separat)
--   matches_ff_kept               ~14694
--
-- SLETTER IKKE de 389 unikke Planomo-rækker automatisk.

-- ─── Preview ──────────────────────────────────────────────────────────────

SELECT 'matches_ff' AS bucket, COUNT(*) AS n
FROM public.product_ingredient_matches
WHERE source = 'ff'
UNION ALL
SELECT 'matches_planomo_total', COUNT(*)
FROM public.product_ingredient_matches
WHERE source = 'planomo'
UNION ALL
SELECT 'planomo_duplicates_to_delete', COUNT(*)
FROM public.product_ingredient_matches pm
WHERE pm.source = 'planomo'
  AND EXISTS (
    SELECT 1
    FROM public.product_ingredient_matches ff
    WHERE ff.source = 'ff'
      AND ff.product_external_id = pm.product_external_id
  )
UNION ALL
SELECT 'planomo_unique_remaining', COUNT(*)
FROM public.product_ingredient_matches pm
WHERE pm.source = 'planomo'
  AND NOT EXISTS (
    SELECT 1
    FROM public.product_ingredient_matches ff
    WHERE ff.source = 'ff'
      AND ff.product_external_id = pm.product_external_id
  );

-- Planomo-rækker der bliver tilbage (til manuel gennemgang / FF admin)
SELECT pm.product_external_id,
       pm.ingredient_id,
       pm.product_name_snapshot,
       pm.product_store_snapshot,
       pm.last_known_price
FROM public.product_ingredient_matches pm
WHERE pm.source = 'planomo'
  AND NOT EXISTS (
    SELECT 1
    FROM public.product_ingredient_matches ff
    WHERE ff.source = 'ff'
      AND ff.product_external_id = pm.product_external_id
  )
ORDER BY pm.product_external_id
LIMIT 50;

-- ─── Delete KUN duplikater (fjern kommentar når preview ser rigtig ud) ─────

-- DELETE FROM public.product_ingredient_matches pm
-- WHERE pm.source = 'planomo'
--   AND EXISTS (
--     SELECT 1
--     FROM public.product_ingredient_matches ff
--     WHERE ff.source = 'ff'
--       AND ff.product_external_id = pm.product_external_id
--   );

-- ─── Verify efter DELETE ───────────────────────────────────────────────────

-- SELECT source, COUNT(*) AS n
-- FROM public.product_ingredient_matches
-- GROUP BY source
-- ORDER BY source;
