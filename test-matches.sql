-- Test matches direkte i Supabase SQL Editor

-- 1. Tæl total matches
SELECT COUNT(*) as total_matches FROM product_ingredient_matches;

-- 2. Tæl unikke matchede produkter
SELECT COUNT(DISTINCT product_external_id) as unique_matched_products 
FROM product_ingredient_matches;

-- 3. Tæl total produkter
SELECT COUNT(*) as total_products FROM supermarket_products;

-- 4. Se sample matches
SELECT 
  i.name as ingredient_name,
  p.name as product_name,
  pim.confidence,
  pim.match_type
FROM product_ingredient_matches pim
JOIN ingredients i ON pim.ingredient_id = i.id
JOIN supermarket_products p ON pim.product_external_id = p.external_id
ORDER BY pim.created_at DESC
LIMIT 10;

-- 5. Se hvor mange produkter hver ingrediens matcher med
SELECT 
  i.name as ingredient_name,
  COUNT(pim.product_external_id) as product_count
FROM ingredients i
LEFT JOIN product_ingredient_matches pim ON i.id = pim.ingredient_id
GROUP BY i.id, i.name
ORDER BY product_count DESC
LIMIT 20;
