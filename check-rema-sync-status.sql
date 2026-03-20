-- Check when REMA products were last synced/updated
-- NOTE: Goma import writes to NEW structure (products + product_offers)
-- Old structure (supermarket_products) is legacy and may not be updated

-- ============================================
-- NEW STRUCTURE (Goma import - products + product_offers)
-- ============================================

-- Option 1: Check products table (new structure)
-- Products are shared across stores, so we check by metadata
SELECT 
  MAX(updated_at) as last_sync_time,
  COUNT(*) as total_goma_products,
  COUNT(CASE WHEN updated_at > NOW() - INTERVAL '7 days' THEN 1 END) as updated_last_7_days,
  COUNT(CASE WHEN updated_at > NOW() - INTERVAL '1 day' THEN 1 END) as updated_last_24_hours
FROM products
WHERE metadata->>'goma_store_product_id' IS NOT NULL;

-- Option 1b: Check REMA-specific offers (better indicator)
SELECT 
  MAX(po.updated_at) as last_sync_time,
  COUNT(*) as total_rema_offers,
  COUNT(CASE WHEN po.updated_at > NOW() - INTERVAL '7 days' THEN 1 END) as updated_last_7_days,
  COUNT(CASE WHEN po.updated_at > NOW() - INTERVAL '1 day' THEN 1 END) as updated_last_24_hours
FROM product_offers po
WHERE po.store_id = 'rema-1000';

-- Option 2: Check product_offers for REMA 1000 (new structure)
-- Goma uses store_id as slug (e.g., "rema-1000")
SELECT 
  MAX(updated_at) as last_sync_time,
  COUNT(*) as total_rema_offers,
  COUNT(CASE WHEN updated_at > NOW() - INTERVAL '7 days' THEN 1 END) as updated_last_7_days,
  COUNT(CASE WHEN updated_at > NOW() - INTERVAL '1 day' THEN 1 END) as updated_last_24_hours
FROM product_offers
WHERE store_id = 'rema-1000';

-- Option 3: Get detailed breakdown by update time for REMA offers (new structure)
SELECT 
  DATE(updated_at) as update_date,
  COUNT(*) as offers_updated,
  MAX(updated_at) as latest_update_time
FROM product_offers
WHERE store_id = 'rema-1000'
  AND updated_at IS NOT NULL
GROUP BY DATE(updated_at)
ORDER BY update_date DESC
LIMIT 10;

-- Option 3b: Check stale REMA offers (not updated in 7+ days)
SELECT 
  COUNT(*) as stale_offers,
  MIN(updated_at) as oldest_update,
  MAX(updated_at) as newest_update
FROM product_offers
WHERE store_id = 'rema-1000'
  AND (updated_at IS NULL OR updated_at < NOW() - INTERVAL '7 days');

-- ============================================
-- CHECK FOR OFFER DETECTION ISSUES
-- ============================================

-- Option 6: Find products that SHOULD be marked as on sale but aren't
-- (current_price < normal_price but is_on_sale = false)
SELECT 
  COUNT(*) as missing_sale_flags,
  MIN(current_price) as min_current_price,
  MAX(normal_price) as max_normal_price
FROM product_offers
WHERE store_id = 'rema-1000'
  AND normal_price IS NOT NULL
  AND current_price IS NOT NULL
  AND normal_price > current_price
  AND is_on_sale = false;

-- Option 7: Find products incorrectly marked as on sale
-- (current_price >= normal_price but is_on_sale = true)
SELECT 
  COUNT(*) as incorrect_sale_flags
FROM product_offers
WHERE store_id = 'rema-1000'
  AND normal_price IS NOT NULL
  AND current_price IS NOT NULL
  AND normal_price <= current_price
  AND is_on_sale = true;

-- Option 8: Sample products with price differences
SELECT 
  name_store,
  current_price,
  normal_price,
  is_on_sale,
  discount_percentage,
  CASE 
    WHEN normal_price > current_price THEN 'SHOULD BE ON SALE'
    WHEN normal_price <= current_price AND is_on_sale = true THEN 'INCORRECTLY MARKED AS SALE'
    ELSE 'OK'
  END as status
FROM product_offers
WHERE store_id = 'rema-1000'
  AND normal_price IS NOT NULL
  AND current_price IS NOT NULL
  AND (
    (normal_price > current_price AND is_on_sale = false) OR
    (normal_price <= current_price AND is_on_sale = true)
  )
ORDER BY ABS(normal_price - current_price) DESC
LIMIT 20;

-- ============================================
-- OLD STRUCTURE (Legacy - supermarket_products)
-- ============================================

-- Option 4: Check old structure (may not be updated if using Goma)
SELECT 
  MAX(last_updated) as last_sync_time,
  COUNT(*) as total_rema_products_old,
  COUNT(CASE WHEN last_updated > NOW() - INTERVAL '7 days' THEN 1 END) as updated_last_7_days
FROM supermarket_products
WHERE store = 'REMA 1000' OR source = 'rema1000';

-- Option 5: Check stale products in OLD structure
SELECT 
  COUNT(*) as stale_products,
  MIN(last_updated) as oldest_update,
  MAX(last_updated) as newest_update
FROM supermarket_products
WHERE (store = 'REMA 1000' OR source = 'rema1000')
  AND (last_updated IS NULL OR last_updated < NOW() - INTERVAL '7 days');
