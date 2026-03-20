-- Fix REMA offer flags based on price difference
-- This updates is_on_sale and discount_percentage based on actual price comparison
-- 
-- IMPORTANT: Run each step separately and check the result before proceeding!

-- Step 1: Mark products as on sale if current_price < normal_price
-- This will update products that SHOULD be marked as on sale but aren't
UPDATE product_offers
SET 
  is_on_sale = true,
  discount_percentage = CASE 
    WHEN normal_price > 0 AND current_price < normal_price 
    THEN ROUND(((normal_price - current_price) / normal_price) * 100)
    ELSE NULL
  END,
  updated_at = NOW()
WHERE store_id = 'rema-1000'
  AND normal_price IS NOT NULL
  AND current_price IS NOT NULL
  AND normal_price > current_price
  AND (is_on_sale = false OR is_on_sale IS NULL);

-- Step 2: Unmark products as on sale if current_price >= normal_price
UPDATE product_offers
SET 
  is_on_sale = false,
  discount_percentage = NULL,
  updated_at = NOW()
WHERE store_id = 'rema-1000'
  AND normal_price IS NOT NULL
  AND current_price IS NOT NULL
  AND normal_price <= current_price
  AND is_on_sale = true;

-- Step 3: Verify the fix
SELECT 
  COUNT(*) as total_offers,
  COUNT(CASE WHEN is_on_sale = true THEN 1 END) as on_sale_count,
  COUNT(CASE WHEN normal_price > current_price AND is_on_sale = true THEN 1 END) as correctly_marked_on_sale,
  COUNT(CASE WHEN normal_price <= current_price AND is_on_sale = false THEN 1 END) as correctly_marked_not_on_sale,
  COUNT(CASE WHEN normal_price > current_price AND is_on_sale = false THEN 1 END) as incorrectly_not_marked,
  COUNT(CASE WHEN normal_price <= current_price AND is_on_sale = true THEN 1 END) as incorrectly_marked
FROM product_offers
WHERE store_id = 'rema-1000'
  AND normal_price IS NOT NULL
  AND current_price IS NOT NULL;
