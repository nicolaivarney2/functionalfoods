-- 🧹 Simple Database Cleanup - Start Fresh
-- Kør dette script i din Supabase SQL editor

-- 1. Slet ALT fra supermarket_products
DELETE FROM supermarket_products;

-- 2. Nulstil auto-increment ID
ALTER SEQUENCE supermarket_products_id_seq RESTART WITH 1;

-- 3. Slet ALT fra supermarket_price_history
DELETE FROM supermarket_price_history;

-- 4. Nulstil auto-increment ID
ALTER SEQUENCE supermarket_price_history_id_seq RESTART WITH 1;

-- 5. Verificer at tabellerne er tomme
SELECT 'supermarket_products' as table_name, COUNT(*) as count FROM supermarket_products
UNION ALL
SELECT 'supermarket_price_history' as table_name, COUNT(*) as count FROM supermarket_price_history;

-- 6. Tilføj unik constraint på name + store (så det ikke sker igen)
ALTER TABLE supermarket_products 
ADD CONSTRAINT unique_product_name_store 
UNIQUE (name, store);

-- 7. Opret index for bedre performance
CREATE INDEX IF NOT EXISTS idx_supermarket_products_name_store 
ON supermarket_products (name, store);

-- 8. Vis constraint
SELECT constraint_name, constraint_type, table_name 
FROM information_schema.table_constraints 
WHERE table_name = 'supermarket_products' 
AND constraint_type = 'UNIQUE';
