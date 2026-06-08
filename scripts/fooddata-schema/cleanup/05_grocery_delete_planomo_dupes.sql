-- GROCERY — sletter KUN Planomo-duplikater. Kør KUN efter trin 4 ser rigtig ud.

DELETE FROM public.product_ingredient_matches pm
WHERE pm.source = 'planomo'
  AND EXISTS (
    SELECT 1
    FROM public.product_ingredient_matches ff
    WHERE ff.source = 'ff'
      AND ff.product_external_id = pm.product_external_id
  );
