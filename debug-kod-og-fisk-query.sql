-- Debug query: Tjek hvad frontenden faktisk finder
-- Simulerer hvad getSupermarketProductsV2 gør

-- STEP 1: Find product IDs for "Kød og fisk" kategori
SELECT 
  COUNT(*) as total_products_in_category,
  COUNT(DISTINCT id) as unique_product_ids
FROM products
WHERE (
  LOWER(department) LIKE '%kød%' 
  OR LOWER(department) LIKE '%fisk%'
  OR LOWER(department) LIKE '%fjerkræ%'
  OR LOWER(department) = 'kød og fisk'
  OR LOWER(category) LIKE '%kød%' 
  OR LOWER(category) LIKE '%fisk%'
  OR LOWER(category) LIKE '%fjerkræ%'
  OR LOWER(category) = 'kød og fisk'
);

-- STEP 2: Tjek offers for disse products + REMA + is_on_sale
SELECT 
  COUNT(*) as total_matching_offers,
  COUNT(CASE WHEN po.is_on_sale = true THEN 1 END) as marked_as_on_sale,
  COUNT(CASE WHEN po.normal_price > po.current_price THEN 1 END) as actually_on_sale_by_price,
  COUNT(CASE WHEN po.is_on_sale = true AND po.normal_price > po.current_price THEN 1 END) as correctly_marked,
  COUNT(CASE WHEN po.is_on_sale = true AND po.normal_price <= po.current_price THEN 1 END) as incorrectly_marked,
  COUNT(CASE WHEN po.is_on_sale = false AND po.normal_price > po.current_price THEN 1 END) as missing_sale_flag
FROM product_offers po
INNER JOIN products p ON po.product_id = p.id
WHERE po.store_id = 'rema-1000'
  AND po.is_available = true
  AND (
    LOWER(p.department) LIKE '%kød%' 
    OR LOWER(p.department) LIKE '%fisk%'
    OR LOWER(p.department) LIKE '%fjerkræ%'
    OR LOWER(p.department) = 'kød og fisk'
    OR LOWER(p.category) LIKE '%kød%' 
    OR LOWER(p.category) LIKE '%fisk%'
    OR LOWER(p.category) LIKE '%fjerkræ%'
    OR LOWER(p.category) = 'kød og fisk'
  );

-- STEP 3: Se eksempler på produkter der SKAL være på tilbud men ikke er
SELECT 
  po.name_store,
  p.category,
  p.department,
  po.current_price,
  po.normal_price,
  po.is_on_sale,
  po.discount_percentage,
  CASE 
    WHEN po.normal_price > po.current_price AND po.is_on_sale = false THEN '⚠️ SKAL VÆRE PÅ TILBUD'
    WHEN po.normal_price <= po.current_price AND po.is_on_sale = true THEN '⚠️ FORKERT MARKERET'
    WHEN po.is_on_sale = true THEN '✅ På tilbud'
    ELSE '❌ Ikke på tilbud'
  END as status
FROM product_offers po
INNER JOIN products p ON po.product_id = p.id
WHERE po.store_id = 'rema-1000'
  AND po.is_available = true
  AND (
    LOWER(p.department) LIKE '%kød%' 
    OR LOWER(p.department) LIKE '%fisk%'
    OR LOWER(p.department) LIKE '%fjerkræ%'
    OR LOWER(p.department) = 'kød og fisk'
    OR LOWER(p.category) LIKE '%kød%' 
    OR LOWER(p.category) LIKE '%fisk%'
    OR LOWER(p.category) LIKE '%fjerkræ%'
    OR LOWER(p.category) = 'kød og fisk'
  )
  AND (
    (po.is_on_sale = true) OR
    (po.normal_price > po.current_price)
  )
ORDER BY 
  po.is_on_sale DESC,
  po.discount_percentage DESC NULLS LAST
LIMIT 20;
