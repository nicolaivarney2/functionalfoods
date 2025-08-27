-- 🧹 Fix Duplicate Products in Supermarket Database
-- Kør dette script i din Supabase SQL editor

-- 1. Først, lad os se hvor mange duplikater vi har
SELECT 
  name, 
  store, 
  COUNT(*) as duplicate_count,
  MIN(id) as keep_id,
  array_agg(id) as all_ids
FROM supermarket_products 
GROUP BY name, store 
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 2. Opret en midlertidig tabel med unikke produkter (behold den nyeste)
CREATE TEMP TABLE unique_products AS
SELECT DISTINCT ON (name, store) 
  id,
  external_id,
  name,
  description,
  category,
  subcategory,
  price,
  original_price,
  unit,
  amount,
  quantity,
  unit_price,
  currency,
  is_on_sale::boolean,
  sale_end_date,
  image_url,
  store,
  available::boolean,
  temperature_zone,
  nutrition_info,
  labels,
  metadata,
  source,
  last_updated,
  created_at,
  updated_at
FROM supermarket_products
ORDER BY name, store, last_updated DESC;

-- 3. Slet alle produkter
DELETE FROM supermarket_products;

-- 4. Indsæt kun de unikke produkter (eksplicit kolonner for at undgå type-fejl)
INSERT INTO supermarket_products (
  id,
  external_id,
  name,
  description,
  category,
  subcategory,
  price,
  original_price,
  unit,
  amount,
  quantity,
  unit_price,
  currency,
  is_on_sale,
  sale_end_date,
  image_url,
  store,
  available,
  temperature_zone,
  nutrition_info,
  labels,
  metadata,
  source,
  last_updated,
  created_at,
  updated_at
)
SELECT 
  id,
  external_id,
  name,
  description,
  category,
  subcategory,
  price,
  original_price,
  unit,
  amount,
  quantity,
  unit_price,
  currency,
  is_on_sale::boolean,
  sale_end_date,
  image_url,
  store,
  available::boolean,
  temperature_zone,
  nutrition_info,
  labels,
  metadata,
  source,
  last_updated,
  created_at,
  updated_at
FROM unique_products;

-- 5. Tilføj en unik constraint på name + store kombination
ALTER TABLE supermarket_products 
ADD CONSTRAINT unique_product_name_store 
UNIQUE (name, store);

-- 6. Opret et index for bedre performance
CREATE INDEX IF NOT EXISTS idx_supermarket_products_name_store 
ON supermarket_products (name, store);

-- 7. Verificer at vi ikke har duplikater længere
SELECT 
  name, 
  store, 
  COUNT(*) as count
FROM supermarket_products 
GROUP BY name, store 
HAVING COUNT(*) > 1;

-- 8. Vis total antal produkter
SELECT COUNT(*) as total_products FROM supermarket_products;

-- 9. Vis produkter per kategori
SELECT 
  category, 
  COUNT(*) as product_count
FROM supermarket_products 
GROUP BY category 
ORDER BY product_count DESC;

-- 10. Vis produkter per butik
SELECT 
  store, 
  COUNT(*) as product_count
FROM supermarket_products 
GROUP BY store 
ORDER BY product_count DESC;
