-- GROCERY — verify efter trin 5. Forvent: ff ~14694, planomo ~389, dupes = 0.

SELECT source, COUNT(*) AS n
FROM public.product_ingredient_matches
GROUP BY source
ORDER BY source;

SELECT COUNT(*) AS planomo_still_duplicates_ff
FROM public.product_ingredient_matches pm
WHERE pm.source = 'planomo'
  AND EXISTS (
    SELECT 1 FROM public.product_ingredient_matches ff
    WHERE ff.source = 'ff' AND ff.product_external_id = pm.product_external_id
  );
