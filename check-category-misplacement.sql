-- 🔍 Tjek om dietary categories er sat forkert som mainCategory
-- Dette script finder opskrifter hvor dietary categories er sat som mainCategory

-- 1. Find opskrifter hvor mainCategory er en dietary category
SELECT 
  id,
  title,
  "mainCategory" as forkert_mainCategory,
  "dietaryCategories",
  "subCategories"
FROM recipes
WHERE "mainCategory" IN (
  'Keto', 'Sense', 'GLP-1 kost', 'Meal prep', 'Anti-inflammatorisk',
  'Fleksitarisk', '5:2 diæt', 'Familiemad', 'Low carb',
  'Meal Prep', 'GLP-1', 'glp-1', 'glp1', 'SENSE'
)
ORDER BY title;

-- 2. Tjek specifikt "Frisk asparges salat med mozzarellastykker"
SELECT 
  id,
  title,
  "mainCategory",
  "subCategories",
  "dietaryCategories"
FROM recipes
WHERE title ILIKE '%asparges salat%mozzarellastykker%'
   OR title ILIKE '%asparges%mozzarella%';

-- 3. Vis alle opskrifter med Keto tag og deres kategori struktur
SELECT 
  id,
  title,
  "mainCategory",
  "subCategories",
  "dietaryCategories"
FROM recipes
WHERE "dietaryCategories"::text ILIKE '%Keto%'
   OR "mainCategory" = 'Keto'
ORDER BY title
LIMIT 20;

-- 4. Tæl hvor mange opskrifter der har dietary categories som mainCategory
SELECT 
  COUNT(*) as antal_forkerte,
  "mainCategory" as forkert_mainCategory
FROM recipes
WHERE "mainCategory" IN (
  'Keto', 'Sense', 'GLP-1 kost', 'Meal prep', 'Anti-inflammatorisk',
  'Fleksitarisk', '5:2 diæt', 'Familiemad', 'Low carb',
  'Meal Prep', 'GLP-1', 'glp-1', 'glp1', 'SENSE'
)
GROUP BY "mainCategory"
ORDER BY antal_forkerte DESC;

