-- Fix product_ingredient_matches table to support both old and new product structures
-- This removes the foreign key constraint that only allows products from supermarket_products

-- Drop the existing foreign key constraint
ALTER TABLE product_ingredient_matches 
DROP CONSTRAINT IF EXISTS product_ingredient_matches_product_external_id_fkey;

-- Note: We keep the ingredient_id foreign key as ingredients are always in the same table
-- The ingredient_id foreign key should remain:
-- FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE

-- The product_external_id can now reference:
-- 1. Old structure: external_id from supermarket_products (e.g., "rema-12345")
-- 2. New structure: composite ID from products + product_offers (e.g., "123-456" = product_id-store_id)

-- Verify the constraint was removed
SELECT 
  constraint_name, 
  constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'product_ingredient_matches' 
  AND constraint_type = 'FOREIGN KEY';


