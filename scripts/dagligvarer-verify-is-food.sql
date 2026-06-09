-- Dagligvarer diagnose — kør efter migration 20260608130000_products_is_food.sql

-- 1) Fordeling food vs non-food
SELECT is_food, COUNT(*) AS products
FROM public.products
GROUP BY is_food
ORDER BY is_food DESC;

-- 2) Tilgængelige tilbud (food)
SELECT COUNT(*) AS food_offers
FROM public.product_offers po
JOIN public.products p ON p.id = po.product_id
WHERE po.is_available = true
  AND p.is_food = true;

-- 3) Aktive tilbud (det "Kun tilbudsvarer" filtrerer på)
SELECT COUNT(*) AS food_active_offers
FROM public.product_offers po
JOIN public.products p ON p.id = po.product_id
WHERE po.is_available = true
  AND p.is_food = true
  AND po.is_offer_active = true;

-- 4) Counts RPC (det /dagligvarer bruger til tal i sidebar)
SELECT public.get_product_counts_v2(true);
