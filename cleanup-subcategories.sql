-- 🧹 Ryd op i subCategories
-- Fjerner duplikater (hvis mainCategory allerede er i subCategories) og tomme arrays
-- BEHOLDER kolonnen - fjerner kun indholdet der ikke giver mening

-- 1. Fjern mainCategory fra subCategories hvis den findes der
UPDATE recipes
SET "subCategories" = (
  SELECT jsonb_agg(value)
  FROM jsonb_array_elements("subCategories")
  WHERE value::text != '"' || "mainCategory" || '"'
)
WHERE "subCategories" IS NOT NULL
  AND jsonb_array_length("subCategories") > 0
  AND "subCategories"::text LIKE '%"' || "mainCategory" || '"%';

-- 2. Sæt subCategories til NULL hvis arrayet er tomt efter cleanup
UPDATE recipes
SET "subCategories" = NULL
WHERE "subCategories" IS NOT NULL
  AND jsonb_array_length("subCategories") = 0;

-- 3. Verificer resultatet - vis opskrifter hvor subCategories stadig indeholder mainCategory
SELECT 
  id,
  title,
  "mainCategory",
  "subCategories",
  "dietaryCategories"
FROM recipes
WHERE "subCategories" IS NOT NULL
  AND "subCategories"::text LIKE '%"' || "mainCategory" || '"%'
LIMIT 10;

-- 4. Vis statistik
SELECT 
  COUNT(*) as total_opskrifter,
  COUNT(CASE WHEN "subCategories" IS NOT NULL AND jsonb_array_length("subCategories") > 0 THEN 1 END) as med_subcategories,
  COUNT(CASE WHEN "subCategories" IS NULL OR jsonb_array_length("subCategories") = 0 THEN 1 END) as uden_subcategories
FROM recipes;

