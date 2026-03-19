-- Fix Supabase linter: Security Definer Views (ERROR)
-- Ændrer views fra SECURITY DEFINER til SECURITY INVOKER
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view

-- 1. supermarket_products_with_latest_price
DROP VIEW IF EXISTS supermarket_products_with_latest_price;
CREATE VIEW supermarket_products_with_latest_price 
  WITH (security_invoker = on) AS
SELECT 
  sp.*,
  ph.price as current_price,
  ph.original_price as current_original_price,
  ph.is_on_sale as current_is_on_sale,
  ph.sale_end_date as current_sale_end_date,
  ph.timestamp as price_updated_at
FROM supermarket_products sp
LEFT JOIN LATERAL (
  SELECT * FROM supermarket_price_history 
  WHERE product_external_id = sp.external_id 
  ORDER BY timestamp DESC 
  LIMIT 1
) ph ON true;

-- 2. products_on_sale
DROP VIEW IF EXISTS products_on_sale;
CREATE VIEW products_on_sale 
  WITH (security_invoker = on) AS
SELECT 
  sp.*,
  ph.price as current_price,
  ph.original_price as current_original_price,
  ph.sale_end_date as current_sale_end_date,
  ph.timestamp as price_updated_at
FROM supermarket_products sp
LEFT JOIN LATERAL (
  SELECT * FROM supermarket_price_history 
  WHERE product_external_id = sp.external_id 
  ORDER BY timestamp DESC 
  LIMIT 1
) ph ON true
WHERE ph.is_on_sale = true;

-- 3. price_statistics
DROP VIEW IF EXISTS price_statistics;
CREATE VIEW price_statistics 
  WITH (security_invoker = on) AS
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN ph.is_on_sale THEN 1 END) as products_on_sale,
  AVG(ph.price) as average_price,
  MIN(ph.price) as min_price,
  MAX(ph.price) as max_price,
  COUNT(DISTINCT sp.category) as unique_categories,
  MAX(sp.last_updated) as last_update
FROM supermarket_products sp
LEFT JOIN LATERAL (
  SELECT * FROM supermarket_price_history 
  WHERE product_external_id = sp.external_id 
  ORDER BY timestamp DESC 
  LIMIT 1
) ph ON true;

-- 4. frida_foods_complete – manuel migrering:
--    a) Hent definition: SELECT pg_get_viewdef('public.frida_foods_complete'::regclass, true);
--    b) DROP VIEW frida_foods_complete;
--    c) CREATE VIEW frida_foods_complete WITH (security_invoker = on) AS <output fra a>;
