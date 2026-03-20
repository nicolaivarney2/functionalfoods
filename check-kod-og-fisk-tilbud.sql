-- Tjek hvor mange produkter der er på tilbud i "Kød og fisk" kategorien
-- For REMA 1000 (eller alle butikker)

-- ============================================
-- REMA 1000 SPECIFIKT
-- ============================================

-- Total produkter i "Kød og fisk" kategorien
SELECT 
  COUNT(*) as total_kod_og_fisk,
  COUNT(CASE WHEN po.is_on_sale = true THEN 1 END) as på_tilbud,
  COUNT(CASE WHEN po.is_on_sale = false OR po.is_on_sale IS NULL THEN 1 END) as ikke_på_tilbud,
  ROUND(
    (COUNT(CASE WHEN po.is_on_sale = true THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 
    2
  ) as procent_på_tilbud
FROM product_offers po
INNER JOIN products p ON po.product_id = p.id
WHERE po.store_id = 'rema-1000'
  AND (
    LOWER(p.category) LIKE '%kød%' 
    OR LOWER(p.category) LIKE '%fisk%'
    OR LOWER(p.category) LIKE '%fjerkræ%'
    OR LOWER(p.category) = 'kød og fisk'
    OR LOWER(p.department) LIKE '%kød%'
    OR LOWER(p.department) LIKE '%fisk%'
    OR LOWER(p.department) LIKE '%fjerkræ%'
  );

-- Detaljeret oversigt: Produkter på tilbud i "Kød og fisk"
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
  AND (
    LOWER(p.category) LIKE '%kød%' 
    OR LOWER(p.category) LIKE '%fisk%'
    OR LOWER(p.category) LIKE '%fjerkræ%'
    OR LOWER(p.category) = 'kød og fisk'
    OR LOWER(p.department) LIKE '%kød%'
    OR LOWER(p.department) LIKE '%fisk%'
    OR LOWER(p.department) LIKE '%fjerkræ%'
  )
ORDER BY 
  po.is_on_sale DESC,
  po.discount_percentage DESC NULLS LAST,
  po.name_store
LIMIT 50;

-- ============================================
-- ALLE BUTIKKER (ikke kun REMA)
-- ============================================

-- Total produkter i "Kød og fisk" kategorien for alle butikker
SELECT 
  po.store_id,
  COUNT(*) as total_kod_og_fisk,
  COUNT(CASE WHEN po.is_on_sale = true THEN 1 END) as på_tilbud,
  ROUND(
    (COUNT(CASE WHEN po.is_on_sale = true THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 
    2
  ) as procent_på_tilbud
FROM product_offers po
INNER JOIN products p ON po.product_id = p.id
WHERE (
    LOWER(p.category) LIKE '%kød%' 
    OR LOWER(p.category) LIKE '%fisk%'
    OR LOWER(p.category) LIKE '%fjerkræ%'
    OR LOWER(p.category) = 'kød og fisk'
    OR LOWER(p.department) LIKE '%kød%'
    OR LOWER(p.department) LIKE '%fisk%'
    OR LOWER(p.department) LIKE '%fjerkræ%'
  )
GROUP BY po.store_id
ORDER BY på_tilbud DESC;

-- ============================================
-- TJEK FOR FEJL I TILBUD FLAGS
-- ============================================

-- Produkter der SKAL være på tilbud men ikke er markeret
SELECT 
  COUNT(*) as skal_være_på_tilbud,
  AVG(po.normal_price - po.current_price) as gennemsnitlig_besparelse
FROM product_offers po
INNER JOIN products p ON po.product_id = p.id
WHERE po.store_id = 'rema-1000'
  AND (
    LOWER(p.category) LIKE '%kød%' 
    OR LOWER(p.category) LIKE '%fisk%'
    OR LOWER(p.category) LIKE '%fjerkræ%'
    OR LOWER(p.category) = 'kød og fisk'
    OR LOWER(p.department) LIKE '%kød%'
    OR LOWER(p.department) LIKE '%fisk%'
    OR LOWER(p.department) LIKE '%fjerkræ%'
  )
  AND po.normal_price IS NOT NULL
  AND po.current_price IS NOT NULL
  AND po.normal_price > po.current_price
  AND (po.is_on_sale = false OR po.is_on_sale IS NULL);
