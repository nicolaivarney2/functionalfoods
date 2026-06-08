-- GROCERY (kuwqzodesppknbjtrsgs) — KUN LÆS. Kør og tjek før trin 5.

SELECT 'matches_ff' AS bucket, COUNT(*) AS n
FROM public.product_ingredient_matches WHERE source = 'ff'
UNION ALL
SELECT 'planomo_duplicates_to_delete', COUNT(*)
FROM public.product_ingredient_matches pm
WHERE pm.source = 'planomo'
  AND EXISTS (
    SELECT 1 FROM public.product_ingredient_matches ff
    WHERE ff.source = 'ff' AND ff.product_external_id = pm.product_external_id
  )
UNION ALL
SELECT 'planomo_unique_kept', COUNT(*)
FROM public.product_ingredient_matches pm
WHERE pm.source = 'planomo'
  AND NOT EXISTS (
    SELECT 1 FROM public.product_ingredient_matches ff
    WHERE ff.source = 'ff' AND ff.product_external_id = pm.product_external_id
  );
