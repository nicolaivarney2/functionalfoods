-- 🏷️ Tilføj dietary tags til opskrifter baseret på deres eksisterende kategorier
-- Kør dette i Supabase SQL Editor efter at have tjekket med check-recipe-tags.sql

-- FØRST: Tjek hvilke tags der mangler (kør check-recipe-tags.sql først)

-- ========================================
-- OPSKRIFTER DER SKAL HAVE GLP-1 KOST TAG
-- ========================================
-- Opdater opskrifter der matcher GLP-1 kriterier
-- (Tilpas WHERE betingelsen baseret på dine specifikke kriterier)

UPDATE recipes
SET 
  "dietaryCategories" = COALESCE("dietaryCategories", '[]'::jsonb) || '["GLP-1 kost"]'::jsonb
WHERE 
  -- Tilføj kun hvis tag ikke allerede findes
  ("dietaryCategories" IS NULL 
   OR NOT ("dietaryCategories"::text ILIKE '%GLP-1 kost%'))
  -- Tilføj dine specifikke kriterier her, fx:
  -- AND mainCategory = 'Aftensmad'
  -- AND calories < 500
  -- AND carbs < 20
;

-- ========================================
-- OPSKRIFTER DER SKAL HAVE SENSE TAG
-- ========================================
UPDATE recipes
SET 
  "dietaryCategories" = COALESCE("dietaryCategories", '[]'::jsonb) || '["Sense"]'::jsonb
WHERE 
  ("dietaryCategories" IS NULL 
   OR NOT ("dietaryCategories"::text ILIKE '%Sense%'))
  -- Tilføj dine specifikke kriterier her
;

-- ========================================
-- OPSKRIFTER DER SKAL HAVE ANTIINFLAMMATORISK TAG
-- ========================================
UPDATE recipes
SET 
  "dietaryCategories" = COALESCE("dietaryCategories", '[]'::jsonb) || '["Antiinflammatorisk"]'::jsonb
WHERE 
  ("dietaryCategories" IS NULL 
   OR NOT ("dietaryCategories"::text ILIKE '%Antiinflammatorisk%'))
  -- Tilføj dine specifikke kriterier her
;

-- ========================================
-- OPSKRIFTER DER SKAL HAVE FLEKSITARISK TAG
-- ========================================
UPDATE recipes
SET 
  "dietaryCategories" = COALESCE("dietaryCategories", '[]'::jsonb) || '["Fleksitarisk"]'::jsonb
WHERE 
  ("dietaryCategories" IS NULL 
   OR NOT ("dietaryCategories"::text ILIKE '%Fleksitarisk%'))
  -- Tilføj dine specifikke kriterier her
;

-- ========================================
-- OPSKRIFTER DER SKAL HAVE 5:2 TAG
-- ========================================
UPDATE recipes
SET 
  "dietaryCategories" = COALESCE("dietaryCategories", '[]'::jsonb) || '["5:2"]'::jsonb
WHERE 
  ("dietaryCategories" IS NULL 
   OR NOT ("dietaryCategories"::text ILIKE '%5:2%'))
  -- Tilføj dine specifikke kriterier her
;

-- ========================================
-- OPSKRIFTER DER SKAL HAVE MEAL PREP TAG
-- ========================================
UPDATE recipes
SET 
  "dietaryCategories" = COALESCE("dietaryCategories", '[]'::jsonb) || '["Meal prep"]'::jsonb
WHERE 
  ("dietaryCategories" IS NULL 
   OR NOT ("dietaryCategories"::text ILIKE '%Meal prep%'))
  -- Tilføj dine specifikke kriterier her, fx:
  -- AND mainCategory = 'God til to dage'
;

-- ========================================
-- RENS OP: Fjern duplikater fra dietaryCategories
-- ========================================
-- Dette sikrer at hver tag kun optræder én gang
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(DISTINCT value)
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL
  AND jsonb_array_length("dietaryCategories") > 1;

-- ========================================
-- VERIFICER RESULTATET
-- ========================================
-- Kør denne query efter opdateringerne for at se resultatet:
SELECT 
  jsonb_array_elements_text("dietaryCategories") as tag,
  COUNT(*) as antal_opskrifter
FROM recipes
WHERE "dietaryCategories" IS NOT NULL 
  AND jsonb_array_length("dietaryCategories") > 0
GROUP BY tag
ORDER BY antal_opskrifter DESC;

