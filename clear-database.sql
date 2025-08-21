-- 🗑️ Clear Database - Remove all products and price history
-- Kør dette script i din Supabase SQL editor

-- Slet alle prishistorik først (foreign key constraint)
DELETE FROM supermarket_price_history;

-- Slet alle produkter
DELETE FROM supermarket_products;

-- Reset auto-increment ID hvis nødvendigt
-- ALTER SEQUENCE supermarket_products_id_seq RESTART WITH 1;

-- Bekræft at tabellerne er tomme
SELECT 'supermarket_products' as table_name, COUNT(*) as count FROM supermarket_products
UNION ALL
SELECT 'supermarket_price_history' as table_name, COUNT(*) as count FROM supermarket_price_history;
