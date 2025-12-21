-- 🏷️ Tilføj tags til de 14 Ketoliv opskrifter der mangler tags
-- Kør dette efter at have analyseret med analyze-ketoliv-tags.sql

-- FØRST: Se hvilke opskrifter der mangler tags (kør query 3 fra analyze-ketoliv-tags.sql)

-- ========================================
-- TILFØJ DEFAULT KETO TAG TIL OPSKRIFTER UDEN TAGS
-- ========================================
-- Alle Ketoliv opskrifter skal i det mindste have "Keto" tag
UPDATE recipes
SET "dietaryCategories" = '["Keto"]'::jsonb
WHERE (author ILIKE '%ketoliv%' 
   OR title ILIKE '%keto%'
   OR description ILIKE '%keto%')
  AND ("dietaryCategories" IS NULL 
       OR jsonb_array_length("dietaryCategories") = 0);

-- ========================================
-- VERIFICER RESULTATET
-- ========================================
-- Efter opdateringen, tjek at alle nu har tags:
SELECT 
  COUNT(*) as total_ketoliv_opskrifter,
  COUNT(CASE WHEN "dietaryCategories" IS NOT NULL 
             AND jsonb_array_length("dietaryCategories") > 0 
        THEN 1 END) as med_dietary_categories,
  COUNT(CASE WHEN "dietaryCategories" IS NULL 
             OR jsonb_array_length("dietaryCategories") = 0 
        THEN 1 END) as uden_dietary_categories
FROM recipes
WHERE author ILIKE '%ketoliv%' 
   OR title ILIKE '%keto%'
   OR description ILIKE '%keto%';

-- Vis de opskrifter der nu har fået "Keto" tag
SELECT 
  id,
  title,
  "dietaryCategories",
  "mainCategory"
FROM recipes
WHERE (author ILIKE '%ketoliv%' 
   OR title ILIKE '%keto%'
   OR description ILIKE '%keto%')
  AND "dietaryCategories"::text = '["Keto"]'
ORDER BY title
LIMIT 20;


