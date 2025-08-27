-- 🔒 Add Constraints and Indexes Only
-- Kør dette script i din Supabase SQL editor
-- (Databasen er allerede tom, så vi behøver ikke slette noget)

-- 1. Fjern eksisterende constraints hvis de findes
DO $$ 
BEGIN
    -- Drop constraint hvis den findes
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_product_name_store' 
        AND table_name = 'supermarket_products'
    ) THEN
        ALTER TABLE supermarket_products DROP CONSTRAINT unique_product_name_store;
    END IF;
    
    -- Drop index hvis den findes
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_supermarket_products_name_store'
    ) THEN
        DROP INDEX idx_supermarket_products_name_store;
    END IF;
END $$;

-- 2. Tilføj unik constraint på name + store (så det ikke sker igen)
ALTER TABLE supermarket_products 
ADD CONSTRAINT unique_product_name_store 
UNIQUE (name, store);

-- 3. Opret index for bedre performance
CREATE INDEX idx_supermarket_products_name_store 
ON supermarket_products (name, store);

-- 4. Vis constraint
SELECT constraint_name, constraint_type, table_name 
FROM information_schema.table_constraints 
WHERE table_name = 'supermarket_products' 
AND constraint_type = 'UNIQUE';

-- 5. Vis index
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE tablename = 'supermarket_products' 
AND indexname = 'idx_supermarket_products_name_store';
